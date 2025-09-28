import { SlashCommandBuilder, ChatInputCommandInteraction } from 'discord.js'
import type { Toji } from '../../../main/toji'
import type { DiscordProjectManager } from '../modules/DiscordProjectManager'
import { DISCORD_COLORS } from '../constants'
import { createFileDebugLogger } from '../../../main/utils/logger'
import { createErrorEmbed } from '../utils/errors'

const log = createFileDebugLogger('discord:commands:status')

export const data = new SlashCommandBuilder()
  .setName('status')
  .setDescription('Check Toji and OpenCode connection status')

export async function execute(
  interaction: ChatInputCommandInteraction,
  toji: Toji,
  projectManager?: DiscordProjectManager
): Promise<void> {
  await interaction.deferReply()

  try {
    // Check Toji readiness
    const isReady = toji.isReady()

    // Try to get current project and server info
    let currentProject = 'None'
    let serverStatus = '❌ Disconnected'
    let activeServers = 0

    if (isReady) {
      try {
        currentProject = toji.getCurrentProjectDirectory() || 'No project loaded'
        const servers = toji.getAllServers()
        activeServers = servers.length
        serverStatus = '✅ Connected'
      } catch (err) {
        log('ERROR: Failed to get Toji status details: %o', err)
        serverStatus = '⚠️ Connection issues'
      }
    }

    // Get Discord project info
    let discordProjectInfo = ''
    if (projectManager) {
      const activeProject = projectManager.getActiveProject()
      const totalProjects = projectManager.getProjects().length

      if (activeProject) {
        discordProjectInfo = `\n**Discord Active:** ${activeProject.projectName} (<#${activeProject.channelId}>)`
      }
      discordProjectInfo += `\n**Total Projects:** ${totalProjects} channels`
    }

    // Build status embed
    const statusEmbed = {
      color: isReady ? DISCORD_COLORS.SUCCESS : DISCORD_COLORS.ERROR,
      title: '📊 Toji Status',
      fields: [
        {
          name: 'Toji Core',
          value: isReady ? '✅ Ready' : '❌ Not Ready',
          inline: true
        },
        {
          name: 'OpenCode Server',
          value: serverStatus,
          inline: true
        },
        {
          name: 'Active Servers',
          value: activeServers.toString(),
          inline: true
        },
        {
          name: 'Current Project Path',
          value: currentProject !== 'None' ? `\`${currentProject}\`` : 'No project active',
          inline: false
        },
        {
          name: 'Bot Uptime',
          value: formatUptime(interaction.client.uptime || 0),
          inline: true
        }
      ],
      description: `**Overall Status:** ${isReady ? 'Operational' : 'Issues Detected'}${discordProjectInfo}`,
      footer: {
        text: `Requested by ${interaction.user.username}`,
        icon_url: interaction.user.displayAvatarURL()
      },
      timestamp: new Date().toISOString()
    }

    await interaction.editReply({ embeds: [statusEmbed] })
  } catch (error) {
    log('ERROR: Status command failed: %o', error)
    const errorEmbed = createErrorEmbed(error, 'Status Check')

    await interaction.editReply({ embeds: [errorEmbed] })
  }
}

function formatUptime(ms: number): string {
  const seconds = Math.floor(ms / 1000)
  const minutes = Math.floor(seconds / 60)
  const hours = Math.floor(minutes / 60)
  const days = Math.floor(hours / 24)

  if (days > 0) return `${days}d ${hours % 24}h`
  if (hours > 0) return `${hours}h ${minutes % 60}m`
  if (minutes > 0) return `${minutes}m ${seconds % 60}s`
  return `${seconds}s`
}
