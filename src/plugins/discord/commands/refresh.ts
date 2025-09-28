import { SlashCommandBuilder, ChatInputCommandInteraction } from 'discord.js'
import type { Toji } from '../../../main/toji'
import type { DiscordProjectManager } from '../modules/DiscordProjectManager'
import { DISCORD_COLORS } from '../constants'

export const data = new SlashCommandBuilder()
  .setName('refresh')
  .setDescription('Refresh Discord channels and project state')
  .addBooleanOption((option) =>
    option
      .setName('clean')
      .setDescription('Remove orphaned channels not in saved state')
      .setRequired(false)
  )

export async function execute(
  interaction: ChatInputCommandInteraction,
  _toji: Toji,
  projectManager?: DiscordProjectManager
): Promise<void> {
  if (!projectManager) {
    await interaction.reply({
      content: '❌ Project manager not initialized',
      ephemeral: true
    })
    return
  }

  await interaction.deferReply({ ephemeral: true })

  try {
    const cleanOrphans = interaction.options.getBoolean('clean') || false

    // Get current state before refresh
    const projectsBefore = projectManager.getProjects().length

    // Sync with Discord
    await projectManager.syncWithDiscord()

    let orphanedCount = 0
    let message = 'Discord channels have been refreshed and synced with saved state.'

    if (cleanOrphans) {
      // Clean up orphaned channels
      const { CategoryManager } = await import('../modules/CategoryManager')
      const categoryManager = new CategoryManager()
      await categoryManager.initialize(interaction.client)

      const category = await categoryManager.getOrCreateCategory()
      const existingChannels = await categoryManager.getProjectChannels(category.guild)

      for (const channel of existingChannels) {
        if (!projectManager.isProjectChannel(channel.id)) {
          await channel.delete('Removing orphaned channel')
          orphanedCount++
        }
      }

      if (orphanedCount > 0) {
        message += `\n\n🗑️ Removed ${orphanedCount} orphaned channel${orphanedCount > 1 ? 's' : ''}.`
      }
    }

    const projectsAfter = projectManager.getProjects().length

    const embed = {
      color: DISCORD_COLORS.SUCCESS,
      title: '🔄 Channels Refreshed',
      description: message,
      fields: [
        {
          name: 'Projects Tracked',
          value: projectsAfter.toString(),
          inline: true
        },
        {
          name: 'Changes',
          value:
            projectsAfter === projectsBefore
              ? 'No changes'
              : `${Math.abs(projectsAfter - projectsBefore)} project${Math.abs(projectsAfter - projectsBefore) !== 1 ? 's' : ''} ${projectsAfter > projectsBefore ? 'added' : 'removed'}`,
          inline: true
        }
      ],
      footer: {
        text: 'All channels are now in sync'
      },
      timestamp: new Date().toISOString()
    }

    await interaction.editReply({ embeds: [embed] })
  } catch (error) {
    const errorEmbed = {
      color: DISCORD_COLORS.ERROR,
      title: '❌ Refresh Failed',
      description: `Failed to refresh channels: ${error instanceof Error ? error.message : 'Unknown error'}`,
      footer: {
        text: 'Please check bot permissions'
      }
    }

    await interaction.editReply({ embeds: [errorEmbed] })
  }
}
