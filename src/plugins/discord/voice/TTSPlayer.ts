/**
 * TTS Audio Player - Plays synthesized speech in Discord voice channels
 * Based on Python's tts_handler.py from toji-services
 */

import { createFileDebugLogger } from '../../../main/utils/logger'
import {
  type VoiceConnection,
  createAudioPlayer,
  createAudioResource,
  AudioPlayerStatus,
  type AudioPlayer,
  VoiceConnectionStatus,
  entersState
} from '@discordjs/voice'
import { Readable } from 'stream'

const log = createFileDebugLogger('discord:tts-player')

export class TTSPlayer {
  private connection: VoiceConnection
  private player: AudioPlayer
  private isPlaying = false
  private queue: Buffer[] = []

  constructor(connection: VoiceConnection) {
    this.connection = connection
    this.player = createAudioPlayer()

    // Subscribe player to connection
    this.connection.subscribe(this.player)

    // Handle player events
    this.player.on(AudioPlayerStatus.Idle, () => {
      log('Player idle')
      this.isPlaying = false
      this.playNext()
    })

    this.player.on(AudioPlayerStatus.Playing, () => {
      log('Player playing')
      this.isPlaying = true
    })

    this.player.on('error', (error) => {
      log('Player error:', error)
      this.isPlaying = false
      this.playNext()
    })

    log('TTS Player created')
  }

  /**
   * Play TTS audio in the voice channel
   * @param audioBuffer - WAV audio buffer from Piper
   */
  async play(audioBuffer: Buffer): Promise<void> {
    log(`Queuing TTS audio: ${audioBuffer.length} bytes`)

    // Add to queue
    this.queue.push(audioBuffer)

    // Start playing if not already
    if (!this.isPlaying) {
      this.playNext()
    }
  }

  /**
   * Play the next item in the queue
   */
  private async playNext(): Promise<void> {
    if (this.queue.length === 0) {
      log('Queue empty')
      return
    }

    const audioBuffer = this.queue.shift()!
    log(`Playing next audio from queue: ${audioBuffer.length} bytes`)

    try {
      // Ensure connection is ready
      if (this.connection.state.status !== VoiceConnectionStatus.Ready) {
        log('Connection not ready, waiting...')
        await entersState(this.connection, VoiceConnectionStatus.Ready, 5000)
      }

      // Create a readable stream from the buffer
      const stream = Readable.from(audioBuffer)

      // Create audio resource
      // Discord expects PCM or Opus, but WAV files work fine as they contain PCM
      const resource = createAudioResource(stream)

      // Play the resource
      this.player.play(resource)
      log('TTS audio playing')
    } catch (error) {
      log('Error playing TTS audio:', error)
      this.isPlaying = false
      this.playNext()
    }
  }

  /**
   * Stop playback and clear queue
   */
  stop(): void {
    log('Stopping TTS player')
    this.player.stop()
    this.queue = []
    this.isPlaying = false
  }

  /**
   * Check if currently playing
   */
  getIsPlaying(): boolean {
    return this.isPlaying
  }

  /**
   * Get queue length
   */
  getQueueLength(): number {
    return this.queue.length
  }

  /**
   * Cleanup
   */
  destroy(): void {
    log('Destroying TTS player')
    this.stop()
    // Player will be cleaned up when connection is destroyed
  }
}
