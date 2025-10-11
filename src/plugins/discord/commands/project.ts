import { SlashCommandBuilder, ChatInputCommandInteraction } from 'discord.js'
import type { Toji } from '../../../main/toji'
import type { DiscordProjectManager } from '../modules/DiscordProjectManager'
import { DISCORD_COLORS } from '../constants'

export const data = new SlashCommandBuilder()
  .setName('project')
  .setDescription('Manage Toji projects')
  .addSubcommand((subcommand) =>
    subcommand.setName('list').setDescription('List all available projects')
  )

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

  const subcommand = interaction.options.getSubcommand()

  switch (subcommand) {
    case 'list':
      await handleList(interaction, projectManager, toji)
      break

    default:
      await interaction.reply({
        content: '❌ Unknown subcommand',
        ephemeral: true
      })
  }
}

async function handleList(
  interaction: ChatInputCommandInteraction,
  projectManager: DiscordProjectManager,
  toji: Toji
): Promise<void> {
  await interaction.deferReply()

  try {
    // Get projects from both sources
    const discordProjects = projectManager.getProjects()
    const tojiProjects = await toji.getAvailableProjects()

    // Build embed
    const embed = {
      color: DISCORD_COLORS.TOJI_BRAND,
      title: '📁 Available Projects',
      fields: [] as Array<{ name: string; value: string; inline: boolean }>,
      footer: {
        text: `${discordProjects.length} Discord channels | ${tojiProjects.length} discovered projects`
      },
      timestamp: new Date().toISOString()
    }

    // Add Discord-managed projects
    if (discordProjects.length > 0) {
      for (const project of discordProjects) {
        const indicator = project.isActive ? '🟢' : '⚪'
        embed.fields.push({
          name: `${indicator} ${project.projectName}`,
          value: `Path: \`${project.projectPath}\`\nChannel: <#${project.channelId}>`,
          inline: false
        })
      }
    } else {
      embed.fields.push({
        name: 'No Discord Projects',
        value: 'Use `/init` to create channels from Toji projects',
        inline: false
      })
    }

    await interaction.editReply({ embeds: [embed] })
  } catch (error) {
    await interaction.editReply({
      content:
        '❌ Failed to list projects: ' + (error instanceof Error ? error.message : 'Unknown error')
    })
  }
}
