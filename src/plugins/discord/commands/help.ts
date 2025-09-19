import { SlashCommandBuilder, CommandInteraction } from 'discord.js'

export const data = new SlashCommandBuilder()
  .setName('help')
  .setDescription('Shows all available commands and how to use them')

export async function execute(interaction: CommandInteraction): Promise<void> {
  const helpEmbed = {
    color: 0x33b42f, // Toji green
    title: '🤖 Toji Bot Help',
    description: 'I&apos;m Toji, your AI coding assistant powered by OpenCode!',
    fields: [
      {
        name: '💬 Chat with me',
        value: 'Just mention me in any message and I&apos;ll respond!',
        inline: false
      },
      {
        name: '📁 /workspace',
        value: 'View or change the current workspace directory',
        inline: false
      },
      {
        name: '💼 /session',
        value: 'Manage chat sessions (list, create, clear, info)',
        inline: false
      },
      {
        name: '📂 /project',
        value: 'View project information (list, current)',
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
