import { SlashCommandBuilder, ChatInputCommandInteraction } from 'discord.js'
import type { Toji } from '../../../main/api/toji'
import { getStatusColor } from '../constants'

export const data = new SlashCommandBuilder()
  .setName('status')
  .setDescription('Check Toji system status')

export async function execute(interaction: ChatInputCommandInteraction, toji: Toji): Promise<void> {
  const status = toji.getStatus()

  const embed = {
    color: getStatusColor(toji.isReady()),
    title: '🤖 Toji System Status',
    fields: [
      {
        name: 'Server',
        value: status.server.running ? '✅ Running' : '❌ Stopped',
        inline: true
      },
      {
        name: 'Client',
        value: status.client.connected ? '✅ Connected' : '❌ Disconnected',
        inline: true
      },
      {
        name: 'Ready',
        value: toji.isReady() ? '✅ Ready' : '❌ Not Ready',
        inline: true
      },
      {
        name: 'Workspace',
        value: status.workspace.current ? `\`${status.workspace.current}\`` : 'None',
        inline: false
      }
    ],
    footer: {
      text: status.server.url ? `Server URL: ${status.server.url}` : 'Server not running'
    },
    timestamp: new Date().toISOString()
  }

  await interaction.reply({ embeds: [embed], ephemeral: true })
}
