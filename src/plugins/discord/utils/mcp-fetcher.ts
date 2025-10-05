// Discord message fetcher for MCP integration
import type { Client, TextChannel, Message } from 'discord.js'
import type { DiscordMessageFetcher } from '../../../main/toji/mcp'
import { createLogger } from '../../../main/utils/logger'

const logger = createLogger('discord:mcp-fetcher')

/**
 * Creates a Discord message fetcher that implements the MCP interface
 * Tracks the last active channel for convenience
 */
export function createDiscordMessageFetcher(client: Client): DiscordMessageFetcher & {
  setCurrentChannel: (channelId: string) => void
  getCurrentChannel: () => string | undefined
} {
  let currentChannelId: string | undefined

  return {
    setCurrentChannel(channelId: string) {
      currentChannelId = channelId
      logger.debug('Current channel set to: %s', channelId)
    },

    getCurrentChannel() {
      return currentChannelId
    },

    async fetchMessages(channelId: string | undefined, limit: number) {
      // Use current channel if not specified
      const targetChannelId = channelId || currentChannelId

      if (!targetChannelId) {
        throw new Error('No channel ID provided and no current channel set')
      }
      logger.debug('Fetching %d messages from channel %s', limit, targetChannelId)

      try {
        // Get the channel
        const channel = await client.channels.fetch(targetChannelId)

        if (!channel?.isTextBased()) {
          throw new Error(`Channel ${targetChannelId} is not a text channel`)
        }

        // Fetch messages
        const messages = await (channel as TextChannel).messages.fetch({ limit })

        // Convert to simple format
        const result = Array.from(messages.values())
          .reverse() // Oldest first
          .map((msg: Message) => ({
            id: msg.id,
            author: msg.author.tag,
            content: msg.content || '[no text content]',
            timestamp: msg.createdAt.toISOString()
          }))

        logger.debug('Successfully fetched %d messages', result.length)
        return result
      } catch (error) {
        logger.debug('Error fetching messages: %o', error)
        throw new Error(
          `Failed to fetch Discord messages: ${error instanceof Error ? error.message : 'Unknown error'}`
        )
      }
    }
  }
}
