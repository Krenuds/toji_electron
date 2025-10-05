/**
 * Voice Module - Phase 1: Basic voice channel connection
 * Manages voice sessions and Discord voice connections
 */

import { EventEmitter } from 'events'
import { Readable } from 'stream'
import {
  joinVoiceChannel,
  VoiceConnectionStatus,
  entersState,
  getVoiceConnection,
  createAudioPlayer,
  createAudioResource,
  StreamType,
  type AudioPlayer
} from '@discordjs/voice'
import type { VoiceBasedChannel } from 'discord.js'
import { createFileDebugLogger } from '../../../main/utils/logger'
import type { VoiceSession, VoiceSessionConfig } from './types'
import type { DiscordModule } from '../DiscordPlugin'

const log = createFileDebugLogger('discord:voice')

/**
 * VoiceModule - Handles voice channel connections
 * Phase 1: Join/leave voice channels, track active sessions
 * Phase 2: TTS audio playback
 */
export class VoiceModule extends EventEmitter implements DiscordModule {
  private sessions: Map<string, VoiceSession> = new Map()
  private userSessions: Map<string, string> = new Map() // userId -> sessionId
  private audioPlayers: Map<string, AudioPlayer> = new Map() // sessionId -> AudioPlayer

  constructor() {
    super()
    log('VoiceModule constructed')
  }

  /**
   * Initialize the voice module
   */
  async initialize(): Promise<void> {
    log('Initializing VoiceModule')

    // Log dependency report for debugging
    try {
      const { generateDependencyReport } = await import('@discordjs/voice')
      log('Voice Dependencies Report:')
      log(generateDependencyReport())
    } catch (error) {
      log('Failed to generate dependency report:', error)
    }
  }

  /**
   * Cleanup the voice module
   */
  cleanup(): void {
    log('Cleaning up VoiceModule')

    // Disconnect all active sessions
    for (const [sessionId, session] of this.sessions) {
      try {
        session.connection.destroy()
        log(`Destroyed session ${sessionId}`)
      } catch (error) {
        log(`Error destroying session ${sessionId}:`, error)
      }
    }

    this.sessions.clear()
    this.userSessions.clear()
  }

