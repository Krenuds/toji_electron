import { SlashCommandBuilder, CommandInteraction } from 'discord.js'
import type { Toji } from '../../../main/api/Toji'

export const data = new SlashCommandBuilder()
  .setName('workspace')
  .setDescription('Manage the current workspace')
  .addSubcommand((subcommand) =>
    subcommand.setName('current').setDescription('Show the current workspace directory')
  )
  .addSubcommand((subcommand) =>
    subcommand
      .setName('change')
      .setDescription('Change to a different workspace')
      .addStringOption((option) =>
        option.setName('path').setDescription('The directory path to switch to').setRequired(true)
      )
  )

export async function execute(interaction: CommandInteraction, toji: Toji): Promise<void> {
  const subcommand = interaction.options.data[0]?.name

  switch (subcommand) {
    case 'current': {
      const workspace = toji.workspace.getCurrentDirectory()
      await interaction.reply({
        content: workspace
          ? `📁 Current workspace: \`${workspace}\``
          : '❌ No workspace currently set',
        ephemeral: true
      })
      break
    }

    case 'change': {
      const path = interaction.options.data[0]?.options?.[0]?.value as string

      // Defer reply since this might take a moment
      await interaction.deferReply({ ephemeral: true })

      try {
        const result = await toji.changeWorkspace(path)
        await interaction.editReply({
          content:
            `✅ Workspace changed to: \`${path}\`\n` +
            `• New workspace: ${result.isNew ? 'Yes' : 'No'}\n` +
            `• Has Git: ${result.hasGit ? 'Yes' : 'No'}\n` +
            `• Session ID: ${result.sessionId}`
        })
      } catch (error) {
        await interaction.editReply({
          content: `❌ Failed to change workspace: ${
            error instanceof Error ? error.message : 'Unknown error'
          }`
        })
      }
      break
    }

    default:
      await interaction.reply({
        content: '❌ Unknown subcommand',
        ephemeral: true
      })
  }
}
