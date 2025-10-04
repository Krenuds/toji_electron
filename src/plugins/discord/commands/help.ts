import { SlashCommandBuilder, ChatInputCommandInteraction } from 'discord.js'
import { DISCORD_COLORS, DEFAULT_ADMIN_ROLE_NAME, PERMISSION_MESSAGES } from '../constants'

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
        value: 'Just mention me (@Toji) in any message and I&apos;ll respond!',
        inline: false
      },
      {
        name: '❓ /help',
        value: 'Show this help message',
        inline: false
      },
      {
        name: '🗑️ /clear',
        value: 'Clear the conversation history for this channel',
        inline: false
      },
      {
        name: '🚀 /init',
        value:
          'Rebuild all Discord channels from scratch (deletes all channels in Toji Desktop category and recreates from current Toji projects)',
        inline: false
      },
      {
        name: '📂 /project [subcommand]',
        value: 'Project management (list, add - coming soon)',
        inline: false
      },
      {
        name: '⚙️ /admin [subcommand] (Owner Only)',
        value: [
          '**setup** - Create the Toji Admin role automatically',
          '**status** - Check current permission setup',
          '**grant @user** - Give bot access to a user',
          '**revoke @user** - Remove bot access from a user'
        ].join('\n'),
        inline: false
      }
    ],
    footer: {
      text: 'Each Discord channel maintains its own session context'
    }
  }

  const isOwner = interaction.guild && interaction.user.id === interaction.guild.ownerId

  await interaction.reply({
    embeds: [helpEmbed],
    content: isOwner
      ? '💡 **Tip:** Use `/admin setup` to automatically create the admin role and manage permissions!'
      : undefined
  })
}
