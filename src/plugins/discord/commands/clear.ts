import { SlashCommandBuilder, ChatInputCommandInteraction } from 'discord.js'
import type { Toji } from '../../../main/toji'
import type { DiscordChatModule } from '../modules/ChatModule'
import { DISCORD_COLORS } from '../constants'

export const data = new SlashCommandBuilder()
  .setName('clear')
  .setDescription('Clear the conversation history for this channel')

export async function execute(
  interaction: ChatInputCommandInteraction,
  toji: Toji,
  chatModule?: DiscordChatModule
): Promise<void> {
  await interaction.deferReply({ ephemeral: true })

  try {
    const channelId = interaction.channelId

    // Clear the session in the chat module
    if (chatModule) {
      await chatModule.clearSession(channelId)
    }

    // Try to clear the Toji session as well
    const sessionName = interaction.guildId
      ? `discord-${interaction.guildId}-${channelId}`
      : `discord-dm-${interaction.user.id}`

    try {
      const sessions = await toji.listSessions()
      const existingSession = sessions.find((s) => s.title === sessionName)

      if (existingSession) {
        // Note: Toji doesn't have a delete session method yet,
        // so we'll just clear the module's cache
        console.log(`Cleared session cache for ${sessionName}`)
      }
    } catch (err) {
      console.error('Error checking Toji sessions:', err)
    }

    const successEmbed = {
      color: DISCORD_COLORS.SUCCESS,
      title: '🗑️ Session Cleared',
      description:
        'The conversation history for this channel has been cleared.\nA new session will be created on your next message.',
      fields: [
        {
          name: 'Channel',
          value: `<#${channelId}>`,
          inline: true
        },
        {
          name: 'Cleared by',
          value: interaction.user.username,
          inline: true
        }
      ],
      footer: {
        text: 'Start a new conversation anytime!'
      },
      timestamp: new Date().toISOString()
    }

    await interaction.editReply({ embeds: [successEmbed] })
  } catch (error) {
    console.error('Clear command error:', error)

    const errorEmbed = {
      color: DISCORD_COLORS.ERROR,
      title: '❌ Clear Failed',
      description: `Failed to clear session: ${error instanceof Error ? error.message : 'Unknown error'}`,
      footer: {
        text: 'Try again or contact support if the issue persists'
      }
    }

    await interaction.editReply({ embeds: [errorEmbed] })
  }
}
