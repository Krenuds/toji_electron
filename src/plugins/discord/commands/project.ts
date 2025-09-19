import { SlashCommandBuilder, ChatInputCommandInteraction, EmbedBuilder } from 'discord.js'
import type { Toji } from '../../../main/api/Toji'

export const data = new SlashCommandBuilder()
  .setName('project')
  .setDescription('Manage projects and workspaces')
  .addSubcommand((subcommand) =>
    subcommand.setName('list').setDescription('List all available projects')
  )
  .addSubcommand((subcommand) =>
    subcommand.setName('info').setDescription('Show information about the current project')
  )

export async function execute(interaction: ChatInputCommandInteraction, toji: Toji): Promise<void> {
  const subcommand = interaction.options.data[0]?.name

  switch (subcommand) {
    case 'list': {
      await interaction.deferReply({ ephemeral: true })

      try {
        const projectsResponse = await toji.project.list()
        const projects = projectsResponse.data

        if (!projects || projects.length === 0) {
          await interaction.editReply('📭 No projects found')
          return
        }

        // Create embed for better presentation
        const embed = new EmbedBuilder()
          .setColor(0x33b42f) // Toji green accent
          .setTitle('📁 Available Projects')
          .setDescription(`Found ${projects.length} project(s)`)
          .setTimestamp()

        // Add each project as a field
        projects.forEach((project, index) => {
          const name = project.id || `Project ${index + 1}`
          const path = project.worktree || 'Unknown path'
          embed.addFields({
            name: `${index + 1}. ${name}`,
            value: `\`${path}\``,
            inline: false
          })
        })

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
          .setColor(0x33b42f)
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

    default:
      await interaction.reply({
        content: '❌ Unknown subcommand',
        ephemeral: true
      })
  }
}
