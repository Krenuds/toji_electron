// Discord channel info provider for MCP integration
import { ChannelType, Client, PermissionFlagsBits } from 'discord.js'
import type { DiscordChannelInfoProvider } from '../../../main/toji/mcp'
import { createFileDebugLogger } from '../../../main/utils/logger'

const log = createFileDebugLogger('discord:mcp-channel-info')

/**
 * Creates a Discord channel info provider that implements the MCP interface
 */
export function createDiscordChannelInfoProvider(client: Client): DiscordChannelInfoProvider {
  return {
    async getChannelInfo(channelId: string) {
      log('Getting info for channel %s', channelId)

      try {
        const channel = await client.channels.fetch(channelId)

        if (!channel) {
          throw new Error(`Channel with ID ${channelId} not found`)
        }

        if (!('guild' in channel) || !channel.guild) {
          throw new Error('Channel is not a guild channel')
        }

        // Map channel type
        const typeMap: Record<number, string> = {
          [ChannelType.GuildText]: 'text',
          [ChannelType.GuildVoice]: 'voice',
          [ChannelType.GuildCategory]: 'category',
          [ChannelType.GuildAnnouncement]: 'announcement',
          [ChannelType.GuildForum]: 'forum',
          [ChannelType.GuildMedia]: 'media'
        }

        // Get bot permissions
        const botMember = channel.guild.members.me
        const permissions = botMember ? channel.permissionsFor(botMember) : null

        const info = {
          id: channel.id,
          name: channel.name,
          type: typeMap[channel.type] || 'unknown',
          guildId: channel.guild.id,
          guildName: channel.guild.name,
          topic: 'topic' in channel && typeof channel.topic === 'string' ? channel.topic : null,
          position:
            'position' in channel && typeof channel.position === 'number' ? channel.position : 0,
          parentId: channel.parentId,
          parentName: channel.parent?.name || null,
          rateLimitPerUser:
            'rateLimitPerUser' in channel && typeof channel.rateLimitPerUser === 'number'
              ? channel.rateLimitPerUser
              : 0,
          nsfw: 'nsfw' in channel && typeof channel.nsfw === 'boolean' ? channel.nsfw : false,
          permissions: {
            canSend: permissions?.has(PermissionFlagsBits.SendMessages) ?? false,
            canRead: permissions?.has(PermissionFlagsBits.ViewChannel) ?? false,
            canManage: permissions?.has(PermissionFlagsBits.ManageChannels) ?? false,
            canEmbed: permissions?.has(PermissionFlagsBits.EmbedLinks) ?? false,
            canAttach: permissions?.has(PermissionFlagsBits.AttachFiles) ?? false,
            canMentionEveryone: permissions?.has(PermissionFlagsBits.MentionEveryone) ?? false
          },
          memberCount:
            'members' in channel && channel.members && 'cache' in channel.members
              ? channel.members.cache.size
              : undefined,
          createdAt: channel.createdAt?.toISOString() || new Date().toISOString()
        }

        log('Retrieved channel info: %s (%s)', info.name, info.type)
        return info
      } catch (error) {
        log('Error getting channel info: %o', error)
        throw new Error(
          `Failed to get Discord channel info: ${error instanceof Error ? error.message : 'Unknown error'}`
        )
      }
    }
  }
}
