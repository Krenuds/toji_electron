import { SlashCommandBuilder, ChatInputCommandInteraction } from 'discord.js'
import { DISCORD_COLORS } from '../constants'

export const data = new SlashCommandBuilder()
  .setName('help')
  .setDescription('Shows all available commands and how to use them')

export async function execute(interaction: ChatInputCommandInteraction): Promise<void> {
  const helpEmbed = {
    color: DISCORD_COLORS.TOJI_BRAND,
    title: '🤖 Toji Bot Help',
    description: 'I&apos;m Toji, your AI coding assistant powered by OpenCode!',
    fields: [
      {
        name: '💬 Chat with me',
        value: 'Just mention me in any message and I&apos;ll respond!',
        inline: false
      },
      {
        name: '📁 /project',
        value: 'View or change the current project directory',
        inline: false
      },
      {
        name: '💼 /session',
        value: 'Manage chat sessions (list, create, clear, info)',
        inline: false
      },
      {
        name: '📊 /status',
        value: 'Check Toji system status',
        inline: false
      }
    ],
    footer: {
      text: 'Each Discord channel maintains its own session context'
    }
  }

  await interaction.reply({ embeds: [helpEmbed] })
}
