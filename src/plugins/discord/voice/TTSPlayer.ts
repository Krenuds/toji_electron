/**
 * TTS Audio Player - Plays synthesized speech in Discord voice channels
 * Based on Python's tts_handler.py from toji-services
 */

import { createLogger } from '../../../main/utils/logger'
import {
  type VoiceConnection,
  createAudioPlayer,
  createAudioResource,
  AudioPlayerStatus,
  type AudioPlayer,
  VoiceConnectionStatus,
  entersState,
  StreamType
} from '@discordjs/voice'
import { Readable } from 'stream'
import { spawn } from 'child_process'
import ffmpegPath from '@ffmpeg-installer/ffmpeg'

const logger = createLogger('discord:tts-player')

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
      logger.debug('Player idle')
      this.isPlaying = false
      this.playNext()
    })

    this.player.on(AudioPlayerStatus.Playing, () => {
      logger.debug('Player playing')
      this.isPlaying = true
    })

    this.player.on('error', (error) => {
      logger.debug('Player error:', error)
      this.isPlaying = false
      this.playNext()
    })

    logger.debug('TTS Player created')
  }

  /**
   * Play TTS audio in the voice channel
   * @param audioBuffer - WAV audio buffer from Piper
   */
  async play(audioBuffer: Buffer): Promise<void> {
    logger.debug(`Playing TTS audio: ${audioBuffer.length} bytes`)

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
      return
    }

    const audioBuffer = this.queue.shift()!

    try {
      // Ensure connection is ready
      if (this.connection.state.status !== VoiceConnectionStatus.Ready) {
        await entersState(this.connection, VoiceConnectionStatus.Ready, 5000)
      }

      // Create a readable stream from the buffer
      const stream = Readable.from(audioBuffer)

      // Spawn FFmpeg process to transcode WAV to PCM
      const ffmpeg = spawn(ffmpegPath.path, [
        '-analyzeduration',
        '0',
        '-loglevel',
        'error',
        '-f',
        'wav',
        '-i',
        'pipe:0', // Read from stdin
        '-f',
        's16le',
        '-ar',
        '48000',
        '-ac',
        '2',
        'pipe:1' // Write to stdout
      ])

      // Error handlers
      ffmpeg.stderr.on('data', (data) => {
        logger.debug('FFmpeg error:', data.toString())
      })

      ffmpeg.on('error', (err) => {
        logger.debug('FFmpeg process error:', err)
      })

      ffmpeg.on('exit', (code, signal) => {
        if (code !== 0 && code !== null) {
          logger.debug(`FFmpeg exited with code ${code}, signal ${signal}`)
        }
      })

      // Pipe WAV through FFmpeg
      stream.pipe(ffmpeg.stdin)

      // Create audio resource with the PCM stream
      const resource = createAudioResource(ffmpeg.stdout, {
        inputType: StreamType.Raw
      })

      // Play the resource
      this.player.play(resource)
      logger.debug('TTS audio playing')
    } catch (error) {
      logger.debug('Error playing TTS audio:', error)
      this.isPlaying = false
      this.playNext()
    }
  }

  /**
   * Stop playback and clear queue
   */
  stop(): void {
    logger.debug('Stopping TTS player')
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
    logger.debug('Destroying TTS player')
    this.stop()
    // Player will be cleaned up when connection is destroyed
  }
}
