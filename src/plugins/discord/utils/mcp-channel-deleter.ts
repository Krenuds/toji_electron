/**
 * Discord Channel Deleter - MCP Service Implementation
 * Deletes channels from Discord guilds with safety checks
 */

import type { Client } from 'discord.js'
import { ChannelType } from 'discord.js'
import { createLogger } from '../../../main/utils/logger'

const logger = createLogger('discord:mcp-channel-deleter')

const CATEGORY_NAME = 'Toji Desktop'

export interface ChannelDeleterService {
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
 * Create Discord channel deleter service
 */
export function createDiscordChannelDeleter(client: Client): ChannelDeleterService {
  return {
    async deleteChannel(channelId, reason) {
      logger.debug('Attempting to delete channel: %s', channelId)

      // Find the channel
      const channel = client.channels.cache.get(channelId)

      if (!channel) {
        throw new Error(`Channel not found: ${channelId}`)
      }

      // Safety check: Only allow deletion of channels in Toji Desktop category
      if ('parent' in channel) {
        const parent = channel.parent
        if (!parent || parent.name !== CATEGORY_NAME) {
          throw new Error(
            `Cannot delete channel outside of ${CATEGORY_NAME} category. Channel parent: ${parent?.name || 'none'}`
          )
        }
      } else {
        throw new Error('Cannot delete category or non-child channels via MCP')
      }

      // Note: TypeScript already ensures we can't reach this with GuildCategory
      // because 'parent' check above filters non-child channels

      const channelName = channel.name
      const channelType = channel.type === ChannelType.GuildText ? 'text' : 'voice'

      // Delete the channel
      await channel.delete(reason || 'MCP tool: delete channel')

      logger.debug('Channel deleted: %s (%s)', channelName, channelId)

      return {
        success: true,
        deletedChannel: channelName,
        channelType
      }
    }
  }
}
