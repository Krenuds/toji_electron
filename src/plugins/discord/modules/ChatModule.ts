import type { Message, ChannelType } from 'discord.js'
import { ChannelType as ChannelTypeEnum } from 'discord.js'
import type { Toji } from '../../../main/api/Toji'
import type { DiscordPlugin, DiscordModule } from '../DiscordPlugin'

interface ChannelSession {
  sessionId: string
  guildId?: string
  channelId: string
  lastActivity: Date
  context: string[]
}

/**
 * Discord Chat Module - Handles chat interactions and session management
 * Each channel gets its own session with the Toji API
 */
export class DiscordChatModule implements DiscordModule {
  private sessions: Map<string, ChannelSession> = new Map()
  private maxContextSize = 10 // Keep last 10 messages for context

  constructor(private toji: Toji) {}

  /**
   * Initialize the module with the parent plugin
   */
  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  initialize(_plugin: DiscordPlugin): void {
    // Plugin is available here if needed for future use
    console.log('DiscordChatModule: Initialized')
  }

  /**
   * Handle incoming chat messages
   */
  async handleMessage(message: Message): Promise<void> {
    // Ignore bot's own messages
    if (message.author.bot) return

    // Only respond to messages that mention the bot
    if (!message.mentions.has(message.client.user!.id)) return

    // Check if this is a partial channel (can't send messages)
    if (message.channel.partial) {
      console.log('DiscordChatModule: Cannot handle partial channels')
      return
    }

    // Check channel type - we can only send to text-based channels
    const supportedChannels: ChannelType[] = [
      ChannelTypeEnum.GuildText,
      ChannelTypeEnum.DM,
      ChannelTypeEnum.GuildVoice, // Voice channels can have text
      ChannelTypeEnum.GroupDM,
      ChannelTypeEnum.GuildAnnouncement,
      ChannelTypeEnum.PublicThread,
      ChannelTypeEnum.PrivateThread,
      ChannelTypeEnum.AnnouncementThread
    ]

    if (!supportedChannels.includes(message.channel.type)) {
      console.log(`DiscordChatModule: Unsupported channel type: ${message.channel.type}`)
      return
    }

    // Extract message content without mentions
    const content = message.content.replace(/<@!?\d+>/g, '').trim()

    if (!content) {
      await message.reply('Please provide a message for me to process.')
      return
    }

    try {
      // Show typing indicator if it's a proper text channel
      if (message.channel.type !== ChannelTypeEnum.GroupDM) {
        await message.channel.sendTyping()
      }

      // Get or create session for this channel
      const session = await this.getOrCreateSession(message)

      // Add message to context
      this.addToContext(session, `${message.author.username}: ${content}`)

      // Process message through Toji API
      console.log(
        `DiscordChatModule: Processing message in session ${session.sessionId}: "${content}"`
      )
      const response = await this.toji.chat(content)

      // Add response to context
      this.addToContext(session, `Bot: ${response}`)

      // Send response, splitting if necessary
      await this.sendResponse(message, response)
    } catch (error) {
      console.error('DiscordChatModule: Error processing message:', error)
      await message.reply('Sorry, I encountered an error processing your request.')
    }
  }

  /**
   * Get or create a session for the given message's channel
   */
  private async getOrCreateSession(message: Message): Promise<ChannelSession> {
    const channelKey = this.getChannelKey(message)

    let session = this.sessions.get(channelKey)

    if (!session) {
      console.log(`DiscordChatModule: Creating new session for channel ${channelKey}`)

      // Ensure Toji is ready for chat
      await this.toji.ensureReadyForChat()

      // Create a new session with the Toji API
      const tojiSession = await this.toji.session.create(`Discord: ${message.channel.id}`)

      session = {
        sessionId: tojiSession.id,
        guildId: message.guildId || undefined,
        channelId: message.channelId,
        lastActivity: new Date(),
        context: []
      }

      this.sessions.set(channelKey, session)
    } else {
      session.lastActivity = new Date()
    }

    return session
  }

  /**
   * Get a unique key for a channel
   */
  private getChannelKey(message: Message): string {
    // For DMs, use user ID instead of channel ID for consistency
    if (message.channel.type === ChannelTypeEnum.DM) {
      return `dm:${message.author.id}`
    }
    return `channel:${message.channelId}`
  }

  /**
   * Add a message to the session context
   */
  private addToContext(session: ChannelSession, message: string): void {
    session.context.push(message)

    // Keep only the last N messages
    if (session.context.length > this.maxContextSize) {
      session.context = session.context.slice(-this.maxContextSize)
    }
  }

  /**
   * Send a response to Discord, handling message splitting
   */
  private async sendResponse(message: Message, response: string): Promise<void> {
    // Discord has a 2000 character limit per message
    if (response.length > 2000) {
      const chunks = this.splitMessage(response, 2000)
      for (const chunk of chunks) {
        await message.reply(chunk)
      }
    } else {
      await message.reply(response)
    }
  }

  /**
   * Split a long message into chunks for Discord's character limit
   */
  private splitMessage(text: string, maxLength: number): string[] {
    const chunks: string[] = []
    let currentChunk = ''

    const lines = text.split('\n')
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
   * Clear session for a specific channel
   */
  async clearSession(channelId: string): Promise<void> {
    const session = this.sessions.get(`channel:${channelId}`)
    if (session) {
      console.log(`DiscordChatModule: Clearing session for channel ${channelId}`)
      this.sessions.delete(`channel:${channelId}`)
    }
  }

  /**
   * Get session info for a channel
   */
  getSessionInfo(channelId: string): ChannelSession | undefined {
    return this.sessions.get(`channel:${channelId}`)
  }

  /**
   * Cleanup module resources
   */
  cleanup(): void {
    console.log('DiscordChatModule: Cleaning up sessions')
    this.sessions.clear()
  }
}
