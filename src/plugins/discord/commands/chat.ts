import { SlashCommandBuilder, ChatInputCommandInteraction } from 'discord.js'
import type { Toji } from '../../../main/toji'

export const data = new SlashCommandBuilder()
  .setName('chat')
  .setDescription('Chat with Toji AI')
  .addStringOption((option) =>
    option
      .setName('message')
      .setDescription('Your message to Toji')
      .setRequired(true)
      .setMaxLength(500)
  )

export async function execute(interaction: ChatInputCommandInteraction, toji: Toji): Promise<void> {
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
          '• Check if the OpenCode server is running\n' +
          '• Restart the Toji application\n' +
          '• Use `/status` to check the connection\n' +
          '• Contact support if the issue persists'
      })
      return
    }

    // Create a session name for this user
    const sessionName = `discord-slash-${interaction.user.id}`

    // Get or create a session for this user
    const sessions = await toji.listSessions()
    let session = sessions.find((s) => s.title === sessionName)

    if (!session) {
      // Create a new session
      session = await toji.createSession(sessionName)
    }

    // Switch to the session
    await toji.switchSession(session.id)

    // Send the message to Toji
    const response = await toji.chat(message, session.id)

    // Send the response back to Discord
    // Truncate if too long (Discord has a 2000 char limit)
    const truncatedResponse =
      response.length > 1900 ? response.substring(0, 1897) + '...' : response

    await interaction.editReply({
      content: `**Your message:** ${message}\n\n**Toji's response:**\n${truncatedResponse}`
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
        '• Restart the Toji application\n' +
        '• Check if OpenCode server is running on port 4096\n' +
        '• Use `/status` to diagnose the issue\n' +
        "• Use `/clear` to reset this channel's session"
    } else if (errorMessage.includes('session')) {
      helpfulMessage +=
        '**Session error detected**\n\n' +
        '**Try these solutions:**\n' +
        "• Use `/clear` to reset this channel's session\n" +
        '• Try again in a few seconds\n' +
        '• Check `/status` for system health'
    } else {
      helpfulMessage +=
        `**Error:** ${errorMessage}\n\n` +
        '**General solutions:**\n' +
        '• Try again in a few seconds\n' +
        '• Use `/status` to check system health\n' +
        '• Use `/clear` if the session seems stuck\n' +
        '• Contact support with the error message'
    }

    await interaction.editReply({
      content: helpfulMessage
    })
  }
}
