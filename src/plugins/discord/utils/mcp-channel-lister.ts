// Discord channel lister for MCP integration
import { ChannelType, Client, Guild } from 'discord.js'
import type { DiscordChannelLister } from '../../../main/toji/mcp'
import { createFileDebugLogger } from '../../../main/utils/logger'

const log = createFileDebugLogger('discord:mcp-channel-lister')

/**
 * Creates a Discord channel lister that implements the MCP interface
 */
export function createDiscordChannelLister(client: Client): DiscordChannelLister {
  return {
    async listChannels(guildId?: string, channelType?: string) {
      log('Listing channels for guild %s with type filter: %s', guildId || 'default', channelType)

      try {
        // Get the guild
        let guild: Guild | undefined

        if (guildId) {
          const fetchedGuild = await client.guilds.fetch(guildId)
          if (!fetchedGuild) {
            throw new Error(`Guild with ID ${guildId} not found`)
          }
          guild = fetchedGuild
        } else {
          // Use first guild if not specified
          guild = client.guilds.cache.first()
          if (!guild) {
            throw new Error('Bot is not connected to any guilds')
          }
        }

        // Fetch all channels
        const channels = await guild.channels.fetch()

        // Map Discord channel types to friendly names
        const typeMap: Record<number, string> = {
          [ChannelType.GuildText]: 'text',
          [ChannelType.GuildVoice]: 'voice',
          [ChannelType.GuildCategory]: 'category',
          [ChannelType.GuildAnnouncement]: 'announcement',
          [ChannelType.AnnouncementThread]: 'announcement-thread',
          [ChannelType.PublicThread]: 'thread',
          [ChannelType.PrivateThread]: 'private-thread',
          [ChannelType.GuildStageVoice]: 'stage',
          [ChannelType.GuildForum]: 'forum',
          [ChannelType.GuildMedia]: 'media'
        }

        // Filter and map channels
        const filteredChannels = Array.from(channels.values())
          .filter((channel) => {
            if (!channel) return false
            if (channelType === 'all') return true

            const channelTypeName = typeMap[channel.type]
            return channelTypeName === channelType
          })
          .map((channel) => {
            if (!channel) {
              return {
                id: '',
                name: '',
                type: 'unknown',
                parentId: null,
                parentName: null,
                topic: null,
                position: 0
              }
            }
            const parent = channel.parent
            return {
              id: channel.id,
              name: channel.name,
              type: typeMap[channel.type] || 'unknown',
              parentId: channel.parentId,
              parentName: parent?.name || null,
              topic: 'topic' in channel && typeof channel.topic === 'string' ? channel.topic : null,
              position:
                'position' in channel && typeof channel.position === 'number' ? channel.position : 0
            }
          })
          .filter((c) => c.id !== '') // Remove any invalid channels
          .sort((a, b) => a.position - b.position)

        log('Found %d channels matching criteria', filteredChannels.length)
        return filteredChannels
      } catch (error) {
        log('Error listing channels: %o', error)
        throw new Error(
          `Failed to list Discord channels: ${error instanceof Error ? error.message : 'Unknown error'}`
        )
      }
    }
  }
}
