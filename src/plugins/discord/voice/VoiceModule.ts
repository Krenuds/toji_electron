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
import type { VoiceBasedChannel, Client, EmbedBuilder } from 'discord.js'
import { createLogger } from '../../../main/utils/logger'
import type { VoiceSession, VoiceSessionConfig } from './types'
import type { DiscordModule } from '../interfaces'
import { AudioReceiver, DEFAULT_AUDIO_CONFIG } from './AudioReceiver'
import { TTSPlayer } from './TTSPlayer'
import { getVoiceServiceManager } from '../../../main/services/voice-service-manager'

const logger = createLogger('discord:voice')

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
  private client?: Client

  constructor() {
    super()
    logger.debug('VoiceModule constructed')

    // Listen to transcription events and send to Discord
    this.on('transcription', (event) => {
      this.handleTranscription(event).catch((error) => {
        logger.debug('Error in transcription handler:', error)
      })
    })
  }

  /**
   * Set bot user ID for audio filtering
   */
  setBotUserId(userId: string): void {
    this.botUserId = userId
    logger.debug('Bot user ID set:', userId)
  }

  /**
   * Initialize the voice module
   */
  async initialize(): Promise<void> {
    logger.debug('Initializing VoiceModule')

    // Log compact dependency report for debugging
    try {
      const { generateDependencyReport } = await import('@discordjs/voice')
      const report = generateDependencyReport()

      // Extract just the critical info (installed libraries)
      const hasOpus = report.includes('@discordjs/opus:')
      const hasSodium = report.includes('sodium-native:')
      const hasFFmpeg = report.includes('FFmpeg') && !report.includes('not found')

      logger.debug(
        'Voice dependencies: opus=%s, sodium=%s, ffmpeg=%s',
        hasOpus ? 'ok' : 'missing',
        hasSodium ? 'ok' : 'missing',
        hasFFmpeg ? 'ok' : 'missing'
      )
    } catch (error) {
      logger.debug('Failed to check voice dependencies:', error)
    }

    // Initialize voice services (Docker + HTTP clients)
    try {
      logger.debug('Initializing voice services...')
      const voiceManager = getVoiceServiceManager()
      await voiceManager.initialize()
      logger.debug('Voice services initialized successfully')
    } catch (error) {
      logger.debug('Failed to initialize voice services (non-fatal):', error)
      logger.debug('Voice transcription and TTS will not be available')
    }
  }

  /**
   * Initialize with Discord client (called from onReady)
   */
  async initializeWithClient(client: Client): Promise<void> {
    this.client = client
    logger.debug('VoiceModule initialized with Discord client')
  }

  /**
   * Cleanup the voice module
   */
  cleanup(): void {
    logger.debug('Cleaning up VoiceModule')

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
        logger.debug(`Destroyed session ${sessionId}`)
      } catch (error) {
        logger.debug(`Error destroying session ${sessionId}:`, error)
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
    logger.debug(`=== JOIN VOICE CHANNEL START ===`)
    logger.debug(`User: ${userId}`)
    logger.debug(`Channel ID: ${channel.id}`)
    logger.debug(`Channel Name: ${channel.name}`)
    logger.debug(`Guild ID: ${channel.guild.id}`)
    logger.debug(`Guild Name: ${channel.guild.name}`)
    logger.debug(`Project Path: ${projectPath || 'none'}`)
    logger.debug(`Project Channel: ${projectChannelId || 'none'}`)

    // Check if user already has a session - automatically leave it
    const existingSessionId = this.userSessions.get(userId)
    if (existingSessionId) {
      const existingSession = this.sessions.get(existingSessionId)
      if (existingSession) {
        logger.debug(
          `User ${userId} already has an active session: ${existingSessionId}, automatically leaving...`
        )

        try {
          // Clean up the existing session
          existingSession.connection.destroy()
          existingSession.status = 'disconnected'
          this.sessions.delete(existingSessionId)
          this.userSessions.delete(userId)
          this.emit('sessionEnded', existingSessionId)
          logger.debug(`Successfully left previous session ${existingSessionId}`)
        } catch (error) {
          logger.debug(`Error leaving previous session:`, error)
          // Continue anyway - we'll create a new session
        }
      }
    }

    // Create session ID
    const sessionId = `voice-${userId}-${Date.now()}`
    logger.debug(`Created session ID: ${sessionId}`)

    // Create session config
    const config: VoiceSessionConfig = {
      userId,
      guildId: channel.guild.id,
      channelId: channel.id,
      projectPath,
      projectChannelId,
      wakeWord: 'listen' // Default wake word
    }

    logger.debug(`Calling joinVoiceChannel from @discordjs/voice...`)
    logger.debug(
      `Voice adapter available: ${typeof channel.guild.voiceAdapterCreator === 'function'}`
    )

    // Join the voice channel with debug enabled
    const connection = joinVoiceChannel({
      channelId: channel.id,
      guildId: channel.guild.id,
      adapterCreator: channel.guild.voiceAdapterCreator,
      selfDeaf: false, // IMPORTANT: Must be undeafened to receive audio
      selfMute: false, // Must be unmuted to speak
      debug: true // Enable debug logging
    })

    logger.debug(`Connection object created, initial state: ${connection.state.status}`)

    // Create session
    const session: VoiceSession = {
      id: sessionId,
      config,
      connection,
      startTime: new Date(),
      status: 'connecting',
      projectPath,
      projectChannelId,
      isListening: false, // Start in non-listening mode
      wakeWord: config.wakeWord || 'listen'
    }

    // Store session
    this.sessions.set(sessionId, session)
    this.userSessions.set(userId, sessionId)

    // Setup connection event handlers BEFORE waiting
    this.setupConnectionHandlers(session)
    logger.debug(`Connection handlers setup complete`)

    try {
      logger.debug(`Waiting for connection to reach Ready state (5s timeout)...`)
      const startTime = Date.now()

      await entersState(connection, VoiceConnectionStatus.Ready, 5000)

      const duration = Date.now() - startTime
      session.status = 'connected'
      logger.debug(`✅ Successfully connected to voice channel ${channel.id} in ${duration}ms`)
      logger.debug(`=== JOIN VOICE CHANNEL SUCCESS ===`)

      // Auto-start audio capture for this session
      logger.debug(`Auto-starting audio capture for session ${sessionId}`)
      this.startAudioCapture(sessionId)

      // Auto-start TTS player for this session
      logger.debug(`Auto-starting TTS player for session ${sessionId}`)
      this.startTTSPlayer(sessionId)

      this.emit('sessionStarted', session)
      return session
    } catch (error) {
      logger.debug(`❌ Failed to connect to voice channel after timeout`)
      logger.debug(`Error type: ${error instanceof Error ? error.constructor.name : typeof error}`)
      logger.debug(`Error message: ${error instanceof Error ? error.message : String(error)}`)
      logger.debug(`Current connection state: ${connection.state.status}`)
      logger.debug(`Connection state details:`, connection.state)
      logger.debug(`=== JOIN VOICE CHANNEL FAILED ===`)

      session.status = 'error'

      // Cleanup failed session
      this.sessions.delete(sessionId)
      this.userSessions.delete(userId)

      try {
        connection.destroy()
        logger.debug(`Connection destroyed during cleanup`)
      } catch (destroyError) {
        logger.debug(`Error destroying connection:`, destroyError)
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

    logger.debug(`Leaving voice channel for session ${sessionId}`)

    try {
      // Stop audio capture and TTS for this session
      this.stopAudioCapture(sessionId)
      this.stopTTSPlayer(sessionId)

      session.connection.destroy()
      session.status = 'disconnected'

      this.sessions.delete(sessionId)
      this.userSessions.delete(userId)

      this.emit('sessionEnded', sessionId)
      logger.debug(`Successfully left voice channel`)
    } catch (error) {
      logger.debug(`Error leaving voice channel:`, error)
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
      logger.debug(`Networking state:`, connectionAny.state.networking)
    }

    connection.on('stateChange', (oldState, newState) => {
      logger.debug(`🔄 State Change [${session.id}]: ${oldState.status} -> ${newState.status}`)

      // Log additional state info if it's a simple string/number property
      const oldStateInfo = `status: ${oldState.status}`
      const newStateInfo = `status: ${newState.status}`
      logger.debug(`  Old: ${oldStateInfo}`)
      logger.debug(`  New: ${newStateInfo}`)

      // Log additional details for disconnected state
      if (newState.status === VoiceConnectionStatus.Disconnected) {
        const disconnectedState = newState as unknown as {
          reason?: number
          closeCode?: number
        }
        logger.debug(`Disconnect reason:`, disconnectedState.reason)
        logger.debug(`Close code:`, disconnectedState.closeCode)
        logger.debug(`Old state details:`, oldState)
        logger.debug(`New state details:`, newState)
      }

      // Update session status based on connection state
      switch (newState.status) {
        case VoiceConnectionStatus.Ready:
          logger.debug(`✅ Connection is READY`)
          session.status = 'connected'
          break
        case VoiceConnectionStatus.Disconnected:
          logger.debug(`⚠️ Connection DISCONNECTED`)
          session.status = 'disconnected'
          // Cleanup session
          this.sessions.delete(session.id)
          this.userSessions.delete(session.config.userId)
          this.emit('sessionEnded', session.id)
          break
        case VoiceConnectionStatus.Destroyed:
          logger.debug(`💀 Connection DESTROYED`)
          session.status = 'disconnected'
          // Cleanup session
          this.sessions.delete(session.id)
          this.userSessions.delete(session.config.userId)
          this.emit('sessionEnded', session.id)
          break
        case VoiceConnectionStatus.Connecting:
          logger.debug(`🔌 Connection is CONNECTING`)
          session.status = 'connecting'
          break
        case VoiceConnectionStatus.Signalling:
          logger.debug(`📡 Connection is SIGNALLING`)
          session.status = 'connecting'
          break
      }
    })

    connection.on('error', (error) => {
      logger.debug(`❌ Connection Error [${session.id}]:`)
      logger.debug(`Error name: ${error.name}`)
      logger.debug(`Error message: ${error.message}`)
      logger.debug(`Error stack:`, error.stack)
      logger.debug(`Full error object:`, error)
      session.status = 'error'
      this.emit('connectionError', error, session.id)
    })

    // Add debug event listener if available
    const connectionWithDebug = connection as unknown as {
      on?: (event: string, listener: (message: string) => void) => void
    }
    if (connectionWithDebug.on) {
      connectionWithDebug.on('debug', (message: string) => {
        logger.debug(`🐛 Debug [${session.id}]: ${message}`)
      })
    }
  }

  /**
   * Start audio capture for a session
   */
  startAudioCapture(sessionId: string): boolean {
    const session = this.sessions.get(sessionId)
    if (!session) {
      logger.debug(`Cannot start audio capture: session ${sessionId} not found`)
      return false
    }

    // Check if already capturing
    if (this.audioReceivers.has(sessionId)) {
      logger.debug(`Audio capture already active for session ${sessionId}`)
      return true
    }

    try {
      logger.debug(`Starting audio capture for session ${sessionId}`)
      const receiver = new AudioReceiver(session.connection, DEFAULT_AUDIO_CONFIG)

      // Set bot user ID if available
      if (this.botUserId) {
        receiver.setBotUserId(this.botUserId)
      }

      // Set callback for when audio is ready
      receiver.setOnAudioReady(async (userId, audioWav, duration) => {
        logger.debug(
          `Audio ready from user ${userId}: ${audioWav.length} bytes, ${duration.toFixed(2)}s`
        )

        // Transcribe with Whisper
        try {
          const voiceManager = getVoiceServiceManager()
          if (!voiceManager.isAvailable()) {
            logger.debug('Voice services not available, skipping transcription')
            return
          }

          const result = await voiceManager.transcribe(audioWav)
          if (result.text) {
            logger.debug(`Transcription: "${result.text}"`)

            // Get session to check listening state
            const session = this.sessions.get(sessionId)
            if (!session) {
              logger.debug('Session not found, skipping transcription')
              return
            }

            // Check for wake word in transcription
            const transcriptionLower = result.text.toLowerCase()
            const wakeWord = session.wakeWord.toLowerCase()

            if (!session.isListening) {
              // Not listening yet - check for wake word
              if (transcriptionLower.includes(wakeWord)) {
                logger.debug(
                  `🎤 Wake word "${session.wakeWord}" detected! Entering listening mode...`
                )
                session.isListening = true

                // Extract text after wake word if present
                const wakeWordIndex = transcriptionLower.indexOf(wakeWord)
                const textAfterWakeWord = result.text
                  .substring(wakeWordIndex + wakeWord.length)
                  .trim()

                if (textAfterWakeWord.length > 0) {
                  // Process the text that came after the wake word
                  logger.debug(`Processing text after wake word: "${textAfterWakeWord}"`)
                  this.emit('transcription', {
                    sessionId,
                    userId,
                    text: textAfterWakeWord,
                    duration
                  })
                } else {
                  logger.debug('Wake word detected, waiting for next speech input...')
                }
              } else {
                logger.debug(`Ignoring speech (no wake word): "${result.text}"`)
              }
            } else {
              // Already listening - process the transcription
              logger.debug(`Processing transcription (listening mode active): "${result.text}"`)
              this.emit('transcription', {
                sessionId,
                userId,
                text: result.text,
                duration
              })

              // Reset listening state after processing
              // Bot will need wake word again for next interaction
              session.isListening = false
              logger.debug('Listening mode reset - waiting for wake word again')
            }
          } else if (result.error) {
            logger.debug(`Transcription error: ${result.error}`)
          }
        } catch (error) {
          logger.debug('Error transcribing audio:', error)
        }
      })

      receiver.start()
      this.audioReceivers.set(sessionId, receiver)
      logger.debug(`✅ Audio capture started for session ${sessionId}`)
      return true
    } catch (error) {
      logger.debug(`Failed to start audio capture for session ${sessionId}:`, error)
      return false
    }
  }

  /**
   * Stop audio capture for a session
   */
  stopAudioCapture(sessionId: string): void {
    const receiver = this.audioReceivers.get(sessionId)
    if (receiver) {
      logger.debug(`Stopping audio capture for session ${sessionId}`)
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
      logger.debug(`Cannot start TTS player: session ${sessionId} not found`)
      return false
    }

    // Check if already exists
    if (this.ttsPlayers.has(sessionId)) {
      logger.debug(`TTS player already active for session ${sessionId}`)
      return true
    }

    try {
      logger.debug(`Starting TTS player for session ${sessionId}`)
      const player = new TTSPlayer(session.connection)
      this.ttsPlayers.set(sessionId, player)
      logger.debug(`✅ TTS player started for session ${sessionId}`)
      return true
    } catch (error) {
      logger.debug(`Failed to start TTS player for session ${sessionId}:`, error)
      return false
    }
  }

  /**
   * Stop TTS player for a session
   */
  stopTTSPlayer(sessionId: string): void {
    const player = this.ttsPlayers.get(sessionId)
    if (player) {
      logger.debug(`Stopping TTS player for session ${sessionId}`)
      player.destroy()
      this.ttsPlayers.delete(sessionId)
    }
  }

  /**
   * Speak text in a voice channel using TTS
   */
  async speak(sessionId: string, text: string): Promise<boolean> {
    logger.debug(`Speaking in session ${sessionId}: ${text.substring(0, 50)}...`)

    const player = this.ttsPlayers.get(sessionId)
    if (!player) {
      logger.debug(`Cannot speak: no TTS player for session ${sessionId}`)
      return false
    }

    try {
      const voiceManager = getVoiceServiceManager()

      if (!voiceManager.isAvailable()) {
        logger.debug('Voice services not available')
        return false
      }

      const audioBuffer = await voiceManager.speak({ text })
      if (!audioBuffer) {
        logger.debug('Failed to generate TTS audio')
        return false
      }

      const buffer = Buffer.from(audioBuffer)
      await player.play(buffer)
      return true
    } catch (error) {
      logger.debug('Error speaking:', error)
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

  /**
   * Handle transcription events and send to Discord
   */
  private async handleTranscription(event: {
    sessionId: string
    userId: string
    text: string
    duration: number
  }): Promise<void> {
    try {
      if (!this.client) {
        logger.debug('Cannot send transcription: Discord client not available')
        return
      }

      const session = this.sessions.get(event.sessionId)
      if (!session) {
        logger.debug('Cannot send transcription: session not found')
        return
      }

      // Get project channel ID from session config
      const targetChannelId = session.config.projectChannelId
      if (!targetChannelId) {
        logger.debug('Cannot send transcription: no project channel configured for session')
        return
      }

      const embed = await this.createTranscriptionEmbed(event)

      const channel = await this.client.channels.fetch(targetChannelId)
      if (!channel?.isTextBased()) {
        logger.debug('Cannot send transcription: channel not found or not text-based')
        return
      }

      // Type guard to ensure channel has send method
      if ('send' in channel) {
        // Send both text (for bot processing) and embed (for visual formatting)
        // Discord will automatically trigger MessageCreate event, which will be
        // processed by our handleMessage with the transcription exception
        await channel.send({
          content: event.text,
          embeds: [embed]
        })
        logger.debug(`✅ Sent transcription to channel ${targetChannelId}`)
      } else {
        logger.debug('Cannot send transcription: channel does not support sending messages')
      }
    } catch (error) {
      logger.debug('Error sending transcription to Discord:', error)
    }
  }

  /**
   * Create a Discord embed for transcription
   */
  private async createTranscriptionEmbed(event: {
    userId: string
    text: string
    duration: number
  }): Promise<EmbedBuilder> {
    const { EmbedBuilder } = await import('discord.js')
    const { DISCORD_COLORS } = await import('../constants')

    let username = 'Unknown User'
    let avatarUrl: string | undefined

    try {
      const user = await this.client?.users.fetch(event.userId)
      if (user) {
        username = user.username
        avatarUrl = user.displayAvatarURL()
      }
    } catch (error) {
      logger.debug('Failed to fetch user info:', error)
    }

    const embed = new EmbedBuilder()
      .setColor(DISCORD_COLORS.INFO)
      .setAuthor({
        name: username,
        iconURL: avatarUrl
      })
      .setDescription(`🎤 "${event.text}"`)
      .setFooter({
        text: `Duration: ${event.duration.toFixed(1)}s`
      })
      .setTimestamp()

    return embed
  }
}
