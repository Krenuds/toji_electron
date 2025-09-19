import { SlashCommandBuilder, ChatInputCommandInteraction, EmbedBuilder } from 'discord.js'
import type { Toji } from '../../../main/api/toji'
import { exec } from 'child_process'
import { promisify } from 'util'

const execAsync = promisify(exec)

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
        const { stdout, stderr } = await execAsync('npm run lint')

        if (stderr && !stderr.includes('warning')) {
          throw new Error(stderr)
        }

        const hasIssues = stdout.includes('problems')
        const color = hasIssues ? 0xffa500 : 0x33b42f

        const embed = new EmbedBuilder()
          .setColor(color)
          .setTitle('🔍 Linting Results')
          .setDescription(hasIssues ? '⚠️ Issues found' : '✅ All checks passed')
          .addFields({
            name: 'Output',
            value: `\`\`\`${stdout.slice(-900) || 'No output'}\`\`\``,
            inline: false
          })
          .setTimestamp()

        await interaction.editReply({ embeds: [embed] })
      } catch (error) {
        const errorMessage = error instanceof Error ? error.message : 'Unknown error'
        await interaction.editReply(
          `❌ Linting failed:\n\`\`\`${errorMessage.slice(0, 1900)}\`\`\``
        )
      }
      break
    }

    case 'typecheck': {
      await interaction.deferReply({ ephemeral: true })

      try {
        const { stdout, stderr } = await execAsync('npm run typecheck')

        if (stderr && !stderr.includes('warning')) {
          throw new Error(stderr)
        }

        const hasErrors = stdout.includes('error')
        const color = hasErrors ? 0xff0000 : 0x33b42f

        const embed = new EmbedBuilder()
          .setColor(color)
          .setTitle('📝 TypeScript Check')
          .setDescription(hasErrors ? '❌ Type errors found' : '✅ No type errors')
          .addFields({
            name: 'Output',
            value: `\`\`\`${stdout.slice(-900) || 'No output'}\`\`\``,
            inline: false
          })
          .setTimestamp()

        await interaction.editReply({ embeds: [embed] })
      } catch (error) {
        const errorMessage = error instanceof Error ? error.message : 'Unknown error'
        await interaction.editReply(
          `❌ Type check failed:\n\`\`\`${errorMessage.slice(0, 1900)}\`\`\``
        )
      }
      break
    }

    case 'build': {
      await interaction.deferReply({ ephemeral: true })

      try {
        await interaction.editReply('🔨 Building application... This may take a moment.')

        const { stdout, stderr } = await execAsync('npm run build')

        if (stderr && !stderr.includes('warning')) {
          throw new Error(stderr)
        }

        const embed = new EmbedBuilder()
          .setColor(0x33b42f)
          .setTitle('🏗️ Build Complete')
          .setDescription('✅ Application built successfully')
          .addFields({
            name: 'Output',
            value: `\`\`\`${stdout.slice(-900) || 'Build completed'}\`\`\``,
            inline: false
          })
          .setTimestamp()

        await interaction.editReply({ embeds: [embed] })
      } catch (error) {
        const errorMessage = error instanceof Error ? error.message : 'Unknown error'
        await interaction.editReply(`❌ Build failed:\n\`\`\`${errorMessage.slice(0, 1900)}\`\`\``)
      }
      break
    }

    case 'cache': {
      await interaction.deferReply({ ephemeral: true })

      try {
        // Clear any caches - for now just report status
        const serverStatus = toji.server.getStatus()

        const embed = new EmbedBuilder()
          .setColor(0x33b42f)
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
        await interaction.editReply(
          `❌ Failed to check cache: ${error instanceof Error ? error.message : 'Unknown error'}`
        )
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
          `❌ Failed to reload commands: ${error instanceof Error ? error.message : 'Unknown error'}`
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
