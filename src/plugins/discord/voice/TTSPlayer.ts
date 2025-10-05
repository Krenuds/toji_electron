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
    log(`📥 play() called with buffer: ${audioBuffer.length} bytes`)
    log(`Current queue length: ${this.queue.length}, isPlaying: ${this.isPlaying}`)

    // Add to queue
    this.queue.push(audioBuffer)
    log(`✅ Added to queue, new length: ${this.queue.length}`)

    // Start playing if not already
    if (!this.isPlaying) {
      log(`▶️  Not currently playing, calling playNext()`)
      this.playNext()
    } else {
      log(`⏸️  Already playing, will play when current finishes`)
    }
  }

  /**
   * Play the next item in the queue
   */
  private async playNext(): Promise<void> {
    log(`🔄 playNext() called, queue length: ${this.queue.length}`)
    
    if (this.queue.length === 0) {
      log('⚠️ Queue empty, nothing to play')
      return
    }

    const audioBuffer = this.queue.shift()!
    log(`🎵 Dequeued audio: ${audioBuffer.length} bytes, remaining: ${this.queue.length}`)

    try {
      // Ensure connection is ready
      log(`🔗 Checking connection status: ${this.connection.state.status}`)
      if (this.connection.state.status !== VoiceConnectionStatus.Ready) {
        log('⏳ Connection not ready, waiting...')
        await entersState(this.connection, VoiceConnectionStatus.Ready, 5000)
        log(`✅ Connection ready: ${this.connection.state.status}`)
      }

      // Create a readable stream from the buffer
      log(`📊 Creating readable stream from buffer`)
      const stream = Readable.from(audioBuffer)

      // Create audio resource
      log(`🎼 Creating audio resource`)
      const resource = createAudioResource(stream)

      // Play the resource
      log(`▶️  Calling player.play()`)
      this.player.play(resource)
      log('✅ TTS audio now playing')
    } catch (error) {
      log('❌ Error playing TTS audio:', error)
      this.isPlaying = false
      log(`🔄 Attempting to play next item in queue`)
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
