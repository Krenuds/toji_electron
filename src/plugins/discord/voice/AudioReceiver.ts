/**
 * Audio Receiver - Captures and processes audio from Discord voice channels
 * Based on Python's discord_sink.py from toji-services
 */

import { createLogger } from '../../../main/utils/logger'
import { type VoiceConnection, EndBehaviorType, type AudioReceiveStream } from '@discordjs/voice'
import { processDiscordAudio } from '../../../main/utils/audio-processor'
import { opus } from 'prism-media'

const logger = createLogger('discord:audio-receiver')

interface UserAudioBuffer {
  userId: string
  pcmData: Buffer[]
  startTime: number
  lastPacketTime: number
  speechEndTimer?: NodeJS.Timeout
  forceTimer?: NodeJS.Timeout
}

export interface AudioReceiverConfig {
  speechEndDelay: number // Time to wait after speech ends (ms)
  forceProcessThreshold: number // Max buffer time before forcing process (ms)
  minSpeechDuration: number // Minimum speech duration (seconds)
}

export const DEFAULT_AUDIO_CONFIG: AudioReceiverConfig = {
  speechEndDelay: 1500, // 1.5 seconds
  forceProcessThreshold: 6000, // 6 seconds
  minSpeechDuration: 1.0 // 1 second
}

/**
 * AudioReceiver - Captures audio from Discord voice connection
 * Implements timer-based speech end detection
 */
export class AudioReceiver {
  private connection: VoiceConnection
  private config: AudioReceiverConfig
  private userBuffers: Map<string, UserAudioBuffer> = new Map()
  private botUserId?: string
  private onAudioReady?: (
    userId: string,
    audioWav: Buffer,
    duration: number
  ) => void | Promise<void>
  private isReceiving = false

  constructor(connection: VoiceConnection, config: AudioReceiverConfig = DEFAULT_AUDIO_CONFIG) {
    this.connection = connection
    this.config = config
    logger.debug('AudioReceiver created')
  }

  /**
   * Set bot user ID to filter out bot's own audio
   */
  setBotUserId(userId: string): void {
    this.botUserId = userId
    logger.debug('Bot user ID set:', userId)
  }

  /**
   * Set callback for when audio is ready for processing
   */
  setOnAudioReady(
    callback: (userId: string, audioWav: Buffer, duration: number) => void | Promise<void>
  ): void {
    this.onAudioReady = callback
  }

  /**
   * Start receiving audio
   */
  start(): void {
    if (this.isReceiving) {
      logger.debug('Already receiving audio')
      return
    }

    logger.debug('Starting audio receiver...')
    this.isReceiving = true

    // Get the receiver from the connection
    const receiver = this.connection.receiver

    // Subscribe to speaking events - fires once per user when they start speaking
    receiver.speaking.on('start', (userId) => {
      // Ignore bot's own audio
      if (this.botUserId && userId === this.botUserId) {
        return
      }

      // Skip if we already have a buffer (subscription exists)
      if (this.userBuffers.has(userId)) {
        return
      }

      logger.debug(`New user ${userId} started speaking, creating subscription`)

      // Create persistent subscription for this user
      const audioStream = receiver.subscribe(userId, {
        end: {
          behavior: EndBehaviorType.Manual // We control when to end
        }
      })

      this.handleAudioStream(userId, audioStream)
    })

    logger.debug('Audio receiver started')
  }

