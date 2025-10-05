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
  entersState,
  StreamType
} from '@discordjs/voice'
import { Readable } from 'stream'
import { spawn } from 'child_process'
import ffmpegPath from '@ffmpeg-installer/ffmpeg'

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
      log('❌ Player error event fired!')
      log('Error type:', typeof error)
      log('Error value:', error)
      if (error instanceof Error) {
        log('Error name:', error.name)
        log('Error message:', error.message)
        log('Error stack:', error.stack)
      }
      if (error && typeof error === 'object') {
        log('Error properties:', Object.keys(error).join(', '))
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        log('Error resource:', (error as any).resource)
      }
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

      // Use FFmpeg to convert WAV to PCM
      log(`🎼 Creating FFmpeg transcoder for WAV -> PCM`)
      log(`🔧 Using FFmpeg from: ${ffmpegPath.path}`)

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

      // Add error handlers
      ffmpeg.stderr.on('data', (data) => {
        log('❌ FFmpeg stderr:', data.toString())
      })

      ffmpeg.on('error', (err) => {
        log('❌ FFmpeg process error:', err)
      })

      ffmpeg.on('exit', (code, signal) => {
        if (code !== 0 && code !== null) {
          log(`❌ FFmpeg exited with code ${code}, signal ${signal}`)
        }
      })

      log(`🔀 Piping audio through FFmpeg`)
      stream.pipe(ffmpeg.stdin)

      // Create audio resource with the FFmpeg stdout (PCM stream)
      log(`🎵 Creating audio resource with PCM stream`)
      const resource = createAudioResource(ffmpeg.stdout, {
        inputType: StreamType.Raw
      })

      // Play the resource
      log(`▶️  Calling player.play()`)
      this.player.play(resource)
      log('✅ TTS audio now playing')
    } catch (error) {
      log('❌ Error playing TTS audio:')
      log('Error type:', typeof error)
      log('Error value:', error)
      log('Error JSON:', JSON.stringify(error, null, 2))
      if (error instanceof Error) {
        log('Error name:', error.name)
        log('Error message:', error.message)
        log('Error stack:', error.stack)
      }
      log('Full error object:', Object.keys(error || {}).join(', '))
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
