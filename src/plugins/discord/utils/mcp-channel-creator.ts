/**
 * Discord Channel Creator - MCP Service Implementation
 * Creates text or voice channels in Discord guilds
 */

import type { Client } from 'discord.js'
import { ChannelType as DiscordChannelType, PermissionFlagsBits } from 'discord.js'
import { createLogger } from '../../../main/utils/logger'

const logger = createLogger('discord:mcp-channel-creator')

const CATEGORY_NAME = 'Toji Desktop'

export interface ChannelCreatorService {
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
 * Create Discord channel creator service
 */
export function createDiscordChannelCreator(client: Client): ChannelCreatorService {
  return {
    async createChannel(name, type, topic, guildId) {
      logger.debug('Creating %s channel: %s', type, name)

      // Get target guild
      const guild = guildId ? client.guilds.cache.get(guildId) : client.guilds.cache.first()

      if (!guild) {
        throw new Error(guildId ? `Guild not found: ${guildId}` : 'Bot is not in any guilds')
      }

      // Find or create Toji Desktop category
      let category = guild.channels.cache.find(
        (ch) => ch.type === DiscordChannelType.GuildCategory && ch.name === CATEGORY_NAME
      )

      if (!category) {
        logger.debug('Creating Toji Desktop category in guild: %s', guild.name)
        category = await guild.channels.create({
          name: CATEGORY_NAME,
          type: DiscordChannelType.GuildCategory,
          position: 0,
          permissionOverwrites: [
            {
              id: guild.roles.everyone,
              allow: [PermissionFlagsBits.ViewChannel, PermissionFlagsBits.ReadMessageHistory],
              deny: [PermissionFlagsBits.ManageChannels]
            }
          ],
          reason: 'Toji project management category'
        })
      }

      // Create the channel
      const channelType =
        type === 'voice' ? DiscordChannelType.GuildVoice : DiscordChannelType.GuildText

      const channel = await guild.channels.create({
        name,
        type: channelType,
        parent: category.id,
        topic: topic || (type === 'voice' ? undefined : `Channel: ${name}`),
        permissionOverwrites: [
          {
            id: guild.roles.everyone,
            allow: [
              PermissionFlagsBits.ViewChannel,
              type === 'text' ? PermissionFlagsBits.SendMessages : PermissionFlagsBits.Connect,
              PermissionFlagsBits.ReadMessageHistory
            ]
          }
        ],
        reason: `MCP tool: create ${type} channel`
      })

      logger.debug('Channel created: %s (%s) in %s', channel.name, channel.id, guild.name)

      return {
        channelId: channel.id,
        name: channel.name,
        type: type,
        parentId: category.id,
        parentName: category.name
      }
    }
  }
}
