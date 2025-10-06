/**
 * Discord Channel Editor - MCP Service Implementation
 * Edits channel properties (name, topic) in Discord guilds
 */

import type { Client } from 'discord.js'
import { ChannelType } from 'discord.js'
import { createLogger } from '../../../main/utils/logger'

const logger = createLogger('discord:mcp-channel-editor')

const CATEGORY_NAME = 'Toji Desktop'

export interface ChannelEditorService {
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
 * Create Discord channel editor service
 */
export function createDiscordChannelEditor(client: Client): ChannelEditorService {
  return {
    async editChannel(channelId, options) {
      logger.debug('Attempting to edit channel: %s with options: %o', channelId, options)

      // Find the channel
      const channel = client.channels.cache.get(channelId)

      if (!channel) {
        throw new Error(`Channel not found: ${channelId}`)
      }

      // Safety check: Only allow editing channels in Toji Desktop category
      if ('parent' in channel) {
        const parent = channel.parent
        if (!parent || parent.name !== CATEGORY_NAME) {
          throw new Error(
            `Cannot edit channel outside of ${CATEGORY_NAME} category. Channel parent: ${parent?.name || 'none'}`
          )
        }
      } else {
        throw new Error('Cannot edit category channels via MCP')
      }

      // Validate it's a text or voice channel
      if (
        channel.type !== ChannelType.GuildText &&
        channel.type !== ChannelType.GuildVoice &&
        channel.type !== ChannelType.GuildAnnouncement
      ) {
        throw new Error('Can only edit text, voice, or announcement channels')
      }

      const updatedFields: string[] = []
      const editOptions: { name?: string; topic?: string } = {}

      // Prepare edit options
      if (options.name) {
        editOptions.name = options.name
        updatedFields.push('name')
      }

      // Only set topic for text channels
      if (options.topic && channel.type === ChannelType.GuildText) {
        editOptions.topic = options.topic
        updatedFields.push('topic')
      } else if (options.topic && channel.type !== ChannelType.GuildText) {
        logger.debug('Ignoring topic for non-text channel')
      }

      if (updatedFields.length === 0) {
        throw new Error('No valid fields to update')
      }

      // Edit the channel
      await channel.edit(editOptions)

      logger.debug(
        'Channel edited: %s (%s) - updated: %s',
        channel.name,
        channelId,
        updatedFields.join(', ')
      )

      return {
        success: true,
        channelId: channel.id,
        channelName: channel.name,
        channelType: channel.type === ChannelType.GuildText ? 'text' : 'voice',
        updatedFields
      }
    }
  }
}
