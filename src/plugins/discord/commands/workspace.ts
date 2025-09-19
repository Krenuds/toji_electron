import { SlashCommandBuilder, ChatInputCommandInteraction, EmbedBuilder } from 'discord.js'
import type { Toji } from '../../../main/api/toji'

export const data = new SlashCommandBuilder()
  .setName('workspace')
  .setDescription('Manage workspaces and collections')
  .addSubcommand((subcommand) =>
    subcommand.setName('current').setDescription('Show the current workspace directory')
  )
  .addSubcommand((subcommand) =>
    subcommand.setName('list').setDescription('List all workspace collections')
  )
  .addSubcommand((subcommand) =>
    subcommand
      .setName('switch')
      .setDescription('Switch to a different workspace')
      .addStringOption((option) =>
        option.setName('path').setDescription('The directory path to switch to').setRequired(true)
      )
  )
  .addSubcommand((subcommand) =>
    subcommand
      .setName('inspect')
      .setDescription('Inspect a workspace without switching to it')
      .addStringOption((option) =>
        option.setName('path').setDescription('The directory path to inspect').setRequired(true)
      )
  )
  .addSubcommand((subcommand) =>
    subcommand
      .setName('discover')
      .setDescription('Discover projects in a directory')
      .addStringOption((option) =>
        option.setName('path').setDescription('The directory to search (optional)')
      )
  )

export async function execute(interaction: ChatInputCommandInteraction, toji: Toji): Promise<void> {
  const subcommand = interaction.options.data[0]?.name

  switch (subcommand) {
    case 'current': {
      const workspace = toji.workspace.getCurrentDirectory()
      await interaction.reply({
        content: workspace
          ? `📁 Current workspace: \`${workspace}\``
          : '❌ No workspace currently set',
        ephemeral: true
      })
      break
    }

    case 'list': {
      await interaction.deferReply({ ephemeral: true })

      try {
        const collections = await toji.getWorkspaceCollections()

        if (collections.length === 0) {
          await interaction.editReply('📭 No workspace collections found')
          return
        }

        const embed = new EmbedBuilder()
          .setColor(0x33b42f)
          .setTitle('📁 Workspace Collections')
          .setDescription(`Found ${collections.length} workspace collection(s)`)
          .setTimestamp()

        collections.forEach((collection, index) => {
          const projectList = collection.projects
            .map((p) => `• ${p.name} (${p.sessionCount} sessions)`)
            .join('\n')

          embed.addFields({
            name: `${index + 1}. ${collection.name}`,
            value: `📍 \`${collection.baseDirectory}\`\n${projectList || 'No projects'}`,
            inline: false
          })
        })

        await interaction.editReply({ embeds: [embed] })
      } catch (error) {
        await interaction.editReply(
          `❌ Failed to list collections: ${error instanceof Error ? error.message : 'Unknown error'}`
        )
      }
      break
    }

    case 'switch': {
      const path = interaction.options.data[0]?.options?.[0]?.value as string

      await interaction.deferReply({ ephemeral: true })

      try {
        const result = await toji.changeWorkspace(path)
        await interaction.editReply({
          content:
            `✅ Workspace switched to: \`${path}\`\n` +
            `• New workspace: ${result.isNew ? 'Yes' : 'No'}\n` +
            `• Has Git: ${result.hasGit ? 'Yes' : 'No'}\n` +
            `• Session ID: ${result.sessionId}`
        })
      } catch (error) {
        await interaction.editReply({
          content: `❌ Failed to switch workspace: ${
            error instanceof Error ? error.message : 'Unknown error'
          }`
        })
      }
      break
    }

    case 'inspect': {
      const path = interaction.options.data[0]?.options?.[0]?.value as string

      await interaction.deferReply({ ephemeral: true })

      try {
        const info = await toji.workspace.inspect(path)

        const embed = new EmbedBuilder()
          .setColor(info.exists ? 0x33b42f : 0xff0000)
          .setTitle('🔍 Workspace Inspection')
          .setDescription(`Path: \`${path}\``)
          .addFields(
            { name: 'Exists', value: info.exists ? '✅ Yes' : '❌ No', inline: true },
            { name: 'Has Git', value: info.hasGit ? '✅ Yes' : '❌ No', inline: true },
            {
              name: 'OpenCode Config',
              value: info.hasOpenCodeConfig ? '✅ Yes' : '❌ No',
              inline: true
            },
            { name: 'Has .gitignore', value: info.hasGitignore ? '✅ Yes' : '❌ No', inline: true }
          )
          .setTimestamp()

        await interaction.editReply({ embeds: [embed] })
      } catch (error) {
        await interaction.editReply(
          `❌ Failed to inspect workspace: ${error instanceof Error ? error.message : 'Unknown error'}`
        )
      }
      break
    }

    case 'discover': {
      const path = interaction.options.data[0]?.options?.[0]?.value as string | undefined

      await interaction.deferReply({ ephemeral: true })

      try {
        const projects = await toji.discoverProjects(path)

        if (projects.length === 0) {
          await interaction.editReply('📭 No projects discovered')
          return
        }

        const embed = new EmbedBuilder()
          .setColor(0x33b42f)
          .setTitle('🔎 Discovered Projects')
          .setDescription(`Found ${projects.length} project(s) in ${path || 'current directory'}`)
          .setTimestamp()

        projects.slice(0, 10).forEach((project, index) => {
          const badges: string[] = []
          if (project.hasGit) badges.push('Git')
          if (project.projectType && project.projectType !== 'unknown')
            badges.push(project.projectType)

          embed.addFields({
            name: `${index + 1}. ${project.name}`,
            value: `📍 \`${project.path}\`\n🏷️ ${badges.join(', ') || 'No type detected'}`,
            inline: false
          })
        })

        if (projects.length > 10) {
          embed.setFooter({ text: `Showing 10 of ${projects.length} projects` })
        }

        await interaction.editReply({ embeds: [embed] })
      } catch (error) {
        await interaction.editReply(
          `❌ Failed to discover projects: ${error instanceof Error ? error.message : 'Unknown error'}`
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
