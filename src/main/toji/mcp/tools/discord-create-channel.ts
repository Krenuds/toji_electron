// Discord channel creation tool for MCP
import { z } from 'zod'
import type { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js'
import { createLogger } from '../../../utils/logger'

const logger = createLogger('mcp:discord-create-channel')

export interface DiscordChannelCreator {
  createChannel(
    name: string,
    type: 'text' | 'voice',
    topic?: string,
    guildId?: string
  ): Promise<{
    channelId: string
    name: string
    type: string
    parentId: string | null
    parentName: string | null
  }>
}

/**
 * Register Discord channel creation tool with MCP server
 */
export function registerDiscordCreateChannelTool(
  server: McpServer,
  channelCreator: DiscordChannelCreator
): void {
  logger.debug('Registering discord_create_channel tool')

  server.registerTool(
    'discord_create_channel',
    {
      title: 'Create Discord Channel',
      description:
        'Create a new text or voice channel in the Toji Desktop category. Automatically creates the category if it does not exist.',
      inputSchema: {
        name: z
          .string()
          .min(1)
          .max(100)
          .describe(
            'Channel name (1-100 characters). Discord will convert to lowercase and replace spaces with hyphens.'
          ),
        type: z
          .enum(['text', 'voice'])
          .describe('Channel type: "text" for text channels, "voice" for voice channels'),
        topic: z
          .string()
          .max(1024)
          .optional()
          .describe('Channel topic/description (text channels only, max 1024 characters)'),
        guildId: z
          .string()
          .optional()
          .describe('Discord guild (server) ID. If not provided, uses the first available guild.')
      },
      outputSchema: {
        channelId: z.string(),
        name: z.string(),
        type: z.string(),
        parentId: z.string().nullable(),
        parentName: z.string().nullable()
      }
    },
    async ({ name, type, topic, guildId }) => {
      try {
        logger.debug('Creating %s channel: %s', type, name)

        const result = await channelCreator.createChannel(name, type, topic, guildId)

        logger.debug('Channel created successfully: %s (%s)', result.name, result.channelId)

        return {
          content: [
            {
              type: 'text',
              text: `✅ Created ${type} channel: **${result.name}**\n\nChannel ID: ${result.channelId}\nCategory: ${result.parentName || 'None'}`
            }
          ],
          structuredContent: result
        }
      } catch (error) {
        logger.debug('Error creating channel: %o', error)
        const errorMessage = error instanceof Error ? error.message : 'Unknown error'

        return {
          content: [
            {
              type: 'text',
              text: `❌ Error creating Discord channel: ${errorMessage}`
            }
          ],
          isError: true
        }
      }
    }
  )

  logger.debug('discord_create_channel tool registered')
}
