import { Client, Events, GatewayIntentBits } from 'discord.js'
import type { Message } from 'discord.js'
import type { Toji } from '../toji'
import type { ConfigProvider } from '../config/ConfigProvider'
import type { DiscordPlugin } from '../../plugins/discord/DiscordPlugin'
import { createLogger } from '../utils/logger'

const logger = createLogger('discord:service')

type ConnectionState = 'disconnected' | 'connecting' | 'connected' | 'error'

/**
 * Discord Service - Manages Discord bot connection lifecycle only
 * Business logic is handled by the Discord Plugin
 */
export class DiscordService {
  private client: Client | null = null
  private isConnected = false
  private connectionState: ConnectionState = 'disconnected'
  private lastError: Error | null = null
  private connectionAttemptTime: number | null = null
  private plugin?: DiscordPlugin

  constructor(
    private toji: Toji,
    private config: ConfigProvider
  ) {
    logger.debug('Initialized', { hasToken: this.config.hasDiscordToken() })
    // Don't initialize plugin in constructor - do it when connecting
  }

  /**
   * Extract Client ID from Discord bot token
   * Discord tokens are base64-encoded and contain the bot's user ID
   * Format: <bot_id>.<timestamp>.<hmac>
   */
  private extractClientIdFromToken(token: string): string | null {
    try {
      // Split the token by periods
      const parts = token.split('.')
      if (parts.length < 2) {
        logger.error('Invalid token format - expected at least 2 parts separated by dots')
        return null
      }

      // The first part is the base64-encoded bot ID
      const encodedId = parts[0]

      // Decode from base64
      const decodedId = Buffer.from(encodedId, 'base64').toString('utf-8')

      logger.debug('Successfully extracted Client ID', { clientId: decodedId })
      return decodedId
    } catch (error) {
      logger.error('Failed to extract client ID from token', error)
      return null
    }
  }

  /**
   * Initialize the Discord plugin
   */
  private async initializePlugin(): Promise<void> {
    try {
      const { DiscordPlugin } = await import('../../plugins/discord/DiscordPlugin')

      // Pass config to plugin for command deployment
      const token = this.config.getDiscordToken()

      // Extract Client ID from the token itself (no environment variable needed!)
      const clientId = token ? this.extractClientIdFromToken(token) || '' : ''

      if (!clientId) {
        logger.warn('Could not extract Client ID from token - slash commands may fail to deploy')
      } else {
        logger.debug('Using extracted Client ID for slash command deployment', { clientId })
      }

      const guildId = process.env.DISCORD_GUILD_ID // Optional: for guild-specific commands

      this.plugin = new DiscordPlugin(this.toji, {
        token,
        clientId,
        guildId
      })

      await this.plugin.initialize()
      logger.info('Plugin initialized')
    } catch (error) {
      logger.error('Failed to initialize plugin', error)
      throw error // Re-throw to prevent connecting with broken plugin
    }
  }

  /**
   * Register a Discord plugin (optional external registration)
   */
  registerPlugin(plugin: DiscordPlugin): void {
    this.plugin = plugin
    logger.debug('External plugin registered')
  }

  /**
   * Connect to Discord using stored token
   */
  async connect(): Promise<void> {
    logger.info('Connecting to Discord')
    this.connectionState = 'connecting'
    this.connectionAttemptTime = Date.now()

    // Get token from config
    const token = this.config.getDiscordToken()
    logger.debug('Token retrieved', { hasToken: !!token })

    if (!token) {
      this.connectionState = 'error'
      this.lastError = new Error('No Discord token configured')
      logger.error('No token found in config')
      throw this.lastError
    }

    // Disconnect if already connected
    if (this.isConnected) {
      logger.debug('Already connected, disconnecting first')
      await this.disconnect()
    }

    // Initialize plugin before connecting (ensure commands are loaded)
    logger.debug('Initializing Discord plugin')
    await this.initializePlugin()

    // Create Discord client with necessary intents
    logger.debug('Creating Discord client with intents')
    try {
      this.client = new Client({
        intents: [
          GatewayIntentBits.Guilds,
          GatewayIntentBits.GuildMessages,
          GatewayIntentBits.MessageContent,
          GatewayIntentBits.GuildVoiceStates // Required for voice connections
        ]
      })
      logger.debug('Client created successfully')
    } catch (error) {
      logger.error('Failed to create client', error)
      this.connectionState = 'error'
      this.lastError = error as Error
      throw error
    }

    // Set up event handlers
    logger.debug('Setting up event handlers')
    this.setupEventHandlers()

    // Login to Discord
    logger.debug('Attempting to login')
    try {
      await this.client.login(token)
      logger.debug('Login completed, waiting for ready event')
    } catch (error) {
      logger.error('Login failed', {
        message: (error as Error).message,
        name: (error as Error).name
      })
      this.connectionState = 'error'
      this.lastError = error as Error
      this.client = null
      throw new Error(
        `Failed to connect to Discord: ${error instanceof Error ? error.message : 'Unknown error'}`
      )
    }
  }

