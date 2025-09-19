import { SlashCommandBuilder, CommandInteraction } from 'discord.js'
import type { Toji } from '../../../main/api/Toji'
import type { DiscordChatModule } from '../modules/ChatModule'

export const data = new SlashCommandBuilder()
  .setName('session')
  .setDescription('Manage chat sessions')
  .addSubcommand((subcommand) =>
    subcommand.setName('list').setDescription('List all active sessions')
  )
  .addSubcommand((subcommand) =>
    subcommand
      .setName('new')
      .setDescription('Create a new session')
      .addStringOption((option) =>
        option.setName('name').setDescription('Name for the new session').setRequired(false)
      )
  )
  .addSubcommand((subcommand) =>
    subcommand.setName('clear').setDescription('Clear the session for this channel')
  )
  .addSubcommand((subcommand) =>
    subcommand.setName('info').setDescription('Show information about the current channel session')
  )

export async function execute(
  interaction: CommandInteraction,
  toji: Toji,
  chatModule?: DiscordChatModule
): Promise<void> {
  const subcommand = interaction.options.data[0]?.name

  switch (subcommand) {
    case 'list': {
      await interaction.deferReply({ ephemeral: true })

      try {
        const sessionsResponse = await toji.session.list()
        const sessions = sessionsResponse.data

        if (sessions.length === 0) {
          await interaction.editReply('📭 No active sessions')
        } else {
          const sessionList = sessions.map((s, i) => `${i + 1}. **Session ${s.id}**`).join('\n')
          await interaction.editReply(`📋 **Active Sessions:**\n${sessionList}`)
        }
      } catch (error) {
        await interaction.editReply(
          `❌ Error listing sessions: ${error instanceof Error ? error.message : 'Unknown error'}`
        )
      }
      break
    }

    case 'new': {
      const name =
        (interaction.options.data[0]?.options?.[0]?.value as string) ||
        `Discord Session ${Date.now()}`

      await interaction.deferReply({ ephemeral: true })

      try {
        const session = await toji.session.create(name)
        await interaction.editReply(`✅ Created new session: **${name}**\nID: \`${session.id}\``)
      } catch (error) {
        await interaction.editReply(
          `❌ Error creating session: ${error instanceof Error ? error.message : 'Unknown error'}`
        )
      }
      break
    }

    case 'clear': {
      if (!chatModule) {
        await interaction.reply({
          content: '❌ Chat module not available',
          ephemeral: true
        })
        return
      }

      await chatModule.clearSession(interaction.channelId)
      await interaction.reply({
        content: '✅ Cleared session for this channel',
        ephemeral: true
      })
      break
    }

    case 'info': {
      if (!chatModule) {
        await interaction.reply({
          content: '❌ Chat module not available',
          ephemeral: true
        })
        return
      }

      const session = chatModule.getSessionInfo(interaction.channelId)
      if (session) {
        const embed = {
          color: 0x33b42f,
          title: '📊 Channel Session Info',
          fields: [
            {
              name: 'Session ID',
              value: `\`${session.sessionId}\``,
              inline: true
            },
            {
              name: 'Channel',
              value: `<#${session.channelId}>`,
              inline: true
            },
            {
              name: 'Last Activity',
              value: session.lastActivity.toLocaleTimeString(),
              inline: true
            },
            {
              name: 'Context Size',
              value: `${session.context.length} messages`,
              inline: true
            }
          ]
        }
        await interaction.reply({ embeds: [embed], ephemeral: true })
      } else {
        await interaction.reply({
          content: '❌ No active session in this channel',
          ephemeral: true
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
