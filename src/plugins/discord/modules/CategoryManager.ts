import {
  Client,
  CategoryChannel,
  TextChannel,
  ChannelType,
  PermissionFlagsBits,
  Guild
} from 'discord.js'
import { createFileDebugLogger } from '../../../main/utils/logger'

const log = createFileDebugLogger('discord:category-manager')

const CATEGORY_NAME = 'Toji Desktop'

/**
 * Manages the "Toji Desktop" Discord category and its channels
 * Provides the visual project management interface in Discord
 */
export class CategoryManager {
  private client?: Client

  async initialize(client: Client): Promise<void> {
    this.client = client
    log('CategoryManager initialized')
  }

  /**
   * Get or create the "Toji Desktop" category in all guilds
   */
  async getOrCreateCategory(guild?: Guild): Promise<CategoryChannel> {
    if (!this.client) {
      throw new Error('CategoryManager not initialized')
    }

    // If guild provided, use it; otherwise get first guild
    const targetGuild = guild || this.client.guilds.cache.first()
    if (!targetGuild) {
      throw new Error('Bot is not in any guilds')
    }

    // Check if category already exists
    let category = targetGuild.channels.cache.find(
      (ch) => ch.type === ChannelType.GuildCategory && ch.name === CATEGORY_NAME
    ) as CategoryChannel | undefined

    if (!category) {
      log('Creating Toji Desktop category in guild: %s', targetGuild.name)

      // Create the category
      category = await targetGuild.channels.create({
        name: CATEGORY_NAME,
        type: ChannelType.GuildCategory,
        position: 0,
        permissionOverwrites: [
          {
            id: targetGuild.roles.everyone,
            allow: [PermissionFlagsBits.ViewChannel, PermissionFlagsBits.ReadMessageHistory],
            deny: [PermissionFlagsBits.ManageChannels]
          }
        ],
        reason: 'Toji project management category'
      })

      log('Category created: %s', category.id)
    }

    return category
  }

  /**
   * Create a new project channel in the category
   */
  async createProjectChannel(projectName: string): Promise<TextChannel> {
    if (!this.client) {
      throw new Error('CategoryManager not initialized')
    }

    const category = await this.getOrCreateCategory()

    log('Creating project channel: %s', projectName)

    // Create channel - no indicators needed since we auto-switch
    const channel = await category.guild.channels.create({
      name: projectName,
      type: ChannelType.GuildText,
      parent: category.id,
      topic: `Project: ${projectName}`,
      permissionOverwrites: [
        {
          id: category.guild.roles.everyone,
          allow: [
            PermissionFlagsBits.ViewChannel,
            PermissionFlagsBits.SendMessages,
            PermissionFlagsBits.ReadMessageHistory
          ]
        }
      ],
      reason: `Project channel for ${projectName}`
    })

    log('Project channel created: %s (%s)', projectName, channel.id)
    return channel
  }

  /**
   * Ensure category exists in all guilds bot is in
   */
  async ensureCategoryInAllGuilds(): Promise<void> {
    if (!this.client) {
      throw new Error('CategoryManager not initialized')
    }

    log('Ensuring Toji Desktop category exists in all guilds')

    for (const guild of this.client.guilds.cache.values()) {
      try {
        await this.getOrCreateCategory(guild)
        log('Category ensured in guild: %s', guild.name)
      } catch (error) {
        log('ERROR: Failed to create category in guild %s: %o', guild.name, error)
      }
    }
  }

  /**
   * Get all project channels in the category
   */
  async getProjectChannels(guild?: Guild): Promise<TextChannel[]> {
    const category = await this.getOrCreateCategory(guild)

    const channels = Array.from(category.children.cache.values())
      .filter((ch): ch is TextChannel => ch.type === ChannelType.GuildText)
      .sort((a, b) => a.position - b.position)

    return channels
  }

  /**
   * Delete all project channels in the category
   */
  async deleteAllProjectChannels(): Promise<number> {
    const channels = await this.getProjectChannels()
    let deletedCount = 0

    for (const channel of channels) {
      try {
        await channel.delete('Rebuilding Toji Desktop channels')
        deletedCount++
        log('Deleted channel: %s', channel.name)
      } catch (error) {
        log('ERROR: Failed to delete channel %s: %o', channel.name, error)
      }
    }

    log('Deleted %d project channels', deletedCount)
    return deletedCount
  }

  /**
   * Update all channel positions to maintain order
   */
  async updateChannelOrder(activeChannelId?: string): Promise<void> {
    const category = await this.getOrCreateCategory()
    const channels = await this.getProjectChannels(category.guild)

    // Sort: active first, then alphabetical
    const sorted = channels.sort((a, b) => {
      if (a.id === activeChannelId) return -1
      if (b.id === activeChannelId) return 1
      return a.name.localeCompare(b.name)
    })

    // Update positions
    for (let i = 0; i < sorted.length; i++) {
      if (sorted[i].position !== i + 1) {
        await sorted[i].setPosition(i + 1)
      }
    }

    log('Channel order updated')
  }

  /**
   * Cleanup resources
   */
  cleanup(): void {
    log('CategoryManager cleaned up')
  }
}
