import { SlashCommandBuilder, ChatInputCommandInteraction } from 'discord.js'
import { DISCORD_COLORS, DEFAULT_ADMIN_ROLE_NAME } from '../constants'
import { createFileDebugLogger } from '../../../main/utils/logger'

const log = createFileDebugLogger('discord:admin-command')

export const data = new SlashCommandBuilder()
  .setName('admin')
  .setDescription('Admin commands for managing bot permissions (Owner only)')
  .addSubcommand((subcommand) =>
    subcommand.setName('setup').setDescription('Create the Toji Admin role automatically')
  )
  .addSubcommand((subcommand) =>
    subcommand.setName('status').setDescription('Check current permission setup')
  )
  .addSubcommand((subcommand) =>
    subcommand
      .setName('grant')
      .setDescription('Grant Toji Admin role to a user')
      .addUserOption((option) =>
        option.setName('user').setDescription('User to grant access to').setRequired(true)
      )
  )
  .addSubcommand((subcommand) =>
    subcommand
      .setName('revoke')
      .setDescription('Revoke Toji Admin role from a user')
      .addUserOption((option) =>
        option.setName('user').setDescription('User to revoke access from').setRequired(true)
      )
  )

export async function execute(interaction: ChatInputCommandInteraction): Promise<void> {
  const { guild, user } = interaction

  if (!guild) {
    await interaction.reply({
      content: '❌ This command can only be used in a server',
      ephemeral: true
    })
    return
  }

  // Only server owner can use admin commands
  if (user.id !== guild.ownerId) {
    await interaction.reply({
      embeds: [
        {
          color: DISCORD_COLORS.ERROR,
          title: '🚫 Owner Only',
          description: 'Only the server owner can use admin commands.',
          fields: [
            {
              name: 'Current Server Owner',
              value: `<@${guild.ownerId}>`
            }
          ]
        }
      ],
      ephemeral: true
    })
    return
  }

  const subcommand = interaction.options.getSubcommand()

  switch (subcommand) {
    case 'setup':
      await handleSetup(interaction, guild)
      break

    case 'status':
      await handleStatus(interaction, guild)
      break

    case 'grant':
      await handleGrant(interaction, guild)
      break

    case 'revoke':
      await handleRevoke(interaction, guild)
      break

    default:
      await interaction.reply({
        content: '❌ Unknown subcommand',
        ephemeral: true
      })
  }
}

async function handleSetup(
  interaction: ChatInputCommandInteraction,
  guild: ChatInputCommandInteraction['guild']
): Promise<void> {
  if (!guild) return

  await interaction.deferReply({ ephemeral: true })

  try {
    // Check if role already exists
    const existingRole = guild.roles.cache.find((role) => role.name === DEFAULT_ADMIN_ROLE_NAME)

    if (existingRole) {
      await interaction.editReply({
        embeds: [
          {
            color: DISCORD_COLORS.INFO,
            title: '✅ Role Already Exists',
            description: `The **${DEFAULT_ADMIN_ROLE_NAME}** role already exists in this server.`,
            fields: [
              {
                name: 'Role Information',
                value: [
                  `**Name:** ${existingRole.name}`,
                  `**ID:** ${existingRole.id}`,
                  `**Color:** ${existingRole.hexColor}`,
                  `**Members:** ${existingRole.members.size}`
                ].join('\n')
              },
              {
                name: 'Next Steps',
                value: `Use \`/admin grant @user\` to give users access to the bot.`
              }
            ]
          }
        ]
      })
      return
    }

    // Create the role
    log('Creating Toji Admin role for guild %s', guild.id)
    const newRole = await guild.roles.create({
      name: DEFAULT_ADMIN_ROLE_NAME,
      color: 0x33b42f, // Toji brand green
      reason: 'Created by Toji Bot for permission management',
      permissions: [] // No Discord permissions by default - only for bot access
    })

    log('Successfully created role %s (%s)', newRole.name, newRole.id)

    await interaction.editReply({
      embeds: [
        {
          color: DISCORD_COLORS.SUCCESS,
          title: '✅ Role Created Successfully',
          description: `The **${DEFAULT_ADMIN_ROLE_NAME}** role has been created!`,
          fields: [
            {
              name: 'Role Information',
              value: [
                `**Name:** ${newRole.name}`,
                `**ID:** ${newRole.id}`,
                `**Color:** Toji Green 🟢`
              ].join('\n')
            },
            {
              name: 'What This Role Does',
              value: 'Members with this role can use all Toji bot commands.'
            },
            {
              name: 'Grant Access',
              value: `Use \`/admin grant @user\` to give users this role.`
            },
            {
              name: 'Manual Assignment',
              value: 'You can also assign it manually through Server Settings → Roles.'
            }
          ],
          footer: {
            text: 'The role has no Discord permissions - it only controls bot access'
          }
        }
      ]
    })
  } catch (error) {
    log('ERROR: Failed to create role: %o', error)
    await interaction.editReply({
      embeds: [
        {
          color: DISCORD_COLORS.ERROR,
          title: '❌ Failed to Create Role',
          description: 'Could not create the admin role. Please check bot permissions.',
          fields: [
            {
              name: 'Required Bot Permission',
              value: '`Manage Roles`'
            },
            {
              name: 'Error Details',
              value: error instanceof Error ? error.message : 'Unknown error'
            }
          ]
        }
      ]
    })
  }
}

