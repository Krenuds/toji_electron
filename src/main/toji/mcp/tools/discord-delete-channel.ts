// Discord channel deletion tool for MCP
import { z } from 'zod'
import type { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js'
import { createLogger } from '../../../utils/logger'

const logger = createLogger('mcp:discord-delete-channel')

export interface DiscordChannelDeleter {
  deleteChannel(
    channelId: string,
    reason?: string
  ): Promise<{
    success: boolean
    deletedChannel: string
    channelType: string
  }>
}

/**
 * Register Discord channel deletion tool with MCP server
 */
export function registerDiscordDeleteChannelTool(
  server: McpServer,
  channelDeleter: DiscordChannelDeleter
): void {
  logger.debug('Registering discord_delete_channel tool')

  server.registerTool(
    'discord_delete_channel',
    {
      title: 'Delete Discord Channel',
      description:
        'Delete a text or voice channel from Discord. Only works on channels in the Toji Desktop category for safety.',
      inputSchema: {
        channelId: z.string().describe('Discord channel ID to delete'),
        reason: z
          .string()
          .optional()
          .describe('Reason for deletion (appears in audit log, optional)')
      },
      outputSchema: {
        success: z.boolean(),
        deletedChannel: z.string(),
        channelType: z.string()
      }
    },
    async ({ channelId, reason }) => {
      try {
        logger.debug('Deleting channel: %s', channelId)

        const result = await channelDeleter.deleteChannel(channelId, reason)

        logger.debug('Channel deleted successfully: %s', result.deletedChannel)

        return {
          content: [
            {
              type: 'text',
              text: `✅ Deleted ${result.channelType} channel: **${result.deletedChannel}**\n\nChannel ID: ${channelId}${reason ? `\nReason: ${reason}` : ''}`
            }
          ],
          structuredContent: result
        }
      } catch (error) {
        logger.debug('Error deleting channel: %o', error)
        const errorMessage = error instanceof Error ? error.message : 'Unknown error'

        return {
          content: [
            {
              type: 'text',
              text: `❌ Error deleting Discord channel: ${errorMessage}`
            }
          ],
          isError: true
        }
      }
    }
  )

  logger.debug('discord_delete_channel tool registered')
}
