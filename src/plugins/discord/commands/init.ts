import { SlashCommandBuilder, ChatInputCommandInteraction } from 'discord.js'
import type { Toji } from '../../../main/toji'
import type { DiscordProjectManager } from '../modules/DiscordProjectManager'
import { DISCORD_COLORS } from '../constants'

export const data = new SlashCommandBuilder()
  .setName('init')
  .setDescription('Initialize Discord project channels from saved state')
  .addBooleanOption((option) =>
    option
      .setName('clear')
      .setDescription('Clear all existing channels before initializing')
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
    const clearExisting = interaction.options.getBoolean('clear') || false

    if (clearExisting) {
      // Full reinitialization
      await projectManager.initializeChannels()

      const embed = {
        color: DISCORD_COLORS.SUCCESS,
        title: '✅ Channels Reinitialized',
        description: 'All Discord channels have been recreated from saved state.',
        fields: [
          {
            name: 'Projects',
            value: `${projectManager.getProjects().length} channels created`,
            inline: true
          }
        ],
        footer: {
          text: 'Channels are now synced with saved state'
        },
        timestamp: new Date().toISOString()
      }

      await interaction.editReply({ embeds: [embed] })
    } else {
      // Just sync existing state
      await projectManager.syncWithDiscord()

      const embed = {
        color: DISCORD_COLORS.SUCCESS,
        title: '✅ Channels Synchronized',
        description: 'Discord channels have been synced with saved state.',
        fields: [
          {
            name: 'Projects',
            value: `${projectManager.getProjects().length} projects tracked`,
            inline: true
          }
        ],
        footer: {
          text: 'Missing channels were recreated'
        },
        timestamp: new Date().toISOString()
      }

      await interaction.editReply({ embeds: [embed] })
    }
  } catch (error) {
    const errorEmbed = {
      color: DISCORD_COLORS.ERROR,
      title: '❌ Initialization Failed',
      description: `Failed to initialize channels: ${error instanceof Error ? error.message : 'Unknown error'}`,
      footer: {
        text: 'Please check bot permissions'
      }
    }

    await interaction.editReply({ embeds: [errorEmbed] })
  }
}