  /**
   * Join a voice channel and create a session
   */
  async joinVoiceChannel(
    channel: VoiceBasedChannel,
    userId: string,
    projectPath?: string,
    projectChannelId?: string
  ): Promise<VoiceSession> {
    log(`=== JOIN VOICE CHANNEL START ===`)
    log(`User: ${userId}`)
    log(`Channel ID: ${channel.id}`)
    log(`Channel Name: ${channel.name}`)
    log(`Guild ID: ${channel.guild.id}`)
    log(`Guild Name: ${channel.guild.name}`)
    log(`Project Path: ${projectPath || 'none'}`)
    log(`Project Channel: ${projectChannelId || 'none'}`)

    // Check if user already has a session - automatically leave it
    const existingSessionId = this.userSessions.get(userId)
    if (existingSessionId) {
      const existingSession = this.sessions.get(existingSessionId)
      if (existingSession) {
        log(
          `User ${userId} already has an active session: ${existingSessionId}, automatically leaving...`
        )

        try {
          // Clean up the existing session
          existingSession.connection.destroy()
          existingSession.status = 'disconnected'
          this.sessions.delete(existingSessionId)
          this.userSessions.delete(userId)
          this.emit('sessionEnded', existingSessionId)
          log(`Successfully left previous session ${existingSessionId}`)
        } catch (error) {
          log(`Error leaving previous session:`, error)
          // Continue anyway - we'll create a new session
        }
      }
    }

    // Create session ID
    const sessionId = `voice-${userId}-${Date.now()}`
    log(`Created session ID: ${sessionId}`)

    // Create session config
    const config: VoiceSessionConfig = {
      userId,
      guildId: channel.guild.id,
      channelId: channel.id,
      projectPath,
      projectChannelId
    }

    log(`Calling joinVoiceChannel from @discordjs/voice...`)
    log(`Voice adapter available: ${typeof channel.guild.voiceAdapterCreator === 'function'}`)

    // Join the voice channel with audio output enabled
    const connection = joinVoiceChannel({
      channelId: channel.id,
      guildId: channel.guild.id,
      adapterCreator: channel.guild.voiceAdapterCreator,
      selfDeaf: false, // CRITICAL: Must be false to transmit audio
      selfMute: false, // Not muted so we can speak
      debug: true // Enable debug logging
    })

    log(`Connection object created, initial state: ${connection.state.status}`)

    // Create session
    const session: VoiceSession = {
      id: sessionId,
      config,
      connection,
      startTime: new Date(),
      status: 'connecting',
      projectPath,
      projectChannelId
    }

    // Store session
    this.sessions.set(sessionId, session)
    this.userSessions.set(userId, sessionId)

    // Setup connection event handlers BEFORE waiting
    this.setupConnectionHandlers(session)
    log(`Connection handlers setup complete`)

    try {
      log(`Waiting for connection to reach Ready state (5s timeout)...`)
      const startTime = Date.now()

      await entersState(connection, VoiceConnectionStatus.Ready, 5000)

      const duration = Date.now() - startTime
      session.status = 'connected'
      log(`✅ Successfully connected to voice channel ${channel.id} in ${duration}ms`)
      log(`=== JOIN VOICE CHANNEL SUCCESS ===`)

      this.emit('sessionStarted', session)
      return session
    } catch (error) {
      log(`❌ Failed to connect to voice channel after timeout`)
      log(`Error type: ${error instanceof Error ? error.constructor.name : typeof error}`)
      log(`Error message: ${error instanceof Error ? error.message : String(error)}`)
      log(`Current connection state: ${connection.state.status}`)
      log(`Connection state details:`, connection.state)
      log(`=== JOIN VOICE CHANNEL FAILED ===`)

      session.status = 'error'

      // Cleanup failed session
      this.sessions.delete(sessionId)
      this.userSessions.delete(userId)

      try {
        connection.destroy()
        log(`Connection destroyed during cleanup`)
      } catch (destroyError) {
        log(`Error destroying connection:`, destroyError)
      }

      throw new Error(
        `Failed to connect to voice channel. Connection state: ${connection.state.status}`
      )
    }
  }

  /**
   * Leave a voice channel and end session
   */
  async leaveVoiceChannel(userId: string): Promise<void> {
    const sessionId = this.userSessions.get(userId)
    if (!sessionId) {
      throw new Error('You are not in a voice session.')
    }

    const session = this.sessions.get(sessionId)
    if (!session) {
      // Cleanup orphaned reference
      this.userSessions.delete(userId)
      throw new Error('Voice session not found.')
    }

    log(`Leaving voice channel for session ${sessionId}`)

    try {
      session.connection.destroy()
      session.status = 'disconnected'

      this.sessions.delete(sessionId)
      this.userSessions.delete(userId)

      this.emit('sessionEnded', sessionId)
      log(`Successfully left voice channel`)
    } catch (error) {
      log(`Error leaving voice channel:`, error)
      throw new Error('Failed to leave voice channel.')
    }
  }

  /**
   * Get active session for a user
   */
  getUserSession(userId: string): VoiceSession | undefined {
    const sessionId = this.userSessions.get(userId)
    return sessionId ? this.sessions.get(sessionId) : undefined
  }

  /**
   * Get all active sessions
   */
  getAllSessions(): VoiceSession[] {
    return Array.from(this.sessions.values())
  }

