import { SlashCommandBuilder, ChatInputCommandInteraction } from 'discord.js'
import type { Toji } from '../../../main/toji'
import type { DiscordProjectManager } from '../modules/DiscordProjectManager'
import { DISCORD_COLORS } from '../constants'
import { createFileDebugLogger } from '../../../main/utils/logger'
import { createErrorEmbed } from '../utils/errors'

const log = createFileDebugLogger('discord:commands:clear')

export const data = new SlashCommandBuilder()
  .setName('clear')
  .setDescription('Clear the conversation history in the current project')

export async function execute(
  interaction: ChatInputCommandInteraction,
  toji: Toji,
  projectManager?: DiscordProjectManager
): Promise<void> {
  await interaction.deferReply({ ephemeral: true })

  try {
    // Clear the conversation in Toji (project context is maintained)
    toji.clearSession()

    // Get current project info for the embed
    const activeProject = projectManager?.getActiveProject()
    const projectInfo = activeProject
      ? `Project: **${activeProject.projectName}**`
      : 'No active project'

    const successEmbed = {
      color: DISCORD_COLORS.SUCCESS,
      title: '🗑️ Conversation Cleared',
      description:
        'The conversation history has been cleared.\nThe project context remains active.',
      fields: [
        {
          name: 'Current Context',
          value: projectInfo,
          inline: true
        },
        {
          name: 'Cleared by',
          value: interaction.user.username,
          inline: true
        }
      ],
      footer: {
        text: 'Start a fresh conversation in the same project context!'
      },
      timestamp: new Date().toISOString()
    }

    await interaction.editReply({ embeds: [successEmbed] })
  } catch (error) {
    log('ERROR: Clear command failed: %o', error)
    const errorEmbed = createErrorEmbed(error, 'Clear Conversation')

    await interaction.editReply({ embeds: [errorEmbed] })
  }
}