  /**
   * Disconnect from Discord
   */
  async disconnect(): Promise<void> {
    if (this.client) {
      logger.info('Disconnecting from Discord')
      this.client.destroy()
      this.client = null
      this.isConnected = false
    }

    // Cleanup plugin but keep reference so we can reinitialize
    if (this.plugin) {
      await this.plugin.cleanup()
      this.plugin = undefined // Clear reference so it gets recreated on next connect
    }
  }

  /**
   * Get current Discord status
   */
  getStatus(): {
    connected: boolean
    username?: string
    botId?: string
    guilds?: number
  } {
    if (!this.client || !this.isConnected) {
      return { connected: false }
    }

    return {
      connected: true,
      username: this.client.user?.username,
      botId: this.client.user?.id,
      guilds: this.client.guilds.cache.size
    }
  }

  /**
   * Set up Discord event handlers
   */
  private setupEventHandlers(): void {
    if (!this.client) {
      logger.error('Cannot setup handlers - client is null')
      return
    }

    logger.debug('Registering event handlers')

    // Ready event
    this.client.once(Events.ClientReady, (readyClient) => {
      const timeTaken = this.connectionAttemptTime ? Date.now() - this.connectionAttemptTime : 0
      logger.info('✅ Connected to Discord', {
        tag: readyClient.user.tag,
        botId: readyClient.user.id,
        guilds: readyClient.guilds.cache.size,
        timeTaken: `${timeTaken}ms`
      })
      this.isConnected = true
      this.connectionState = 'connected'
      this.lastError = null

      // Emit to plugin
      if (this.plugin) {
        this.plugin.onReady(readyClient)
      }
    })

    // Message create event - delegate to plugin
    this.client.on(Events.MessageCreate, async (message: Message) => {
      logger.debug('Message received', {
        from: message.author.tag,
        preview: message.content.substring(0, 50)
      })

      // Delegate all message handling to plugin
      if (this.plugin) {
        await this.plugin.handleMessage(message)
      }
    })

    // Interaction create event - delegate to plugin for slash commands
    this.client.on(Events.InteractionCreate, async (interaction) => {
      logger.debug('Interaction received', { type: interaction.type })

      // Delegate interaction handling to plugin
      if (this.plugin) {
        await this.plugin.handleInteraction(interaction)
      }
    })

    // Error event
    this.client.on(Events.Error, (error) => {
      logger.error('Discord client error', error)
      this.lastError = error
      this.connectionState = 'error'

      // Emit to plugin
      if (this.plugin) {
        this.plugin.onError(error)
      }
    })

    // Disconnect event
    this.client.on(Events.ShardDisconnect, (event, shardId) => {
      logger.warn('Disconnected from Discord', { shardId, event })
      this.isConnected = false
      this.connectionState = 'disconnected'
    })

    // Debug event
    this.client.on(Events.Debug, (info) => {
      if (info.includes('Heartbeat') || info.includes('heartbeat')) return // Skip heartbeat spam
      logger.debug(info)
    })

    // Warn event
    this.client.on(Events.Warn, (warning) => {
      logger.warn(warning)
    })

    logger.debug('Event handlers registered')
  }

  /**
   * Get debug information for troubleshooting
   */
  getDebugInfo(): {
    connectionState: ConnectionState
    isConnected: boolean
    hasClient: boolean
    hasToken: boolean
    lastError: string | null
    connectionAttemptTime: number | null
    clientUser: string | null
    guildsCount: number
  } {
    return {
      connectionState: this.connectionState,
      isConnected: this.isConnected,
      hasClient: !!this.client,
      hasToken: this.config.hasDiscordToken(),
      lastError: this.lastError ? this.lastError.message : null,
      connectionAttemptTime: this.connectionAttemptTime,
      clientUser: this.client?.user ? this.client.user.tag : null,
      guildsCount: this.client?.guilds.cache.size || 0
    }
  }
}
