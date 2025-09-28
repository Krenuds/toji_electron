import { SlashCommandBuilder, ChatInputCommandInteraction } from 'discord.js'
import type { Toji } from '../../../main/toji'
import type { DiscordChatModule } from '../modules/ChatModule'
import { DISCORD_COLORS } from '../constants'

export const data = new SlashCommandBuilder()
  .setName('status')
  .setDescription('Check Toji and OpenCode connection status')

export async function execute(
  interaction: ChatInputCommandInteraction,
  toji: Toji,
  chatModule?: DiscordChatModule
): Promise<void> {
  await interaction.deferReply()

  try {
    // Check Toji readiness
    const isReady = toji.isReady()

    // Try to get current project
    let currentProject = 'Unknown'
    let sessionCount = 0
    let openCodeStatus = '❌ Disconnected'

    if (isReady) {
      try {
        currentProject = toji.getCurrentProject() || 'No project loaded'
        const sessions = await toji.listSessions()
        sessionCount = sessions.length
        openCodeStatus = '✅ Connected'
      } catch (err) {
        console.error('Error getting Toji status details:', err)
        openCodeStatus = '⚠️ Connection issues'
      }
    }

    // Get session info for this channel if available
    let channelSessionInfo = ''
    if (chatModule && interaction.channelId) {
      const sessionInfo = chatModule.getSessionInfo(interaction.channelId)
      if (sessionInfo) {
        channelSessionInfo = `\n**Channel Session:** Active (ID: ${sessionInfo.sessionId.substring(0, 8)}...)`
      } else {
        channelSessionInfo = '\n**Channel Session:** Not initialized'
      }
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
          value: openCodeStatus,
          inline: true
        },
        {
          name: 'Current Project',
          value: `\`${currentProject}\``,
          inline: false
        },
        {
          name: 'Total Sessions',
          value: sessionCount.toString(),
          inline: true
        },
        {
          name: 'Bot Uptime',
          value: formatUptime(interaction.client.uptime || 0),
          inline: true
        }
      ],
      description: `**Overall Status:** ${isReady ? 'Operational' : 'Issues Detected'}${channelSessionInfo}`,
      footer: {
        text: `Requested by ${interaction.user.username}`,
        icon_url: interaction.user.displayAvatarURL()
      },
      timestamp: new Date().toISOString()
    }

    await interaction.editReply({ embeds: [statusEmbed] })
  } catch (error) {
    console.error('Status command error:', error)

    const errorEmbed = {
      color: DISCORD_COLORS.ERROR,
      title: '❌ Status Check Failed',
      description: `Failed to retrieve status: ${error instanceof Error ? error.message : 'Unknown error'}`,
      footer: {
        text: 'Try checking the OpenCode server connection'
      }
    }

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