  /**
   * Setup event handlers for voice connection
   */
  private setupConnectionHandlers(session: VoiceSession): void {
    const { connection } = session

    // Log networking state if available
    const connectionAny = connection as unknown as { state?: { networking?: unknown } }
    if (connectionAny.state && 'networking' in connectionAny.state) {
      log(`Networking state:`, connectionAny.state.networking)
    }

    connection.on('stateChange', (oldState, newState) => {
      log(`🔄 State Change [${session.id}]: ${oldState.status} -> ${newState.status}`)

      // Log additional state info if it's a simple string/number property
      const oldStateInfo = `status: ${oldState.status}`
      const newStateInfo = `status: ${newState.status}`
      log(`  Old: ${oldStateInfo}`)
      log(`  New: ${newStateInfo}`)

      // Log additional details for disconnected state
      if (newState.status === VoiceConnectionStatus.Disconnected) {
        const disconnectedState = newState as unknown as {
          reason?: number
          closeCode?: number
        }
        log(`Disconnect reason:`, disconnectedState.reason)
        log(`Close code:`, disconnectedState.closeCode)
        log(`Old state details:`, oldState)
        log(`New state details:`, newState)
      }

      // Update session status based on connection state
      switch (newState.status) {
        case VoiceConnectionStatus.Ready:
          log(`✅ Connection is READY`)
          session.status = 'connected'
          break
        case VoiceConnectionStatus.Disconnected:
          log(`⚠️ Connection DISCONNECTED`)
          session.status = 'disconnected'
          // Cleanup session
          this.sessions.delete(session.id)
          this.userSessions.delete(session.config.userId)
          this.emit('sessionEnded', session.id)
          break
        case VoiceConnectionStatus.Destroyed:
          log(`💀 Connection DESTROYED`)
          session.status = 'disconnected'
          // Cleanup session
          this.sessions.delete(session.id)
          this.userSessions.delete(session.config.userId)
          this.emit('sessionEnded', session.id)
          break
        case VoiceConnectionStatus.Connecting:
          log(`🔌 Connection is CONNECTING`)
          session.status = 'connecting'
          break
        case VoiceConnectionStatus.Signalling:
          log(`📡 Connection is SIGNALLING`)
          session.status = 'connecting'
          break
      }
    })

    connection.on('error', (error) => {
      log(`❌ Connection Error [${session.id}]:`)
      log(`Error name: ${error.name}`)
      log(`Error message: ${error.message}`)
      log(`Error stack:`, error.stack)
      log(`Full error object:`, error)
      session.status = 'error'
      this.emit('connectionError', error, session.id)
    })

    // Add debug event listener if available
    const connectionWithDebug = connection as unknown as {
      on?: (event: string, listener: (message: string) => void) => void
    }
    if (connectionWithDebug.on) {
      connectionWithDebug.on('debug', (message: string) => {
        log(`🐛 Debug [${session.id}]: ${message}`)
      })
    }
  }

  /**
   * Check if a user has an active session
   */
  hasActiveSession(userId: string): boolean {
    return this.userSessions.has(userId)
  }

  /**
   * Get connection status for debugging
   */
  getConnectionStatus(userId: string): string | null {
    const session = this.getUserSession(userId)
    if (!session) return null

    const connection = getVoiceConnection(session.config.guildId)
    if (!connection) return 'no-connection'

    return connection.state.status
  }

  /**
   * Phase 2: TTS Playback Methods
   */

  /**
   * Upsample PCM audio from 24kHz mono to 48kHz stereo
   * @param inputBuffer 24kHz mono s16le PCM data from OpenAI
   * @returns 48kHz stereo s16le PCM data for Discord
   */
  private upsamplePCM(inputBuffer: Buffer): Buffer {
    const inputSamples = inputBuffer.length / 2 // 16-bit = 2 bytes per sample
    const outputSamples = inputSamples * 2 * 2 // 2x sample rate, 2 channels
    const outputBuffer = Buffer.alloc(outputSamples * 2) // 2 bytes per sample

    for (let i = 0; i < inputSamples; i++) {
      // Read 16-bit sample from input (mono, 24kHz)
      const sample = inputBuffer.readInt16LE(i * 2)

      // Write to output twice (upsample 24kHz -> 48kHz)
      // and duplicate to both channels (mono -> stereo)
      const outIdx = i * 4 * 2 // 4 samples (2x rate, 2 channels), 2 bytes each

      // First frame (same sample, both channels)
      outputBuffer.writeInt16LE(sample, outIdx + 0) // Left channel
      outputBuffer.writeInt16LE(sample, outIdx + 2) // Right channel

      // Second frame (duplicate for 2x sample rate)
      outputBuffer.writeInt16LE(sample, outIdx + 4) // Left channel
      outputBuffer.writeInt16LE(sample, outIdx + 6) // Right channel
    }

    log(`upsamplePCM - Input: ${inputBuffer.length} bytes (${inputSamples} samples @ 24kHz mono)`)
    log(
      `upsamplePCM - Output: ${outputBuffer.length} bytes (${outputSamples / 2} samples @ 48kHz stereo)`
    )

    return outputBuffer
  }

