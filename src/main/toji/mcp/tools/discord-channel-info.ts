// Discord channel info tool for MCP
import { z } from 'zod'
import type { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js'
import { createLogger } from '../../../utils/logger'

const logger = createLogger('mcp:discord-channel-info')

export interface DiscordChannelInfoProvider {
  getChannelInfo(channelId: string): Promise<{
    id: string
    name: string
    type: string
    guildId: string
    guildName: string
    topic: string | null
    position: number
    parentId: string | null
    parentName: string | null
    rateLimitPerUser: number
    nsfw: boolean
    permissions: {
      canSend: boolean
      canRead: boolean
      canManage: boolean
      canEmbed: boolean
      canAttach: boolean
      canMentionEveryone: boolean
    }
    memberCount?: number
    createdAt: string
  }>
}

/**
 * Register Discord channel info tool with MCP server
 */
export function registerDiscordChannelInfoTool(
  server: McpServer,
  channelInfoProvider: DiscordChannelInfoProvider
): void {
  logger.debug('Registering discord_get_channel_info tool')

  server.registerTool(
    'discord_get_channel_info',
    {
      title: 'Get Discord Channel Info',
      description:
        'Get detailed information about a Discord channel including permissions, settings, and metadata. Useful for context awareness.',
      inputSchema: {
        channelId: z.string().describe('Discord channel ID to get information about')
      },
      outputSchema: {
        id: z.string(),
        name: z.string(),
        type: z.string(),
        guildId: z.string(),
        guildName: z.string(),
        topic: z.string().nullable(),
        position: z.number(),
        parentId: z.string().nullable(),
        parentName: z.string().nullable(),
        rateLimitPerUser: z.number(),
        nsfw: z.boolean(),
        permissions: z.object({
          canSend: z.boolean(),
          canRead: z.boolean(),
          canManage: z.boolean(),
          canEmbed: z.boolean(),
          canAttach: z.boolean(),
          canMentionEveryone: z.boolean()
        }),
        memberCount: z.number().optional(),
        createdAt: z.string()
      }
    },
    async ({ channelId }) => {
      try {
        logger.debug('Getting info for channel %s', channelId)

        const info = await channelInfoProvider.getChannelInfo(channelId)

        logger.debug('Retrieved channel info successfully: %s', info.name)

        return {
          content: [
            {
              type: 'text',
              text:
                `**${info.name}** (${info.type})\n` +
                `Guild: ${info.guildName}\n` +
                `Topic: ${info.topic || 'None'}\n` +
                `Slowmode: ${info.rateLimitPerUser}s\n` +
                `NSFW: ${info.nsfw}\n` +
                `Position: ${info.position}\n` +
                `Parent: ${info.parentName || 'None'}\n` +
                `Permissions: Send=${info.permissions.canSend}, Read=${info.permissions.canRead}, Manage=${info.permissions.canManage}\n` +
                `Created: ${info.createdAt}`
            }
          ],
          structuredContent: info
        }
      } catch (error) {
        logger.debug('Error getting channel info: %o', error)
        const errorMessage = error instanceof Error ? error.message : 'Unknown error'

        return {
          content: [
            {
              type: 'text',
              text: `Error getting Discord channel info: ${errorMessage}`
            }
          ],
          isError: true
        }
      }
    }
  )
}
