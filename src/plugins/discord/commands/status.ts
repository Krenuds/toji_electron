import { SlashCommandBuilder, CommandInteraction } from 'discord.js'
import type { Toji } from '../../../main/api/Toji'

export const data = new SlashCommandBuilder()
  .setName('status')
  .setDescription('Check Toji system status')

export async function execute(interaction: CommandInteraction, toji: Toji): Promise<void> {
  const status = toji.getStatus()

  const embed = {
    color: toji.isReady() ? 0x33b42f : 0xef4444, // Green if ready, red if not
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