  /**
   * Play TTS audio in a voice session
   * @param sessionId The voice session ID
   * @param audioBuffer Audio data from TTS service (PCM format from OpenAI)
   */
  async playTTS(sessionId: string, audioBuffer: Buffer): Promise<void> {
    log(`playTTS - Starting playback for session ${sessionId}`)
    log(`playTTS - Audio buffer size: ${audioBuffer.length} bytes`)

    const session = this.sessions.get(sessionId)
    if (!session) {
      throw new Error(`Voice session not found: ${sessionId}`)
    }

    const connection = getVoiceConnection(session.config.guildId)
    if (!connection) {
      throw new Error(`No voice connection for session: ${sessionId}`)
    }

    log(`playTTS - Connection status: ${connection.state.status}`)

    try {
      // Get or create audio player for this session
      let player = this.audioPlayers.get(sessionId)
      if (!player) {
        log(`playTTS - Creating new audio player...`)
        player = createAudioPlayer()
        this.audioPlayers.set(sessionId, player)

        // Subscribe the connection to the player
        const subscription = connection.subscribe(player)
        log(`playTTS - Subscription result:`, subscription ? 'SUCCESS' : 'FAILED')

        // Handle player state changes
        player.on('stateChange', (oldState, newState) => {
          log(`playTTS - Audio player state: ${oldState.status} -> ${newState.status}`)
        })

        // Handle player events
        player.on('error', (error) => {
          log(`playTTS - Audio player error for ${sessionId}:`, error)
        })

        log(`playTTS - Created new audio player for session ${sessionId}`)
      }

      log(`playTTS - Current player state: ${player.state.status}`)

      // OpenAI PCM format: 24kHz, mono, signed 16-bit little-endian
      // Discord.js expects: 48kHz, stereo, signed 16-bit little-endian
      // Solution: Upsample from 24kHz mono to 48kHz stereo by duplicating samples
      log(`playTTS - Creating audio resource...`)
      log(`playTTS - Upsampling PCM from 24kHz mono to 48kHz stereo`)

      const upsampledBuffer = this.upsamplePCM(audioBuffer)
      const upsampledStream = Readable.from(upsampledBuffer)

      const resource = createAudioResource(upsampledStream, {
        inputType: StreamType.Raw, // Raw PCM s16le 48kHz stereo
        inlineVolume: true
      })

      // Set volume (optional, but good to verify control works)
      if (resource.volume) {
        resource.volume.setVolume(1.0)
        log(`playTTS - Volume set to 1.0`)
      }

      log(`playTTS - Resource created, playing...`)
      // Play the audio
      player.play(resource)
      log(`playTTS - player.play() called successfully`)
    } catch (error) {
      log(`playTTS - Failed to play TTS audio for ${sessionId}:`, error)
      throw error
    }
  }

  /**
   * Stop TTS playback for a session
   * @param sessionId The voice session ID
   */
  stopTTS(sessionId: string): void {
    const player = this.audioPlayers.get(sessionId)
    if (player) {
      player.stop()
      log(`[stopTTS] Stopped TTS playback for session ${sessionId}`)
    }
  }

  /**
   * Get a voice session by project text channel ID
   * Used to find which voice session to play TTS in based on where the message was sent
   * @param textChannelId Discord text channel ID
   * @returns The voice session for that project, or undefined
   */
  getUserSessionByChannel(textChannelId: string): VoiceSession | undefined {
    log('getUserSessionByChannel - Looking for session with projectChannelId:', textChannelId)
    log('getUserSessionByChannel - Active sessions count:', this.sessions.size)

    for (const session of this.sessions.values()) {
      log('getUserSessionByChannel - Checking session:', {
        id: session.id,
        projectChannelId: session.projectChannelId,
        voiceChannelId: session.config.channelId,
        status: session.status
      })

      if (session.projectChannelId === textChannelId) {
        log('getUserSessionByChannel - Match found!')
        return session
      }
    }

    log('getUserSessionByChannel - No matching session found')
    return undefined
  }
}