async function handleStatus(
  interaction: ChatInputCommandInteraction,
  guild: ChatInputCommandInteraction['guild']
): Promise<void> {
  if (!guild) return

  await interaction.deferReply({ ephemeral: true })

  const adminRole = guild.roles.cache.find((role) => role.name === DEFAULT_ADMIN_ROLE_NAME)

  if (!adminRole) {
    await interaction.editReply({
      embeds: [
        {
          color: DISCORD_COLORS.WARNING,
          title: '⚠️ Role Not Found',
          description: `The **${DEFAULT_ADMIN_ROLE_NAME}** role does not exist yet.`,
          fields: [
            {
              name: 'Current Access',
              value: 'Only the server owner can use bot commands.'
            },
            {
              name: 'Create Role',
              value: 'Use `/admin setup` to create the role automatically.'
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
    .slice(0, 10) // Limit to 10 for display

  const totalMembers = adminRole.members.size
  const nonOwnerMembers = adminRole.members.filter((m) => m.id !== guild.ownerId).size

  await interaction.editReply({
    embeds: [
      {
        color: DISCORD_COLORS.SUCCESS,
        title: '✅ Permission Status',
        fields: [
          {
            name: 'Admin Role',
            value: `**${adminRole.name}** (${adminRole.id})`,
            inline: false
          },
          {
            name: 'Role Color',
            value: adminRole.hexColor,
            inline: true
          },
          {
            name: 'Total Members',
            value: totalMembers.toString(),
            inline: true
          },
          {
            name: 'Server Owner',
            value: `<@${guild.ownerId}> (automatic access)`,
            inline: false
          },
          {
            name: 'Members with Access',
            value:
              nonOwnerMembers > 0
                ? membersWithRole.join(', ') +
                  (nonOwnerMembers > 10 ? `\n...and ${nonOwnerMembers - 10} more` : '')
                : 'No additional members yet',
            inline: false
          },
          {
            name: 'Manage Access',
            value: [
              '`/admin grant @user` - Give access to a user',
              '`/admin revoke @user` - Remove access from a user'
            ].join('\n'),
            inline: false
          }
        ]
      }
    ]
  })
}

async function handleGrant(
  interaction: ChatInputCommandInteraction,
  guild: ChatInputCommandInteraction['guild']
): Promise<void> {
  if (!guild) return

  const targetUser = interaction.options.getUser('user', true)
  const targetMember = await guild.members.fetch(targetUser.id).catch(() => null)

  if (!targetMember) {
    await interaction.reply({
      content: '❌ Could not find that user in this server',
      ephemeral: true
    })
    return
  }

  await interaction.deferReply({ ephemeral: true })

  // Find or create the role
  let adminRole = guild.roles.cache.find((role) => role.name === DEFAULT_ADMIN_ROLE_NAME)

  if (!adminRole) {
    try {
      log('Role does not exist, creating it for grant operation')
      adminRole = await guild.roles.create({
        name: DEFAULT_ADMIN_ROLE_NAME,
        color: 0x33b42f,
        reason: 'Created by Toji Bot for permission management',
        permissions: []
      })
    } catch (error) {
      log('ERROR: Failed to create role: %o', error)
      await interaction.editReply({
        embeds: [
          {
            color: DISCORD_COLORS.ERROR,
            title: '❌ Failed to Create Role',
            description: 'Could not create the admin role. Please check bot permissions.',
            fields: [
              {
                name: 'Required Bot Permission',
                value: '`Manage Roles`'
              }
            ]
          }
        ]
      })
      return
    }
  }

  // Check if user already has the role
  if (targetMember.roles.cache.has(adminRole.id)) {
    await interaction.editReply({
      embeds: [
        {
          color: DISCORD_COLORS.INFO,
          title: 'ℹ️ Already Has Access',
          description: `<@${targetUser.id}> already has the **${DEFAULT_ADMIN_ROLE_NAME}** role.`
        }
      ]
    })
    return
  }

  // Grant the role
  try {
    await targetMember.roles.add(adminRole, `Granted by ${interaction.user.tag}`)
    log('Granted role %s to user %s', adminRole.name, targetUser.tag)

    await interaction.editReply({
      embeds: [
        {
          color: DISCORD_COLORS.SUCCESS,
          title: '✅ Access Granted',
          description: `<@${targetUser.id}> now has access to all Toji bot commands.`,
          fields: [
            {
              name: 'Role Assigned',
              value: `**${adminRole.name}**`
            }
          ]
        }
      ]
    })
  } catch (error) {
    log('ERROR: Failed to grant role: %o', error)
    await interaction.editReply({
      embeds: [
        {
          color: DISCORD_COLORS.ERROR,
          title: '❌ Failed to Grant Access',
          description: 'Could not assign the role to the user.',
          fields: [
            {
              name: 'Possible Issues',
              value: [
                '• Bot lacks `Manage Roles` permission',
                "• Bot's role is below the target role in hierarchy",
                '• User has role management disabled'
              ].join('\n')
            }
          ]
        }
      ]
    })
  }
}

async function handleRevoke(
  interaction: ChatInputCommandInteraction,
  guild: ChatInputCommandInteraction['guild']
): Promise<void> {
  if (!guild) return

  const targetUser = interaction.options.getUser('user', true)
  const targetMember = await guild.members.fetch(targetUser.id).catch(() => null)

  if (!targetMember) {
    await interaction.reply({
      content: '❌ Could not find that user in this server',
      ephemeral: true
    })
    return
  }

  await interaction.deferReply({ ephemeral: true })

  const adminRole = guild.roles.cache.find((role) => role.name === DEFAULT_ADMIN_ROLE_NAME)

  if (!adminRole) {
    await interaction.editReply({
      embeds: [
        {
          color: DISCORD_COLORS.WARNING,
          title: '⚠️ Role Not Found',
          description: `The **${DEFAULT_ADMIN_ROLE_NAME}** role does not exist.`
        }
      ]
    })
    return
  }

  // Check if user has the role
  if (!targetMember.roles.cache.has(adminRole.id)) {
    await interaction.editReply({
      embeds: [
        {
          color: DISCORD_COLORS.INFO,
          title: 'ℹ️ No Access to Revoke',
          description: `<@${targetUser.id}> does not have the **${DEFAULT_ADMIN_ROLE_NAME}** role.`
        }
      ]
    })
    return
  }

  // Revoke the role
  try {
    await targetMember.roles.remove(adminRole, `Revoked by ${interaction.user.tag}`)
    log('Revoked role %s from user %s', adminRole.name, targetUser.tag)

    await interaction.editReply({
      embeds: [
        {
          color: DISCORD_COLORS.SUCCESS,
          title: '✅ Access Revoked',
          description: `<@${targetUser.id}> no longer has access to Toji bot commands.`,
          fields: [
            {
              name: 'Role Removed',
              value: `**${adminRole.name}**`
            }
          ]
        }
      ]
    })
  } catch (error) {
    log('ERROR: Failed to revoke role: %o', error)
    await interaction.editReply({
      embeds: [
        {
          color: DISCORD_COLORS.ERROR,
          title: '❌ Failed to Revoke Access',
          description: 'Could not remove the role from the user.',
          fields: [
            {
              name: 'Error Details',
              value: error instanceof Error ? error.message : 'Unknown error'
            }
          ]
        }
      ]
    })
  }
}
