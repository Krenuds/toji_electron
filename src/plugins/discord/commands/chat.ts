import { SlashCommandBuilder, ChatInputCommandInteraction } from 'discord.js'
import type { Toji } from '../../../main/toji'
import type { DiscordProjectManager } from '../modules/DiscordProjectManager'

export const data = new SlashCommandBuilder()
  .setName('chat')
  .setDescription('Chat with Toji AI using the current project context')
  .addStringOption((option) =>
    option
      .setName('message')
      .setDescription('Your message to Toji')
      .setRequired(true)
      .setMaxLength(500)
  )

export async function execute(
  interaction: ChatInputCommandInteraction,
  toji: Toji,
  projectManager?: DiscordProjectManager
): Promise<void> {
  // Show typing indicator while processing
  await interaction.deferReply()

  // Also send typing to channel if possible
  try {
    if (interaction.channel && 'sendTyping' in interaction.channel) {
      await interaction.channel.sendTyping()
    }
  } catch {
    // Ignore typing errors
  }

  try {
    // Get the message from the user
    const message = interaction.options.getString('message', true)

    // Check if Toji is ready
    if (!toji.isReady()) {
      await interaction.editReply({
        content:
          '❌ **Toji is not ready**\n\n' +
          '**Possible solutions:**\n' +
          '• Select a project first using `/project switch`\n' +
          '• Or type in a project channel in the Toji Desktop category\n' +
          '• Use `/status` to check the connection\n' +
          '• Restart the Toji application if needed'
      })
      return
    }

    // Get current project for context
    const currentProject = projectManager?.getActiveProject()
    const projectInfo = currentProject ? `\n*Using project: ${currentProject.projectName}*\n` : ''

    // Send the message to Toji using current project context
    const response = await toji.chat(message)

    // Send the response back to Discord
    // Truncate if too long (Discord has a 2000 char limit)
    const truncatedResponse =
      response.length > 1800 ? response.substring(0, 1797) + '...' : response

    await interaction.editReply({
      content: `**Your message:** ${message}${projectInfo}\n**Toji's response:**\n${truncatedResponse}`
    })
  } catch (error) {
    console.error('Chat command error:', error)

    const errorMessage = error instanceof Error ? error.message : 'An unknown error occurred'

    // Provide helpful error messages based on the error type
    let helpfulMessage = '❌ **Failed to process your message**\n\n'

    if (errorMessage.includes('No response data') || errorMessage.includes('ECONNREFUSED')) {
      helpfulMessage +=
        '**OpenCode server connection issue detected**\n\n' +
        '**Try these solutions:**\n' +
        '• Select a project with `/project switch`\n' +
        '• Check if a project is active with `/project current`\n' +
        '• Use `/status` to diagnose the issue\n' +
        '• Restart the Toji application'
    } else if (errorMessage.includes('not connected')) {
      helpfulMessage +=
        '**No active project**\n\n' +
        '**Solutions:**\n' +
        '• Use `/project add [path]` to add a project\n' +
        '• Use `/project switch [name]` to switch projects\n' +
        '• Or type directly in a project channel'
    } else {
      helpfulMessage +=
        `**Error:** ${errorMessage}\n\n` +
        '**General solutions:**\n' +
        '• Check `/project current` to see active project\n' +
        '• Use `/status` to check system health\n' +
        '• Use `/clear` to reset conversation\n' +
        '• Try again in a few seconds'
    }

    await interaction.editReply({
      content: helpfulMessage
    })
  }
}
