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
        name: '💬 Chat with @mention',
        value: 'Just mention me (@Toji) in any message and I&apos;ll respond!',
        inline: false
      },
      {
        name: '💬 /chat [message]',
        value: 'Send a message directly using the slash command',
        inline: false
      },
      {
        name: '❓ /help',
        value: 'Show this help message',
        inline: false
      },
      {
        name: '📊 /status',
        value: 'Check Toji and OpenCode connection status',
        inline: false
      },
      {
        name: '🗑️ /clear',
        value: 'Clear the conversation history for this channel',
        inline: false
      },
      {
        name: '🎯 /init',
        value: 'Initialize Discord channels from saved state',
        inline: false
      },
      {
        name: '🔄 /refresh',
        value: 'Refresh and sync Discord channels with state',
        inline: false
      },
      {
        name: '📂 /project [subcommand]',
        value: 'Project management (list, add, remove, switch)',
        inline: false
      }
    ],
    footer: {
      text: 'Each Discord channel maintains its own session context'
    }
  }

  await interaction.reply({ embeds: [helpEmbed] })
}
