/**
 * Voice Module - Phase 1: Basic voice channel connection
 * Manages voice sessions and Discord voice connections
 */

import { EventEmitter } from 'events'
import {
  joinVoiceChannel,
  VoiceConnectionStatus,
  entersState,
  getVoiceConnection
} from '@discordjs/voice'
import type { VoiceBasedChannel } from 'discord.js'
import { createFileDebugLogger } from '../../../main/utils/logger'
import type { VoiceSession, VoiceSessionConfig } from './types'
import type { DiscordModule } from '../DiscordPlugin'
import { AudioReceiver, DEFAULT_AUDIO_CONFIG } from './AudioReceiver'
import { TTSPlayer } from './TTSPlayer'
import { getVoiceServiceManager } from '../../../main/services/voice-service-manager'

const log = createFileDebugLogger('discord:voice')

/**
 * VoiceModule - Handles voice channel connections
 * Phase 1: Join/leave voice channels, track active sessions
 */
export class VoiceModule extends EventEmitter implements DiscordModule {
  private sessions: Map<string, VoiceSession> = new Map()
  private userSessions: Map<string, string> = new Map() // userId -> sessionId
  private audioReceivers: Map<string, AudioReceiver> = new Map() // sessionId -> AudioReceiver
  private ttsPlayers: Map<string, TTSPlayer> = new Map() // sessionId -> TTSPlayer
  private botUserId?: string

  constructor() {
    super()
    log('VoiceModule constructed')
  }

  /**
   * Set bot user ID for audio filtering
   */
  setBotUserId(userId: string): void {
    this.botUserId = userId
    log('Bot user ID set:', userId)
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

    // Initialize voice services (Docker + HTTP clients)
    try {
      log('Initializing voice services...')
      const voiceManager = getVoiceServiceManager()
      await voiceManager.initialize()
      log('Voice services initialized successfully')
    } catch (error) {
      log('Failed to initialize voice services (non-fatal):', error)
      log('Voice transcription and TTS will not be available')
    }
  }

  /**
   * Cleanup the voice module
   */
  cleanup(): void {
    log('Cleaning up VoiceModule')

    // Stop all audio receivers
    for (const sessionId of this.audioReceivers.keys()) {
      this.stopAudioCapture(sessionId)
    }

    // Stop all TTS players
    for (const sessionId of this.ttsPlayers.keys()) {
      this.stopTTSPlayer(sessionId)
    }

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
    this.audioReceivers.clear()
    this.ttsPlayers.clear()
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

    // Join the voice channel with debug enabled
    const connection = joinVoiceChannel({
      channelId: channel.id,
      guildId: channel.guild.id,
      adapterCreator: channel.guild.voiceAdapterCreator,
      selfDeaf: false, // IMPORTANT: Must be undeafened to receive audio
      selfMute: false, // Must be unmuted to speak
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
      // Stop audio capture and TTS for this session
      this.stopAudioCapture(sessionId)
      this.stopTTSPlayer(sessionId)

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
   * Start audio capture for a session
   */
  startAudioCapture(sessionId: string): boolean {
    const session = this.sessions.get(sessionId)
    if (!session) {
      log(`Cannot start audio capture: session ${sessionId} not found`)
      return false
    }

    // Check if already capturing
    if (this.audioReceivers.has(sessionId)) {
      log(`Audio capture already active for session ${sessionId}`)
      return true
    }

    try {
      log(`Starting audio capture for session ${sessionId}`)
      const receiver = new AudioReceiver(session.connection, DEFAULT_AUDIO_CONFIG)

      // Set bot user ID if available
      if (this.botUserId) {
        receiver.setBotUserId(this.botUserId)
      }

      // Set callback for when audio is ready
      receiver.setOnAudioReady(async (userId, audioWav, duration) => {
        log(`Audio ready from user ${userId}: ${audioWav.length} bytes, ${duration.toFixed(2)}s`)

        // Transcribe with Whisper
        try {
          const voiceManager = getVoiceServiceManager()
          if (!voiceManager.isAvailable()) {
            log('Voice services not available, skipping transcription')
            return
          }

          const result = await voiceManager.transcribe(audioWav)
          if (result.text) {
            log(`Transcription: "${result.text}"`)
            this.emit('transcription', {
              sessionId,
              userId,
              text: result.text,
              duration
            })
          } else if (result.error) {
            log(`Transcription error: ${result.error}`)
          }
        } catch (error) {
          log('Error transcribing audio:', error)
        }
      })

      receiver.start()
      this.audioReceivers.set(sessionId, receiver)
      log(`✅ Audio capture started for session ${sessionId}`)
      return true
    } catch (error) {
      log(`Failed to start audio capture for session ${sessionId}:`, error)
      return false
    }
  }

  /**
   * Stop audio capture for a session
   */
  stopAudioCapture(sessionId: string): void {
    const receiver = this.audioReceivers.get(sessionId)
    if (receiver) {
      log(`Stopping audio capture for session ${sessionId}`)
      receiver.stop()
      this.audioReceivers.delete(sessionId)
    }
  }

  /**
   * Start TTS player for a session
   */
  startTTSPlayer(sessionId: string): boolean {
    const session = this.sessions.get(sessionId)
    if (!session) {
      log(`Cannot start TTS player: session ${sessionId} not found`)
      return false
    }

    // Check if already exists
    if (this.ttsPlayers.has(sessionId)) {
      log(`TTS player already active for session ${sessionId}`)
      return true
    }

    try {
      log(`Starting TTS player for session ${sessionId}`)
      const player = new TTSPlayer(session.connection)
      this.ttsPlayers.set(sessionId, player)
      log(`✅ TTS player started for session ${sessionId}`)
      return true
    } catch (error) {
      log(`Failed to start TTS player for session ${sessionId}:`, error)
      return false
    }
  }

  /**
   * Stop TTS player for a session
   */
  stopTTSPlayer(sessionId: string): void {
    const player = this.ttsPlayers.get(sessionId)
    if (player) {
      log(`Stopping TTS player for session ${sessionId}`)
      player.destroy()
      this.ttsPlayers.delete(sessionId)
    }
  }

  /**
   * Speak text in a voice channel using TTS
   */
  async speak(sessionId: string, text: string): Promise<boolean> {
    const player = this.ttsPlayers.get(sessionId)
    if (!player) {
      log(`Cannot speak: no TTS player for session ${sessionId}`)
      return false
    }

    try {
      log(`Speaking in session ${sessionId}: "${text}"`)
      const voiceManager = getVoiceServiceManager()

      if (!voiceManager.isAvailable()) {
        log('Voice services not available')
        return false
      }

      const audioBuffer = await voiceManager.speak({ text })
      if (!audioBuffer) {
        log('Failed to generate TTS audio')
        return false
      }

      await player.play(Buffer.from(audioBuffer))
      log(`✅ TTS audio queued for playback`)
      return true
    } catch (error) {
      log('Error speaking:', error)
      return false
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
}
