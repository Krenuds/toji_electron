import { SlashCommandBuilder, ChatInputCommandInteraction } from 'discord.js'
import { DISCORD_COLORS, DEFAULT_ADMIN_ROLE_NAME, PERMISSION_MESSAGES } from '../constants'

export const data = new SlashCommandBuilder()
  .setName('help')
  .setDescription('Shows all available commands and how to use them')

export async function execute(interaction: ChatInputCommandInteraction): Promise<void> {
  const helpEmbed = {
    color: DISCORD_COLORS.TOJI_BRAND,
    title: '🤖 Toji Bot Help',
    description:
      'I&apos;m Toji, your AI coding assistant powered by OpenCode!\n\nAll commands work within **project channels** in the Toji Desktop category.',
    fields: [
      {
        name: '🔒 Permissions',
        value: [
          'Commands can only be used by:',
          `• ${PERMISSION_MESSAGES.ROLE_INFO.SERVER_OWNER}`,
          `• ${PERMISSION_MESSAGES.ROLE_INFO.ADMIN_ROLE(DEFAULT_ADMIN_ROLE_NAME)}`
        ].join('\n'),
        inline: false
      },
      {
        name: '💬 Chat with @mention',
        value:
          'Just mention me (@Toji) in any project channel and I&apos;ll respond with context awareness!',
        inline: false
      },
      {
        name: '──────────',
        value: '**Project Management**',
        inline: false
      },
      {
        name: '🚀 /init',
        value:
          'Rebuild all Discord channels from Toji projects\n• Deletes all channels in Toji Desktop category\n• Recreates channels from current projects\n• Use when syncing Discord with local projects',
        inline: false
      },
      {
        name: '📂 /project list',
        value: 'List all available projects with their paths and Discord channels',
        inline: false
      },
      {
        name: '📂 /project add',
        value:
          'Add a new project to Toji and create its Discord channel\n• **path**: Absolute path to project directory (required)\n• **name**: Custom channel name (optional)',
        inline: false
      },
      {
        name: '──────────',
        value: '**Conversation Management**',
        inline: false
      },
      {
        name: '🗑️ /clear',
        value:
          'Clear the conversation history for the current project\n• Resets session but maintains project context\n• Use in any project channel',
        inline: false
      },
      {
        name: '──────────',
        value: '**Voice Commands** (Project Channel Only)',
        inline: false
      },
      {
        name: '🎙️ /voice join',
        value:
          'Join/create the voice channel for this project\n• Must be used in a project text channel\n• Creates 🎙️-{project-name} voice channel\n• Links voice session to current project\n• One voice channel per project',
        inline: false
      },
      {
        name: '🎙️ /voice leave',
        value:
          'Leave the current voice session\n• Disconnects bot from voice channel\n• Ends voice session for this project',
        inline: false
      },
      {
        name: '🎙️ /voice status',
        value:
          'Check your active voice session\n• Shows project, duration, and connection status\n• Displays voice and text channel links',
        inline: false
      },
      {
        name: '──────────',
        value: '**System Commands**',
        inline: false
      },
      {
        name: '⚙️ /admin',
        value: `Check who has bot access\n• Shows members with **${DEFAULT_ADMIN_ROLE_NAME}** role\n• Displays server owner\n• Lists current permissions`,
        inline: false
      },
      {
        name: '❓ /help',
        value: 'Show this help message',
        inline: false
      }
    ],
    footer: {
      text: '💡 Tip: Each project channel maintains separate conversation context and can have its own voice session'
    }
  }

  await interaction.reply({ embeds: [helpEmbed] })
}
