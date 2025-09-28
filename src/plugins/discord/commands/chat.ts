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
  // Defer the reply since AI responses can take time
  await interaction.deferReply()

  try {
    // Get the message from the user
    const message = interaction.options.getString('message', true)

    // Check if Toji is ready
    if (!toji.isReady()) {
      await interaction.editReply({
        content: '❌ Toji is not ready. Please ensure the OpenCode server is running.'
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

    await interaction.editReply({
      content: `❌ Failed to process chat: ${errorMessage}`
    })
  }
}
