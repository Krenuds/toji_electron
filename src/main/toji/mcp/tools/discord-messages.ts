// Discord message reading tool for MCP
import { z } from 'zod'
import type { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js'
import { createLogger } from '../../../utils/logger'

const logger = createLogger('mcp:discord-messages')

export interface DiscordMessageFetcher {
  fetchMessages(
    channelId: string | undefined,
    limit: number
  ): Promise<
    Array<{
      id: string
      author: string
      content: string
      timestamp: string
    }>
  >
}

/**
 * Register Discord message reading tool with MCP server
 */
export function registerDiscordMessageTool(
  server: McpServer,
  messageFetcher: DiscordMessageFetcher
): void {
  logger.debug('Registering discord_messages tool')

  server.registerTool(
    'discord_messages',
    {
      title: 'Read Discord Messages',
      description:
        'Read recent messages from a Discord channel. If channelId is not provided, uses the current active channel.',
      inputSchema: {
        channelId: z
          .string()
          .optional()
          .describe(
            'Discord channel ID to read from. If not provided, uses the current active channel.'
          ),
        limit: z
          .number()
          .min(1)
          .max(100)
          .default(10)
          .describe('Number of messages to retrieve (1-100)')
      },
      outputSchema: {
        messages: z.array(
          z.object({
            id: z.string(),
            author: z.string(),
            content: z.string(),
            timestamp: z.string()
          })
        ),
        count: z.number()
      }
    },
    async ({ channelId, limit = 10 }) => {
      try {
        logger.debug('Fetching %d messages from channel %s', limit, channelId || 'current')

        const messages = await messageFetcher.fetchMessages(channelId, limit)

        const output = {
          messages,
          count: messages.length
        }

        logger.debug('Retrieved %d messages successfully', messages.length)

        return {
          content: [
            {
              type: 'text',
              text: JSON.stringify(output, null, 2)
            }
          ],
          structuredContent: output
        }
      } catch (error) {
        logger.debug('Error fetching messages: %o', error)
        const errorMessage = error instanceof Error ? error.message : 'Unknown error'

        return {
          content: [
            {
              type: 'text',
              text: `Error reading Discord messages: ${errorMessage}`
            }
          ],
          isError: true
        }
      }
    }
  )

  logger.debug('discord_messages tool registered successfully')
}
