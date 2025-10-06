// Discord channel editing tool for MCP
import { z } from 'zod'
import type { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js'
import { createLogger } from '../../../utils/logger'

const logger = createLogger('mcp:discord-edit-channel')

export interface DiscordChannelEditor {
  editChannel(
    channelId: string,
    options: {
      name?: string
      topic?: string
    }
  ): Promise<{
    success: boolean
    channelId: string
    channelName: string
    channelType: string
    updatedFields: string[]
  }>
}

/**
 * Register Discord channel editing tool with MCP server
 */
export function registerDiscordEditChannelTool(
  server: McpServer,
  channelEditor: DiscordChannelEditor
): void {
  logger.debug('Registering discord_edit_channel tool')

  server.registerTool(
    'discord_edit_channel',
    {
      title: 'Edit Discord Channel',
      description:
        "Edit a Discord channel's name or topic. Only works on channels in the Toji Desktop category for safety.",
      inputSchema: {
        channelId: z.string().describe('Discord channel ID to edit'),
        name: z.string().min(1).max(100).optional().describe('New channel name (1-100 characters)'),
        topic: z
          .string()
          .max(1024)
          .optional()
          .describe('New channel topic/description (text channels only, max 1024 characters)')
      },
      outputSchema: {
        success: z.boolean(),
        channelId: z.string(),
        channelName: z.string(),
        channelType: z.string(),
        updatedFields: z.array(z.string())
      }
    },
    async ({ channelId, name, topic }) => {
      try {
        logger.debug('Editing channel: %s', channelId)

        const options: { name?: string; topic?: string } = {}
        if (name) options.name = name
        if (topic) options.topic = topic

        const result = await channelEditor.editChannel(channelId, options)

        logger.debug(
          'Channel edited successfully: %s (updated: %s)',
          result.channelName,
          result.updatedFields.join(', ')
        )

        return {
          content: [
            {
              type: 'text',
              text: `✅ Edited ${result.channelType} channel: **${result.channelName}**\n\nChannel ID: ${channelId}\nUpdated fields: ${result.updatedFields.join(', ')}`
            }
          ],
          structuredContent: result
        }
      } catch (error) {
        logger.debug('Error editing channel: %o', error)
        const errorMessage = error instanceof Error ? error.message : 'Unknown error'

        return {
          content: [
            {
              type: 'text',
              text: `❌ Error editing Discord channel: ${errorMessage}`
            }
          ],
          isError: true
        }
      }
    }
  )

  logger.debug('discord_edit_channel tool registered')
}
