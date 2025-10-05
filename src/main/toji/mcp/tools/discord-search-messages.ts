// Discord message search tool for MCP
import { z } from 'zod'
import type { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js'
import { createLogger } from '../../../utils/logger'

const logger = createLogger('mcp:discord-search-messages')

export interface DiscordMessageSearcher {
  searchMessages(
    channelId: string,
    options: {
      query?: string
      authorId?: string
      before?: string
      after?: string
      limit: number
      hasAttachments?: boolean
    }
  ): Promise<
    Array<{
      id: string
      author: string
      authorId: string
      content: string
      timestamp: string
      attachments: Array<{ url: string; filename: string; size: number }>
      embeds: number
      reactions: Array<{ emoji: string; count: number }>
    }>
  >
}

/**
 * Register Discord message search tool with MCP server
 */
export function registerDiscordSearchMessagesTool(
  server: McpServer,
  messageSearcher: DiscordMessageSearcher
): void {
  logger.debug('Registering discord_search_messages tool')

  server.registerTool(
    'discord_search_messages',
    {
      title: 'Search Discord Messages',
      description:
        'Search message history in a Discord channel with filters. Find past discussions, code snippets, decisions, or specific content.',
      inputSchema: {
        channelId: z.string().describe('Discord channel ID to search in'),
        query: z
          .string()
          .optional()
          .describe('Text to search for in message content (case-insensitive)'),
        authorId: z.string().optional().describe('Filter by author user ID'),
        before: z
          .string()
          .optional()
          .describe('Only return messages before this date (ISO 8601 format)'),
        after: z
          .string()
          .optional()
          .describe('Only return messages after this date (ISO 8601 format)'),
        limit: z
          .number()
          .min(1)
          .max(100)
          .default(20)
          .describe('Maximum number of messages to return (1-100)'),
        hasAttachments: z
          .boolean()
          .optional()
          .describe('Only return messages with attachments if true')
      },
      outputSchema: {
        channelId: z.string(),
        query: z.string().optional(),
        matchCount: z.number(),
        messages: z.array(
          z.object({
            id: z.string(),
            author: z.string(),
            authorId: z.string(),
            content: z.string(),
            timestamp: z.string(),
            attachments: z.array(
              z.object({
                url: z.string(),
                filename: z.string(),
                size: z.number()
              })
            ),
            embeds: z.number(),
            reactions: z.array(
              z.object({
                emoji: z.string(),
                count: z.number()
              })
            )
          })
        )
      }
    },
    async ({ channelId, query, authorId, before, after, limit = 20, hasAttachments }) => {
      try {
        logger.debug(
          'Searching messages in channel %s with query: %s, limit: %d',
          channelId,
          query || 'none',
          limit
        )

        const messages = await messageSearcher.searchMessages(channelId, {
          query,
          authorId,
          before,
          after,
          limit,
          hasAttachments
        })

        const output = {
          channelId,
          query,
          matchCount: messages.length,
          messages
        }

        logger.debug('Found %d messages matching search criteria', messages.length)

        return {
          content: [
            {
              type: 'text',
              text:
                `Found ${messages.length} message(s)${query ? ` matching "${query}"` : ''}:\n\n` +
                messages
                  .map(
                    (m) =>
                      `[${m.timestamp}] ${m.author}: ${m.content.substring(0, 100)}${m.content.length > 100 ? '...' : ''}` +
                      (m.attachments.length > 0
                        ? `\n  📎 ${m.attachments.length} attachment(s)`
                        : '') +
                      (m.reactions.length > 0
                        ? `\n  ${m.reactions.map((r) => `${r.emoji} ${r.count}`).join(' ')}`
                        : '')
                  )
                  .join('\n\n')
            }
          ],
          structuredContent: output
        }
      } catch (error) {
        logger.debug('Error searching messages: %o', error)
        const errorMessage = error instanceof Error ? error.message : 'Unknown error'

        return {
          content: [
            {
              type: 'text',
              text: `Error searching Discord messages: ${errorMessage}`
            }
          ],
          isError: true
        }
      }
    }
  )
}
