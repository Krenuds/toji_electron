// Discord channel listing tool for MCP
import { z } from 'zod'
import type { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js'
import { createLogger } from '../../../utils/logger'

const logger = createLogger('mcp:discord-list-channels')

export interface DiscordChannelLister {
  listChannels(
    guildId?: string,
    channelType?: string
  ): Promise<
    Array<{
      id: string
      name: string
      type: string
      parentId: string | null
      parentName: string | null
      topic: string | null
      position: number
    }>
  >
}

/**
 * Register Discord channel listing tool with MCP server
 */
export function registerDiscordListChannelsTool(
  server: McpServer,
  channelLister: DiscordChannelLister
): void {
  logger.debug('Registering discord_list_channels tool')

  server.registerTool(
    'discord_list_channels',
    {
      title: 'List Discord Channels',
      description:
        'List all accessible channels in a Discord guild. Helps AI navigate and discover available channels.',
      inputSchema: {
        guildId: z
          .string()
          .optional()
          .describe(
            'Discord guild (server) ID. If not provided, uses the first guild the bot is connected to.'
          ),
        channelType: z
          .enum(['text', 'voice', 'category', 'announcement', 'forum', 'all'])
          .default('all')
          .describe('Filter channels by type. Default is "all" to show all channel types.')
      },
      outputSchema: {
        guildId: z.string(),
        guildName: z.string(),
        channelCount: z.number(),
        channels: z.array(
          z.object({
            id: z.string(),
            name: z.string(),
            type: z.string(),
            parentId: z.string().nullable(),
            parentName: z.string().nullable(),
            topic: z.string().nullable(),
            position: z.number()
          })
        )
      }
    },
    async ({ guildId, channelType = 'all' }) => {
      try {
        logger.debug(
          'Listing channels for guild %s with type filter: %s',
          guildId || 'default',
          channelType
        )

        const channels = await channelLister.listChannels(guildId, channelType)

        const output = {
          guildId: guildId || 'default',
          guildName: 'Discord Server',
          channelCount: channels.length,
          channels
        }

        logger.debug('Listed %d channels successfully', channels.length)

        return {
          content: [
            {
              type: 'text',
              text: `Found ${channels.length} channels:\n\n${channels
                .map(
                  (c) =>
                    `${c.name} (${c.type})${c.parentName ? ` in ${c.parentName}` : ''}${c.topic ? ` - ${c.topic}` : ''}`
                )
                .join('\n')}`
            }
          ],
          structuredContent: output
        }
      } catch (error) {
        logger.debug('Error listing channels: %o', error)
        const errorMessage = error instanceof Error ? error.message : 'Unknown error'

        return {
          content: [
            {
              type: 'text',
              text: `Error listing Discord channels: ${errorMessage}`
            }
          ],
          isError: true
        }
      }
    }
  )

  logger.debug('discord_list_channels tool registered successfully')
}
