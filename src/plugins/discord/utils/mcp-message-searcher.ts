// Discord message searcher for MCP integration
import { Client, TextChannel } from 'discord.js'
import type { DiscordMessageSearcher } from '../../../main/toji/mcp'
import { createFileDebugLogger } from '../../../main/utils/logger'

const log = createFileDebugLogger('discord:mcp-message-searcher')

/**
 * Creates a Discord message searcher that implements the MCP interface
 */
export function createDiscordMessageSearcher(client: Client): DiscordMessageSearcher {
  return {
    async searchMessages(channelId: string, options) {
      log(
        'Searching messages in channel %s with query: %s, limit: %d',
        channelId,
        options.query || 'none',
        options.limit
      )

      try {
        const channel = await client.channels.fetch(channelId)

        if (!channel?.isTextBased()) {
          throw new Error(`Channel ${channelId} is not a text channel`)
        }

        // Fetch messages (Discord API limits to 100 per request)
        const fetchOptions: { limit: number; before?: string; after?: string } = {
          limit: Math.min(options.limit, 100)
        }

        if (options.before) {
          // Convert ISO date to snowflake (approximately)
          const beforeDate = new Date(options.before)
          fetchOptions.before = beforeDate.getTime().toString()
        }

        if (options.after) {
          const afterDate = new Date(options.after)
          fetchOptions.after = afterDate.getTime().toString()
        }

        const messages = await (channel as TextChannel).messages.fetch(fetchOptions)

        // Filter messages based on criteria
        const filteredMessages = Array.from(messages.values())
          .filter((msg) => {
            // Filter by query text
            if (options.query && !msg.content.toLowerCase().includes(options.query.toLowerCase())) {
              return false
            }

            // Filter by author
            if (options.authorId && msg.author.id !== options.authorId) {
              return false
            }

            // Filter by attachments
            if (options.hasAttachments !== undefined) {
              const hasAttachments = msg.attachments.size > 0
              if (options.hasAttachments !== hasAttachments) {
                return false
              }
            }

            return true
          })
          .reverse() // Oldest first
          .map((msg) => ({
            id: msg.id,
            author: msg.author.tag,
            authorId: msg.author.id,
            content: msg.content || '[no text content]',
            timestamp: msg.createdAt.toISOString(),
            attachments: Array.from(msg.attachments.values()).map((att) => ({
              url: att.url,
              filename: att.name,
              size: att.size
            })),
            embeds: msg.embeds.length,
            reactions: Array.from(msg.reactions.cache.values()).map((reaction) => ({
              emoji: reaction.emoji.name || reaction.emoji.id || '?',
              count: reaction.count
            }))
          }))

        log('Found %d messages matching search criteria', filteredMessages.length)
        return filteredMessages
      } catch (error) {
        log('Error searching messages: %o', error)
        throw new Error(
          `Failed to search Discord messages: ${error instanceof Error ? error.message : 'Unknown error'}`
        )
      }
    }
  }
}
