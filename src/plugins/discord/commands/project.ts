import { SlashCommandBuilder, ChatInputCommandInteraction, EmbedBuilder } from 'discord.js'
import type { Toji } from '../../../main/api/toji'
import { DISCORD_COLORS } from '../constants'

export const data = new SlashCommandBuilder()
  .setName('project')
  .setDescription('Manage projects with enriched metadata')
  .addSubcommand((subcommand) =>
    subcommand.setName('list').setDescription('List all enriched projects with metadata')
  )
  .addSubcommand((subcommand) =>
    subcommand.setName('info').setDescription('Show detailed project information')
  )
  .addSubcommand((subcommand) =>
    subcommand.setName('recent').setDescription('Show recently accessed projects')
  )
  .addSubcommand((subcommand) =>
    subcommand.setName('stats').setDescription('Show project statistics')
  )

export async function execute(interaction: ChatInputCommandInteraction, toji: Toji): Promise<void> {
  const subcommand = interaction.options.data[0]?.name

  switch (subcommand) {
    case 'list': {
      await interaction.deferReply({ ephemeral: true })

      try {
        const enrichedProjects = await toji.getEnrichedProjects()

        if (enrichedProjects.length === 0) {
          await interaction.editReply('📭 No projects found')
          return
        }

        const embed = new EmbedBuilder()
          .setColor(DISCORD_COLORS.SUCCESS)
          .setTitle('📁 Enriched Projects')
          .setDescription(`Found ${enrichedProjects.length} project(s) with metadata`)
          .setTimestamp()

        enrichedProjects.slice(0, 10).forEach((project, index) => {
          const lastAccessed = project.lastSessionDate
            ? new Date(project.lastSessionDate).toLocaleDateString()
            : 'Never'

          embed.addFields({
            name: `${index + 1}. ${project.name}`,
            value:
              `📍 \`${project.worktree}\`\n` +
              `💡 Sessions: ${project.sessionCount}\n` +
              `📅 Last accessed: ${lastAccessed}`,
            inline: false
          })
        })

        if (enrichedProjects.length > 10) {
          embed.setFooter({ text: `Showing 10 of ${enrichedProjects.length} projects` })
        }

        await interaction.editReply({ embeds: [embed] })
      } catch (error) {
        await interaction.editReply(
          `❌ Failed to list projects: ${error instanceof Error ? error.message : 'Unknown error'}`
        )
      }
      break
    }

    case 'info': {
      await interaction.deferReply({ ephemeral: true })

      try {
        // Get current workspace info
        const currentDir = toji.workspace.getCurrentDirectory()
        const workspaceStatus = toji.workspace.getStatus()

        if (!currentDir) {
          await interaction.editReply('❌ No workspace currently active')
          return
        }

        // Try to get project info if available
        let projectInfo = 'No additional project information available'
        try {
          await toji.project.logInfo()
          projectInfo = 'Project information logged to console'
        } catch {
          // Project info might not be available
        }

        const embed = new EmbedBuilder()
          .setColor(DISCORD_COLORS.SUCCESS)
          .setTitle('📊 Current Project Information')
          .addFields(
            {
              name: 'Directory',
              value: `\`${currentDir}\``,
              inline: false
            },
            {
              name: 'Original Directory',
              value: `\`${workspaceStatus.original || 'N/A'}\``,
              inline: true
            },
            {
              name: 'Current Directory',
              value: `\`${workspaceStatus.current || 'N/A'}\``,
              inline: true
            },
            {
              name: 'Status',
              value: projectInfo,
              inline: false
            }
          )
          .setTimestamp()

        await interaction.editReply({ embeds: [embed] })
      } catch (error) {
        await interaction.editReply(
          `❌ Failed to get project info: ${error instanceof Error ? error.message : 'Unknown error'}`
        )
      }
      break
    }

    case 'recent': {
      await interaction.deferReply({ ephemeral: true })

      try {
        const enrichedProjects = await toji.getEnrichedProjects()

        // Sort by last session date
        const recentProjects = enrichedProjects
          .filter((p) => p.lastSessionDate)
          .sort((a, b) => {
            const dateA = a.lastSessionDate ? new Date(a.lastSessionDate).getTime() : 0
            const dateB = b.lastSessionDate ? new Date(b.lastSessionDate).getTime() : 0
            return dateB - dateA
          })
          .slice(0, 5)

        if (recentProjects.length === 0) {
          await interaction.editReply('📭 No recently accessed projects')
          return
        }

        const embed = new EmbedBuilder()
          .setColor(DISCORD_COLORS.SUCCESS)
          .setTitle('🕒 Recently Accessed Projects')
          .setDescription('Top 5 most recently accessed projects')
          .setTimestamp()

        recentProjects.forEach((project, index) => {
          const lastAccessed = project.lastSessionDate
            ? new Date(project.lastSessionDate).toLocaleDateString()
            : 'Never'
          const timeAgo = project.lastSessionDate
            ? getTimeAgo(new Date(project.lastSessionDate))
            : 'Never'

          embed.addFields({
            name: `${index + 1}. ${project.name}`,
            value:
              `📍 \`${project.worktree}\`\n` +
              `🕰️ ${timeAgo} (${lastAccessed})\n` +
              `💡 ${project.sessionCount} sessions`,
            inline: false
          })
        })

        await interaction.editReply({ embeds: [embed] })
      } catch (error) {
        await interaction.editReply(
          `❌ Failed to get recent projects: ${error instanceof Error ? error.message : 'Unknown error'}`
        )
      }
      break
    }

    case 'stats': {
      await interaction.deferReply({ ephemeral: true })

      try {
        const enrichedProjects = await toji.getEnrichedProjects()
        const collections = await toji.getWorkspaceCollections()
        const sessions = await toji.session.list()

        const totalSessions = sessions.data?.length || 0
        const totalProjects = enrichedProjects.length
        const activeProjects = enrichedProjects.filter((p) => (p.sessionCount ?? 0) > 0).length
        const avgSessionsPerProject =
          totalProjects > 0 ? (totalSessions / totalProjects).toFixed(1) : '0'

        const embed = new EmbedBuilder()
          .setColor(DISCORD_COLORS.SUCCESS)
          .setTitle('📊 Project Statistics')
          .setDescription('Overview of your development activity')
          .addFields(
            { name: 'Total Projects', value: totalProjects.toString(), inline: true },
            { name: 'Active Projects', value: activeProjects.toString(), inline: true },
            { name: 'Workspace Collections', value: collections.length.toString(), inline: true },
            { name: 'Total Sessions', value: totalSessions.toString(), inline: true },
            { name: 'Avg Sessions/Project', value: avgSessionsPerProject, inline: true },
            {
              name: 'Most Active Project',
              value:
                enrichedProjects.length > 0
                  ? enrichedProjects.reduce((prev, current) =>
                      (current.sessionCount ?? 0) > (prev.sessionCount ?? 0) ? current : prev
                    ).name
                  : 'None',
              inline: true
            }
          )
          .setTimestamp()

        await interaction.editReply({ embeds: [embed] })
      } catch (error) {
        await interaction.editReply(
          `❌ Failed to get stats: ${error instanceof Error ? error.message : 'Unknown error'}`
        )
      }
      break
    }

    default:
      await interaction.reply({
        content: '❌ Unknown subcommand',
        ephemeral: true
      })
  }
}

// Helper function to get time ago string
function getTimeAgo(date: Date): string {
  const seconds = Math.floor((Date.now() - date.getTime()) / 1000)
  const minutes = Math.floor(seconds / 60)
  const hours = Math.floor(minutes / 60)
  const days = Math.floor(hours / 24)

  if (days > 0) return `${days} day${days > 1 ? 's' : ''} ago`
  if (hours > 0) return `${hours} hour${hours > 1 ? 's' : ''} ago`
  if (minutes > 0) return `${minutes} minute${minutes > 1 ? 's' : ''} ago`
  return 'Just now'
}
