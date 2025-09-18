import { Client, Events, GatewayIntentBits } from 'discord.js'
import type { Message } from 'discord.js'
import type { Toji } from '../api/Toji'
import type { ConfigProvider } from '../config/ConfigProvider'

type ConnectionState = 'disconnected' | 'connecting' | 'connected' | 'error'

/**
 * Discord Service - Manages Discord bot lifecycle and integrates with Toji API
 * This service consumes the Toji API to process messages through OpenCode
 */
export class DiscordService {
  private client: Client | null = null
  private isConnected = false
  private connectionState: ConnectionState = 'disconnected'
  private lastError: Error | null = null
  private connectionAttemptTime: number | null = null

  constructor(
    private toji: Toji,
    private config: ConfigProvider
  ) {
    console.log('DiscordService: Initialized with Toji and ConfigProvider')
    console.log('DiscordService: Config has token:', this.config.hasDiscordToken())
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
    console.log('DiscordService: Token retrieved from config:', token ? `${token.substring(0, 10)}...` : 'NO TOKEN')

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
      throw new Error(`Failed to connect to Discord: ${error instanceof Error ? error.message : 'Unknown error'}`)
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
    })

    // Message create event
    this.client.on(Events.MessageCreate, async (message: Message) => {
      console.log(`DiscordService: Message received from ${message.author.tag}: "${message.content.substring(0, 50)}..."`)
      await this.handleMessage(message)
    })

    // Error event
    this.client.on(Events.Error, (error) => {
      console.error('DiscordService: Discord client error event:', error)
      this.lastError = error
      this.connectionState = 'error'
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
   * Handle incoming Discord messages
   */
  private async handleMessage(message: Message): Promise<void> {
    // Ignore bot's own messages
    if (message.author.bot) return

    // Only respond to messages that mention the bot
    if (!message.mentions.has(message.client.user!.id)) return

    // Extract message content without mentions
    const content = message.content.replace(/<@!?\d+>/g, '').trim()

    if (!content) {
      await message.reply('Please provide a message for me to process.')
      return
    }

    try {
      // Show typing indicator
      await message.channel.sendTyping()

      // Process message through Toji API (which uses OpenCode)
      console.log(`DiscordService: Processing message: "${content}"`)
      const response = await this.toji.chat(content)

      // Discord has a 2000 character limit per message
      if (response.length > 2000) {
        // Split into multiple messages if needed
        const chunks = this.splitMessage(response, 2000)
        for (const chunk of chunks) {
          await message.channel.send(chunk)
        }
      } else {
        await message.reply(response)
      }
    } catch (error) {
      console.error('DiscordService: Error processing message:', error)
      await message.reply('Sorry, I encountered an error processing your request.')
    }
  }

  /**
   * Split a long message into chunks for Discord's character limit
   */
  private splitMessage(message: string, maxLength: number): string[] {
    const chunks: string[] = []
    let currentChunk = ''

    const lines = message.split('\n')
    for (const line of lines) {
      if (currentChunk.length + line.length + 1 > maxLength) {
        if (currentChunk) {
          chunks.push(currentChunk)
          currentChunk = ''
        }

        // If a single line is too long, split it
        if (line.length > maxLength) {
          const words = line.split(' ')
          for (const word of words) {
            if (currentChunk.length + word.length + 1 > maxLength) {
              chunks.push(currentChunk)
              currentChunk = word
            } else {
              currentChunk += (currentChunk ? ' ' : '') + word
            }
          }
        } else {
          currentChunk = line
        }
      } else {
        currentChunk += (currentChunk ? '\n' : '') + line
      }
    }

    if (currentChunk) {
      chunks.push(currentChunk)
    }

    return chunks
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