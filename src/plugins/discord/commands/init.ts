import { SlashCommandBuilder, ChatInputCommandInteraction } from 'discord.js'
import type { Toji } from '../../../main/toji'
import type { DiscordProjectManager } from '../modules/DiscordProjectManager'
import { DISCORD_COLORS } from '../constants'

export const data = new SlashCommandBuilder()
  .setName('init')
  .setDescription('Rebuild all Discord project channels from scratch')

export async function execute(
  interaction: ChatInputCommandInteraction,
  toji: Toji,
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
    // Get count of current Toji projects before rebuild
    const tojiProjects = await toji.getAvailableProjects()

    // Perform complete rebuild
    await projectManager.initializeChannels()

    const createdCount = projectManager.getProjects().length

    const embed = {
      color: DISCORD_COLORS.SUCCESS,
      title: '🔄 Channels Rebuilt',
      description:
        'All Discord channels have been deleted and recreated from current Toji projects.',
      fields: [
        {
          name: 'Toji Projects Found',
          value: tojiProjects.length.toString(),
          inline: true
        },
        {
          name: 'Channels Created',
          value: createdCount.toString(),
          inline: true
        }
      ],
      footer: {
        text: 'Fresh start complete! All channels are now in sync with Toji.'
      },
      timestamp: new Date().toISOString()
    }

    await interaction.editReply({ embeds: [embed] })
  } catch (error) {
    const errorEmbed = {
      color: DISCORD_COLORS.ERROR,
      title: '❌ Rebuild Failed',
      description: `Failed to rebuild channels: ${error instanceof Error ? error.message : 'Unknown error'}`,
      footer: {
        text: 'Please check bot permissions and try again'
      }
    }

    await interaction.editReply({ embeds: [errorEmbed] })
  }
}
