import { Client, Events, GatewayIntentBits } from 'discord.js'
import type { Message } from 'discord.js'
import type { Toji } from '../api/Toji'
import type { ConfigProvider } from '../config/ConfigProvider'
import type { DiscordPlugin } from '../../plugins/discord/DiscordPlugin'

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
    console.log('DiscordService: Initialized with Toji and ConfigProvider')
    console.log('DiscordService: Config has token:', this.config.hasDiscordToken())
    this.initializePlugin()
  }

  /**
   * Initialize the Discord plugin
   */
  private async initializePlugin(): Promise<void> {
    try {
      const { DiscordPlugin } = await import('../../plugins/discord/DiscordPlugin')

      // Pass config to plugin for command deployment
      const token = this.config.getDiscordToken()
      const clientId = '1399539733880897537' // Your bot's client ID
      const guildId = process.env.DISCORD_GUILD_ID // Optional: for guild-specific commands

      this.plugin = new DiscordPlugin(this.toji, {
        token,
        clientId,
        guildId
      })

      await this.plugin.initialize()
      console.log('DiscordService: Plugin initialized')
    } catch (error) {
      console.error('DiscordService: Failed to initialize plugin:', error)
    }
  }

  /**
   * Register a Discord plugin (optional external registration)
   */
  registerPlugin(plugin: DiscordPlugin): void {
    this.plugin = plugin
    console.log('DiscordService: External plugin registered')
  }

  /**
   * Connect to Discord using stored token
   */
  async connect(): Promise<void> {
    console.log('DiscordService: Connect method called')
    this.connectionState = 'connecting'
    this.connectionAttemptTime = Date.now()

    // Get token from config
    const token = this.config.getDiscordToken()
    console.log(
      'DiscordService: Token retrieved from config:',
      token ? `${token.substring(0, 10)}...` : 'NO TOKEN'
    )

    if (!token) {
      this.connectionState = 'error'
      this.lastError = new Error('No Discord token configured')
      console.error('DiscordService: No token found in config')
      throw this.lastError
    }

    // Disconnect if already connected
    if (this.isConnected) {
      console.log('DiscordService: Already connected, disconnecting first')
      await this.disconnect()
    }

    // Create Discord client with necessary intents
    console.log('DiscordService: Creating Discord client with intents')
    try {
      this.client = new Client({
        intents: [
          GatewayIntentBits.Guilds,
          GatewayIntentBits.GuildMessages,
          GatewayIntentBits.MessageContent
        ]
      })
      console.log('DiscordService: Client created successfully')
    } catch (error) {
      console.error('DiscordService: Failed to create client:', error)
      this.connectionState = 'error'
      this.lastError = error as Error
      throw error
    }

    // Set up event handlers
    console.log('DiscordService: Setting up event handlers')
    this.setupEventHandlers()

    // Login to Discord
    console.log('DiscordService: Attempting to login to Discord...')
    try {
      await this.client.login(token)
      console.log('DiscordService: Login method completed (waiting for ready event)')
    } catch (error) {
      console.error('DiscordService: Login failed:', error)
      console.error('DiscordService: Full error details:', {
        message: (error as Error).message,
        stack: (error as Error).stack,
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
      console.log('DiscordService: Disconnecting from Discord')
      this.client.destroy()
      this.client = null
      this.isConnected = false
    }

    // Cleanup plugin
    if (this.plugin) {
      await this.plugin.cleanup()
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
      console.error('DiscordService: Cannot setup handlers - client is null')
      return
    }

    console.log('DiscordService: Registering event handlers...')

    // Ready event
    this.client.once(Events.ClientReady, (readyClient) => {
      const timeTaken = this.connectionAttemptTime ? Date.now() - this.connectionAttemptTime : 0
      console.log(`DiscordService: ✅ Connected as ${readyClient.user.tag} (took ${timeTaken}ms)`)
      console.log(`DiscordService: Bot ID: ${readyClient.user.id}`)
      console.log(`DiscordService: Guilds: ${readyClient.guilds.cache.size}`)
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
      console.log(
        `DiscordService: Message received from ${message.author.tag}: "${message.content.substring(0, 50)}..."`
      )

      // Delegate all message handling to plugin
      if (this.plugin) {
        await this.plugin.handleMessage(message)
      }
    })

    // Interaction create event - delegate to plugin for slash commands
    this.client.on(Events.InteractionCreate, async (interaction) => {
      console.log(`DiscordService: Interaction received: ${interaction.type}`)

      // Delegate interaction handling to plugin
      if (this.plugin) {
        await this.plugin.handleInteraction(interaction)
      }
    })

    // Error event
    this.client.on(Events.Error, (error) => {
      console.error('DiscordService: Discord client error event:', error)
      this.lastError = error
      this.connectionState = 'error'

      // Emit to plugin
      if (this.plugin) {
        this.plugin.onError(error)
      }
    })

    // Disconnect event
    this.client.on(Events.ShardDisconnect, (event, shardId) => {
      console.log(`DiscordService: Disconnected from Discord (shard ${shardId})`, event)
      this.isConnected = false
      this.connectionState = 'disconnected'
    })

    // Debug event
    this.client.on(Events.Debug, (info) => {
      if (info.includes('Heartbeat') || info.includes('heartbeat')) return // Skip heartbeat spam
      console.log(`DiscordService: [DEBUG] ${info}`)
    })

    // Warn event
    this.client.on(Events.Warn, (warning) => {
      console.warn(`DiscordService: [WARN] ${warning}`)
    })

    console.log('DiscordService: Event handlers registered')
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
