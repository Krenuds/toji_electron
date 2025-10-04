import { SlashCommandBuilder, ChatInputCommandInteraction } from 'discord.js'
import { DISCORD_COLORS, DEFAULT_ADMIN_ROLE_NAME } from '../constants'

export const data = new SlashCommandBuilder()
  .setName('admin')
  .setDescription('Check who has access to use bot commands')

export async function execute(interaction: ChatInputCommandInteraction): Promise<void> {
  const { guild } = interaction

  if (!guild) {
    await interaction.reply({
      content: '❌ This command can only be used in a server',
      ephemeral: true
    })
    return
  }

  await interaction.deferReply()

  const adminRole = guild.roles.cache.find((role) => role.name === DEFAULT_ADMIN_ROLE_NAME)

  if (!adminRole) {
    await interaction.editReply({
      embeds: [
        {
          color: DISCORD_COLORS.WARNING,
          title: '⚠️ Role Not Found',
          description: `The **${DEFAULT_ADMIN_ROLE_NAME}** role hasn't been created yet.`,
          fields: [
            {
              name: 'Current Access',
              value: 'Only the server owner can use bot commands right now.'
            },
            {
              name: 'What Happened?',
              value: `The bot should create this role automatically. Make sure the bot has **Manage Roles** permission.`
            },
            {
              name: 'Manual Setup',
              value: `You can also create a role named **${DEFAULT_ADMIN_ROLE_NAME}** manually through Server Settings.`
            }
          ]
        }
      ]
    })
    return
  }

  // Get list of members with the role
  const membersWithRole = adminRole.members
    .filter((member) => member.id !== guild.ownerId) // Exclude owner (they have access anyway)
    .map((member) => `<@${member.id}>`)
    .slice(0, 20) // Limit to 20 for display

  const totalMembers = adminRole.members.size
  const nonOwnerMembers = adminRole.members.filter((m) => m.id !== guild.ownerId).size

  await interaction.editReply({
    embeds: [
      {
        color: DISCORD_COLORS.SUCCESS,
        title: '✅ Bot Access Status',
        description: `The **${adminRole.name}** role controls who can use bot commands.`,
        fields: [
          {
            name: 'Server Owner',
            value: `<@${guild.ownerId}> (automatic access)`,
            inline: false
          },
          {
            name: `Members with ${adminRole.name} Role`,
            value:
              nonOwnerMembers > 0
                ? membersWithRole.join(', ') +
                  (nonOwnerMembers > 20 ? `\n...and ${nonOwnerMembers - 20} more` : '')
                : 'No additional members - assign the role through Server Settings',
            inline: false
          },
          {
            name: 'Total Access',
            value: `${totalMembers} member${totalMembers !== 1 ? 's' : ''}`,
            inline: true
          },
          {
            name: 'Role Color',
            value: adminRole.hexColor,
            inline: true
          },
          {
            name: 'Grant Access',
            value: `Right-click user → Roles → Check **${adminRole.name}**`,
            inline: false
          }
        ]
      }
    ]
  })
}
