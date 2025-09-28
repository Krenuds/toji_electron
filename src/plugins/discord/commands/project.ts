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
  .addSubcommand((subcommand) =>
    subcommand.setName('current').setDescription('Show the currently active project')
  )
  .addSubcommand((subcommand) =>
    subcommand
      .setName('switch')
      .setDescription('Switch to a different project')
      .addStringOption((option) =>
        option.setName('name').setDescription('The project name to switch to').setRequired(true)
      )
  )
  .addSubcommand((subcommand) =>
    subcommand
      .setName('add')
      .setDescription('Add a new project')
      .addStringOption((option) =>
        option
          .setName('path')
          .setDescription('The absolute path to the project directory')
          .setRequired(true)
      )
      .addStringOption((option) =>
        option
          .setName('name')
          .setDescription('Optional custom name for the project')
          .setRequired(false)
      )
  )
  .addSubcommand((subcommand) =>
    subcommand
      .setName('remove')
      .setDescription('Remove a project')
      .addStringOption((option) =>
        option.setName('name').setDescription('The project name to remove').setRequired(true)
      )
  )
  .addSubcommand((subcommand) =>
    subcommand
      .setName('import')
      .setDescription('Import all discovered Toji projects as Discord channels')
      .addBooleanOption((option) =>
        option
          .setName('confirm')
          .setDescription('Confirm bulk import of all projects')
          .setRequired(false)
      )
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

    case 'current':
      await handleCurrent(interaction, projectManager, toji)
      break

    case 'switch':
      await handleSwitch(interaction, projectManager)
      break

    case 'add':
      await handleAdd(interaction, projectManager)
      break

    case 'remove':
      await handleRemove(interaction, projectManager)
      break

    case 'import':
      await handleImport(interaction, projectManager, toji)
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
        value: 'Use `/project add` to add a project',
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

async function handleCurrent(
  interaction: ChatInputCommandInteraction,
  projectManager: DiscordProjectManager,
  toji: Toji
): Promise<void> {
  await interaction.deferReply()

  try {
    const activeProject = projectManager.getActiveProject()
    const currentPath = toji.getCurrentProjectDirectory()

    if (!activeProject && !currentPath) {
      await interaction.editReply({
        content: '❌ No active project. Use `/project switch` or type in a project channel.'
      })
      return
    }

    const embed = {
      color: DISCORD_COLORS.SUCCESS,
      title: '🟢 Current Active Project',
      fields: [
        {
          name: 'Discord Project',
          value: activeProject
            ? `**${activeProject.projectName}**\nChannel: <#${activeProject.channelId}>`
            : 'None',
          inline: true
        },
        {
          name: 'Toji Working Directory',
          value: currentPath ? `\`${currentPath}\`` : 'Not set',
          inline: true
        }
      ],
      footer: {
        text: 'Type in a project channel to auto-switch'
      },
      timestamp: new Date().toISOString()
    }

    await interaction.editReply({ embeds: [embed] })
  } catch (error) {
    await interaction.editReply({
      content:
        '❌ Failed to get current project: ' +
        (error instanceof Error ? error.message : 'Unknown error')
    })
  }
}

async function handleSwitch(
  interaction: ChatInputCommandInteraction,
  projectManager: DiscordProjectManager
): Promise<void> {
  await interaction.deferReply()

  const projectName = interaction.options.getString('name', true)

  try {
    // Find project by name
    const projects = projectManager.getProjects()
    const project = projects.find((p) => p.projectName.toLowerCase() === projectName.toLowerCase())

    if (!project) {
      await interaction.editReply({
        content: `❌ Project "${projectName}" not found. Use \`/project list\` to see available projects.`
      })
      return
    }

    // Switch to the project
    await projectManager.switchToProject(project.channelId)

    await interaction.editReply({
      content: `✅ Switched to project **${project.projectName}**\nGo to <#${project.channelId}> to start working.`
    })
  } catch (error) {
    await interaction.editReply({
      content:
        '❌ Failed to switch project: ' + (error instanceof Error ? error.message : 'Unknown error')
    })
  }
}

async function handleAdd(
  interaction: ChatInputCommandInteraction,
  projectManager: DiscordProjectManager
): Promise<void> {
  await interaction.deferReply()

  const projectPath = interaction.options.getString('path', true)
  const customName = interaction.options.getString('name') || undefined

  try {
    // Add the project
    const channel = await projectManager.addProject(projectPath, customName)

    await interaction.editReply({
      content: `✅ Project added successfully!\nChannel: <#${channel.id}>\nPath: \`${projectPath}\`\n\nThe project is now active. Start typing in the channel to interact with Toji.`
    })
  } catch (error) {
    await interaction.editReply({
      content:
        '❌ Failed to add project: ' + (error instanceof Error ? error.message : 'Unknown error')
    })
  }
}

async function handleRemove(
  interaction: ChatInputCommandInteraction,
  projectManager: DiscordProjectManager
): Promise<void> {
  await interaction.deferReply({ ephemeral: true })

  const projectName = interaction.options.getString('name', true)

  try {
    // Find project by name
    const projects = projectManager.getProjects()
    const project = projects.find((p) => p.projectName.toLowerCase() === projectName.toLowerCase())

    if (!project) {
      await interaction.editReply({
        content: `❌ Project "${projectName}" not found.`
      })
      return
    }

    // Remove the project
    await projectManager.removeProject(project.channelId)

    await interaction.editReply({
      content: `✅ Project **${projectName}** has been removed.\nThe Discord channel has been deleted.`
    })
  } catch (error) {
    await interaction.editReply({
      content:
        '❌ Failed to remove project: ' + (error instanceof Error ? error.message : 'Unknown error')
    })
  }
}

async function handleImport(
  interaction: ChatInputCommandInteraction,
  projectManager: DiscordProjectManager,
  toji: Toji
): Promise<void> {
  const confirm = interaction.options.getBoolean('confirm') || false

  if (!confirm) {
    // Show preview of what will be imported
    const tojiProjects = await toji.getAvailableProjects()
    const discordProjects = projectManager.getProjects()
    const discordPaths = new Set(discordProjects.map((p) => p.projectPath))

    // Filter out already imported projects
    const newProjects = tojiProjects.filter((p) => !discordPaths.has(p.worktree))

    if (newProjects.length === 0) {
      await interaction.reply({
        content: '✅ All discovered projects are already imported to Discord.',
        ephemeral: true
      })
      return
    }

    const embed = {
      color: DISCORD_COLORS.WARNING,
      title: '⚠️ Confirm Bulk Import',
      description: `This will create ${newProjects.length} Discord channel${newProjects.length !== 1 ? 's' : ''} for discovered projects.`,
      fields: [
        {
          name: 'Projects to Import',
          value:
            newProjects
              .slice(0, 10)
              .map((p) => {
                const name = p.worktree.split(/[/\\]/).pop() || p.worktree
                return `• **${name}**\n  \`${p.worktree}\``
              })
              .join('\n') +
            (newProjects.length > 10 ? `\n... and ${newProjects.length - 10} more` : ''),
          inline: false
        }
      ],
      footer: {
        text: 'Run /project import confirm:true to proceed'
      }
    }

    await interaction.reply({ embeds: [embed], ephemeral: true })
    return
  }

  // Perform the import
  await interaction.deferReply()

  try {
    const tojiProjects = await toji.getAvailableProjects()
    const discordProjects = projectManager.getProjects()
    const discordPaths = new Set(discordProjects.map((p) => p.projectPath))

    // Filter out already imported projects
    const newProjects = tojiProjects.filter((p) => !discordPaths.has(p.worktree))

    if (newProjects.length === 0) {
      await interaction.editReply('✅ All discovered projects are already imported to Discord.')
      return
    }

    let imported = 0
    const failed: string[] = []

    // Import each project
    for (const project of newProjects) {
      try {
        const name = project.worktree.split(/[/\\]/).pop() || project.worktree
        await projectManager.addProject(project.worktree, name)
        imported++
      } catch (error) {
        const name = project.worktree.split(/[/\\]/).pop() || project.worktree
        failed.push(`${name}: ${error instanceof Error ? error.message : 'Unknown error'}`)
      }
    }

    // Build response
    const embed = {
      color: failed.length > 0 ? DISCORD_COLORS.WARNING : DISCORD_COLORS.SUCCESS,
      title: failed.length > 0 ? '⚠️ Import Completed with Errors' : '✅ Import Successful',
      fields: [
        {
          name: 'Results',
          value: `• Imported: **${imported}** project${imported !== 1 ? 's' : ''}\n• Failed: **${failed.length}** project${failed.length !== 1 ? 's' : ''}`,
          inline: false
        }
      ],
      footer: {
        text: 'Use /project list to see all projects'
      },
      timestamp: new Date().toISOString()
    }

    if (failed.length > 0) {
      embed.fields.push({
        name: 'Failed Imports',
        value:
          failed.slice(0, 5).join('\n') +
          (failed.length > 5 ? `\n... and ${failed.length - 5} more` : ''),
        inline: false
      })
    }

    await interaction.editReply({ embeds: [embed] })
  } catch (error) {
    await interaction.editReply({
      content:
        '❌ Failed to import projects: ' +
        (error instanceof Error ? error.message : 'Unknown error')
    })
  }
}
