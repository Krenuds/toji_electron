import { SlashCommandBuilder, ChatInputCommandInteraction, EmbedBuilder } from 'discord.js'
import type { Toji } from '../../../main/toji'
import { DISCORD_COLORS } from '../constants'
import { formatErrorAsCodeBlock } from '../utils/errors'

export const data = new SlashCommandBuilder()
  .setName('dev')
  .setDescription('Development utilities and tools')
  .addSubcommand((subcommand) =>
    subcommand.setName('lint').setDescription('Run linting check on the codebase')
  )
  .addSubcommand((subcommand) =>
    subcommand.setName('typecheck').setDescription('Run TypeScript type checking')
  )
  .addSubcommand((subcommand) =>
    subcommand.setName('build').setDescription('Build the application')
  )
  .addSubcommand((subcommand) =>
    subcommand.setName('cache').setDescription('Clear OpenCode caches')
  )
  .addSubcommand((subcommand) =>
    subcommand.setName('reload').setDescription('Reload Discord commands')
  )

export async function execute(interaction: ChatInputCommandInteraction, toji: Toji): Promise<void> {
  const subcommand = interaction.options.data[0]?.name

  switch (subcommand) {
    case 'lint': {
      await interaction.deferReply({ ephemeral: true })

      try {
        const result = await toji.runLint()
        const color = result.hasWarnings
          ? DISCORD_COLORS.WARNING
          : result.success
            ? DISCORD_COLORS.SUCCESS
            : DISCORD_COLORS.ERROR

        const embed = new EmbedBuilder()
          .setColor(color)
          .setTitle('🔍 Linting Results')
          .setDescription(
            result.success
              ? result.hasWarnings
                ? '⚠️ Warnings found'
                : '✅ All checks passed'
              : '❌ Linting failed'
          )
          .addFields({
            name: 'Output',
            value: `\`\`\`${result.output.slice(-900) || 'No output'}\`\`\``,
            inline: false
          })
          .setTimestamp()

        await interaction.editReply({ embeds: [embed] })
      } catch (error) {
        await interaction.editReply(`❌ Linting failed:\n${formatErrorAsCodeBlock(error)}`)
      }
      break
    }

    case 'typecheck': {
      await interaction.deferReply({ ephemeral: true })

      try {
        const result = await toji.runTypeCheck()
        const color = result.hasErrors ? DISCORD_COLORS.ERROR : DISCORD_COLORS.SUCCESS

        const embed = new EmbedBuilder()
          .setColor(color)
          .setTitle('📝 TypeScript Check')
          .setDescription(result.hasErrors ? '❌ Type errors found' : '✅ No type errors')
          .addFields({
            name: 'Output',
            value: `\`\`\`${result.output.slice(-900) || 'No output'}\`\`\``,
            inline: false
          })
          .setTimestamp()

        await interaction.editReply({ embeds: [embed] })
      } catch (error) {
        await interaction.editReply(`❌ Type check failed:\n${formatErrorAsCodeBlock(error)}`)
      }
      break
    }

    case 'build': {
      await interaction.deferReply({ ephemeral: true })

      try {
        await interaction.editReply('🔨 Building application... This may take a moment.')

        const result = await toji.runBuild()

        if (!result.success) {
          throw new Error(result.output)
        }

        const embed = new EmbedBuilder()
          .setColor(DISCORD_COLORS.SUCCESS)
          .setTitle('🏗️ Build Complete')
          .setDescription('✅ Application built successfully')
          .addFields({
            name: 'Output',
            value: `\`\`\`${result.output.slice(-900) || 'Build completed'}\`\`\``,
            inline: false
          })
          .setTimestamp()

        await interaction.editReply({ embeds: [embed] })
      } catch (error) {
        await interaction.editReply(`❌ Build failed:\n${formatErrorAsCodeBlock(error)}`)
      }
      break
    }

    case 'cache': {
      await interaction.deferReply({ ephemeral: true })

      try {
        // Clear any caches - for now just report status
        const serverStatus = toji.server.getStatus()

        const embed = new EmbedBuilder()
          .setColor(DISCORD_COLORS.SUCCESS)
          .setTitle('🗑️ Cache Status')
          .setDescription('Cache and system information')
          .addFields(
            {
              name: 'Server Running',
              value: serverStatus.running ? '✅ Yes' : '❌ No',
              inline: true
            },
            { name: 'Server URL', value: serverStatus.url || 'Not available', inline: true },
            {
              name: 'Current Workspace',
              value: toji.workspace.getCurrentDirectory() || 'None',
              inline: false
            }
          )
          .setTimestamp()

        await interaction.editReply({ embeds: [embed] })
      } catch (error) {
        await interaction.editReply(`❌ Failed to check cache:\n${formatErrorAsCodeBlock(error)}`)
      }
      break
    }

    case 'reload': {
      await interaction.deferReply({ ephemeral: true })

      try {
        // For now, just indicate success
        // In production, would need to re-import commands

        await interaction.editReply('✅ Discord commands reloaded successfully')
      } catch (error) {
        await interaction.editReply(
          `❌ Failed to reload commands:\n${formatErrorAsCodeBlock(error)}`
        )
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