  /**
   * Handle audio stream from a user
   */
  private handleAudioStream(userId: string, stream: AudioReceiveStream): void {
    logger.debug(`Subscribed to audio stream for user ${userId}`)

    // Initialize buffer for this user if needed
    if (!this.userBuffers.has(userId)) {
      this.userBuffers.set(userId, {
        userId,
        pcmData: [],
        startTime: Date.now(),
        lastPacketTime: Date.now()
      })
    }

    const buffer = this.userBuffers.get(userId)!

    // Create Opus decoder: Discord sends Opus packets, we need PCM
    // Opus packets are ~150-200 bytes compressed
    // Decoded PCM is 3840 bytes per 20ms frame (48kHz stereo 16-bit)
    const opusDecoder = new opus.Decoder({
      rate: 48000,
      channels: 2,
      frameSize: 960 // 20ms at 48kHz = 960 samples
    })

    // Pipe AudioReceiveStream (Opus packets) → OpusDecoder (PCM)
    stream.pipe(opusDecoder)

    opusDecoder.on('data', (chunk: Buffer) => {
      // Ignore if bot's own audio
      if (this.botUserId && userId === this.botUserId) {
        return
      }

      // Buffer the decoded PCM data
      buffer.pcmData.push(chunk)
      buffer.lastPacketTime = Date.now()

      // Cancel existing timers
      this.cancelUserTimers(userId)

      // Schedule new timers
      this.scheduleUserTimers(userId)
    })

    opusDecoder.on('error', (error) => {
      logger.debug(`Opus decoder error for user ${userId}:`, error)
      this.cancelUserTimers(userId)
    })

    stream.on('end', () => {
      logger.debug(`Audio stream ended for user ${userId}`)
      opusDecoder.end()
      this.cancelUserTimers(userId)
      this.userBuffers.delete(userId)
    })

    stream.on('error', (error) => {
      logger.debug(`Audio stream error for user ${userId}:`, error)
      opusDecoder.destroy()
      this.cancelUserTimers(userId)
      this.userBuffers.delete(userId)
    })
  }

  /**
   * Schedule timers for speech end detection
   */
  private scheduleUserTimers(userId: string): void {
    const buffer = this.userBuffers.get(userId)
    if (!buffer) return

    // Speech end timer - fires after silence
    buffer.speechEndTimer = setTimeout(() => {
      logger.debug(`Speech end detected for user ${userId}`)
      this.processUserAudio(userId)
    }, this.config.speechEndDelay)

    // Force timer - fires if user talks too long
    buffer.forceTimer = setTimeout(() => {
      logger.debug(`Force processing audio for user ${userId} (max duration reached)`)
      this.processUserAudio(userId)
    }, this.config.forceProcessThreshold)
  }

  /**
   * Cancel all timers for a user
   */
  private cancelUserTimers(userId: string): void {
    const buffer = this.userBuffers.get(userId)
    if (!buffer) return

    if (buffer.speechEndTimer) {
      clearTimeout(buffer.speechEndTimer)
      buffer.speechEndTimer = undefined
    }

    if (buffer.forceTimer) {
      clearTimeout(buffer.forceTimer)
      buffer.forceTimer = undefined
    }
  }

  /**
   * Process buffered audio for a user
   */
  private async processUserAudio(userId: string): Promise<void> {
    const buffer = this.userBuffers.get(userId)
    if (!buffer || buffer.pcmData.length === 0) {
      return
    }

    logger.debug(`Processing audio for user ${userId}: ${buffer.pcmData.length} chunks`)

    // Cancel timers
    this.cancelUserTimers(userId)

    // Concatenate all PCM chunks
    const allPcmData = Buffer.concat(buffer.pcmData)

    // Clear buffer for next speech (subscription stays alive)
    buffer.pcmData = []
    buffer.startTime = Date.now()

    // Process audio (stereo→mono, trim, resample, WAV wrap)
    const result = processDiscordAudio(allPcmData, this.config.minSpeechDuration)

    if (!result) {
      logger.debug(`Audio from user ${userId} too short or silent, skipping`)
      return
    }

    const { wavData, duration } = result

    // Call callback if set
    if (this.onAudioReady) {
      try {
        await this.onAudioReady(userId, wavData, duration)
      } catch (error) {
        logger.debug('Error in onAudioReady callback:', error)
      }
    }
  }

  /**
   * Stop receiving audio
   */
  stop(): void {
    if (!this.isReceiving) {
      return
    }

    logger.debug('Stopping audio receiver...')
    this.isReceiving = false

    // Cancel all timers
    for (const userId of this.userBuffers.keys()) {
      this.cancelUserTimers(userId)
    }

    // Clear buffers
    this.userBuffers.clear()

    logger.debug('Audio receiver stopped')
  }

  /**
   * Get receiving status
   */
  isActive(): boolean {
    return this.isReceiving
  }

  /**
   * Get statistics
   */
  getStats(): {
    isReceiving: boolean
    activeUsers: number
    userIds: string[]
  } {
    return {
      isReceiving: this.isReceiving,
      activeUsers: this.userBuffers.size,
      userIds: Array.from(this.userBuffers.keys())
    }
  }
}
