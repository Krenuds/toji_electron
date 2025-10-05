/**
 * Voice Command - Phase 1: Project-based voice channel management
 * Slash command interface for voice functionality
 */

import {
  SlashCommandBuilder,
  ChatInputCommandInteraction,
  ChannelType,
  PermissionFlagsBits,
  MessageFlags,
  type VoiceChannel
} from 'discord.js'
import { DISCORD_COLORS } from '../constants'
import { createLogger } from '../../../main/utils/logger'
import type { VoiceModule } from '../voice/VoiceModule'
import type { DiscordProjectManager } from '../modules/DiscordProjectManager'

const logger = createLogger('discord:command:voice')

/**
 * Get or create a voice channel for a project
 * Voice channels are named "🎙️-{project-name}" and live in the Toji Desktop category
 */
async function getOrCreateProjectVoiceChannel(
  interaction: ChatInputCommandInteraction,
  projectName: string,
  textChannelId: string
): Promise<VoiceChannel | null> {
  const guild = interaction.guild
  if (!guild) return null

  // Generate voice channel name
  const voiceChannelName = `🎙️-${projectName}`

  logger.debug(`Looking for voice channel: ${voiceChannelName}`)

  // Check if voice channel already exists in the guild
  const existingVoiceChannel = guild.channels.cache.find(
    (ch) => ch.type === ChannelType.GuildVoice && ch.name === voiceChannelName
  ) as VoiceChannel | undefined

  if (existingVoiceChannel) {
    logger.debug(`Found existing voice channel: ${existingVoiceChannel.id}`)
    return existingVoiceChannel
  }

  // Create new voice channel in the same parent as text channel
  const textChannel = guild.channels.cache.get(textChannelId)
  const parentId = textChannel && 'parent' in textChannel ? textChannel.parent?.id : undefined

  logger.debug(`Creating new voice channel: ${voiceChannelName} in category: ${parentId || 'none'}`)

  try {
    const voiceChannel = await guild.channels.create({
      name: voiceChannelName,
      type: ChannelType.GuildVoice,
      parent: parentId,
      reason: `Voice channel for project: ${projectName}`,
      permissionOverwrites: [
        {
          id: guild.roles.everyone,
          allow: [PermissionFlagsBits.ViewChannel, PermissionFlagsBits.Connect],
          deny: [PermissionFlagsBits.ManageChannels]
        }
      ]
    })

    logger.debug(`Created voice channel: ${voiceChannel.id}`)
    return voiceChannel
  } catch (error) {
    logger.debug(`Failed to create voice channel:`, error)
    return null
  }
}

export const data = new SlashCommandBuilder()
  .setName('voice')
  .setDescription('Voice channel commands (must be used in a project channel)')
  .addSubcommand((subcommand) =>
    subcommand.setName('join').setDescription('Join/create the voice channel for this project')
  )
  .addSubcommand((subcommand) =>
    subcommand.setName('leave').setDescription('Leave the project voice channel')
  )
  .addSubcommand((subcommand) =>
    subcommand.setName('status').setDescription('Check voice session status for this project')
  )
  .setDefaultMemberPermissions(PermissionFlagsBits.SendMessages)

export async function execute(
  interaction: ChatInputCommandInteraction,
  _toji: unknown,
  projectManager?: DiscordProjectManager,
  voiceModule?: VoiceModule
): Promise<void> {
  if (!voiceModule || !projectManager) {
    await interaction.reply({
      content: '❌ Voice module not initialized',
      flags: MessageFlags.Ephemeral
    })
    return
  }

  const subcommand = interaction.options.getSubcommand()

  switch (subcommand) {
    case 'join':
      await handleJoin(interaction, projectManager, voiceModule)
      break

    case 'leave':
      await handleLeave(interaction, projectManager, voiceModule)
      break

    case 'status':
      await handleStatus(interaction, projectManager, voiceModule)
      break

    default:
      await interaction.reply({
        content: '❌ Unknown subcommand',
        flags: MessageFlags.Ephemeral
      })
  }
}

/**
 * Handle /voice join - Create/join voice channel for this project
 */
async function handleJoin(
  interaction: ChatInputCommandInteraction,
  projectManager: DiscordProjectManager,
  voiceModule: VoiceModule
): Promise<void> {
  await interaction.deferReply({ flags: MessageFlags.Ephemeral })

  try {
    // VALIDATION: Must be in a project channel
    const channelId = interaction.channelId
    if (!projectManager.isProjectChannel(channelId)) {
      await interaction.editReply({
        content:
          '❌ This command can only be used in a project channel!\nUse `/project list` to see available projects.'
      })
      return
    }

    // Get project info
    const project = projectManager.getProjectByChannel(channelId)
    if (!project) {
      await interaction.editReply({
        content: '❌ Could not find project information for this channel.'
      })
      return
    }

    logger.debug(
      `User ${interaction.user.tag} requesting voice for project: ${project.projectName} (${project.projectPath})`
    )

    // Get or create the voice channel for this project
    const voiceChannel = await getOrCreateProjectVoiceChannel(
      interaction,
      project.projectName,
      project.channelId
    )

    if (!voiceChannel) {
      await interaction.editReply({
        content: '❌ Failed to create/find voice channel for this project.'
      })
      return
    }

    // Check bot permissions
    const permissions = voiceChannel.permissionsFor(interaction.client.user!)
    if (!permissions?.has(PermissionFlagsBits.Connect)) {
      await interaction.editReply({
        content: `❌ I don't have permission to connect to ${voiceChannel.name}!`
      })
      return
    }

    if (!permissions?.has(PermissionFlagsBits.Speak)) {
      await interaction.editReply({
        content: `❌ I don't have permission to speak in ${voiceChannel.name}!`
      })
      return
    }

    // Check if user already has a session - inform them we're switching
    const existingSession = voiceModule.getUserSession(interaction.user.id)
    const isSwitching = existingSession !== undefined

    logger.debug(`Joining voice channel ${voiceChannel.id} for project ${project.projectName}`)

    // Join the voice channel with project context (auto-leaves previous session)
    const session = await voiceModule.joinVoiceChannel(
      voiceChannel,
      interaction.user.id,
      project.projectPath,
      project.channelId
    )

    await interaction.editReply({
      embeds: [
        {
          title: isSwitching ? '🔄 Voice Session Switched' : '🎙️ Voice Session Started',
          description: `Connected to **${voiceChannel.name}**`,
          color: DISCORD_COLORS.SUCCESS,
          fields: [
            ...(isSwitching
              ? [
                  {
                    name: '🔄 Switched Sessions',
                    value: 'Automatically left previous voice session and joined this one.',
                    inline: false
                  }
                ]
              : []),
            {
              name: 'Project',
              value: `\`${project.projectName}\``,
              inline: true
            },
            {
              name: 'Session ID',
              value: `\`${session.id}\``,
              inline: true
            },
            {
              name: 'Status',
              value: '✅ Connected',
              inline: true
            },
            {
              name: 'Voice Channel',
              value: `<#${voiceChannel.id}>`,
              inline: false
            },
            {
              name: 'Next Steps',
              value:
                'Join the voice channel to start talking!\nYour conversation will be routed to this project.\nUse `/voice leave` to disconnect.',
              inline: false
            }
          ],
          timestamp: new Date().toISOString()
        }
      ]
    })

    logger.debug(`Successfully connected user ${interaction.user.tag} to project voice channel`)
  } catch (error) {
    logger.debug('Error in handleJoin:', error)

    const errorMessage = error instanceof Error ? error.message : 'Unknown error occurred'

    await interaction.editReply({
      embeds: [
        {
          title: '❌ Connection Failed',
          description: errorMessage,
          color: DISCORD_COLORS.ERROR,
          timestamp: new Date().toISOString()
        }
      ]
    })
  }
}

/**
 * Handle /voice leave - Leave current voice channel
 */
async function handleLeave(
  interaction: ChatInputCommandInteraction,
  projectManager: DiscordProjectManager,
  voiceModule: VoiceModule
): Promise<void> {
  await interaction.deferReply({ flags: MessageFlags.Ephemeral })

  try {
    // VALIDATION: Must be in a project channel
    const channelId = interaction.channelId
    if (!projectManager.isProjectChannel(channelId)) {
      await interaction.editReply({
        content:
          '❌ This command can only be used in a project channel!\nUse `/project list` to see available projects.'
      })
      return
    }

    await voiceModule.leaveVoiceChannel(interaction.user.id)

    await interaction.editReply({
      embeds: [
        {
          title: '👋 Voice Session Ended',
          description: 'Successfully disconnected from voice channel.',
          color: DISCORD_COLORS.INFO,
          timestamp: new Date().toISOString()
        }
      ]
    })

    logger.debug(`User ${interaction.user.tag} left voice`)
  } catch (error) {
    logger.debug('Error in handleLeave:', error)

    const errorMessage = error instanceof Error ? error.message : 'Unknown error occurred'

    await interaction.editReply({
      embeds: [
        {
          title: '❌ Error',
          description: errorMessage,
          color: DISCORD_COLORS.ERROR,
          timestamp: new Date().toISOString()
        }
      ]
    })
  }
}

/**
 * Handle /voice status - Check current voice session
 */
async function handleStatus(
  interaction: ChatInputCommandInteraction,
  projectManager: DiscordProjectManager,
  voiceModule: VoiceModule
): Promise<void> {
  await interaction.deferReply({ flags: MessageFlags.Ephemeral })

  try {
    // VALIDATION: Must be in a project channel
    const channelId = interaction.channelId
    if (!projectManager.isProjectChannel(channelId)) {
      await interaction.editReply({
        content:
          '❌ This command can only be used in a project channel!\nUse `/project list` to see available projects.'
      })
      return
    }

    const session = voiceModule.getUserSession(interaction.user.id)

    if (!session) {
      await interaction.editReply({
        embeds: [
          {
            title: '📊 Voice Status',
            description: 'You do not have an active voice session.',
            color: DISCORD_COLORS.INFO,
            timestamp: new Date().toISOString()
          }
        ]
      })
      return
    }

    const connectionStatus = voiceModule.getConnectionStatus(interaction.user.id)
    const duration = Math.floor((Date.now() - session.startTime.getTime()) / 1000)
    const minutes = Math.floor(duration / 60)
    const seconds = duration % 60

    const project = session.projectPath
      ? projectManager.getProjectByChannel(session.projectChannelId || '')
      : undefined

    await interaction.editReply({
      embeds: [
        {
          title: '📊 Voice Session Status',
          color: DISCORD_COLORS.INFO,
          fields: [
            {
              name: 'Session ID',
              value: `\`${session.id}\``,
              inline: false
            },
            {
              name: 'Project',
              value: project ? `\`${project.projectName}\`` : 'None',
              inline: true
            },
            {
              name: 'Status',
              value: `${session.status} (${connectionStatus})`,
              inline: true
            },
            {
              name: 'Duration',
              value: `${minutes}m ${seconds}s`,
              inline: true
            },
            {
              name: 'Voice Channel',
              value: `<#${session.config.channelId}>`,
              inline: false
            },
            {
              name: 'Project Channel',
              value: session.projectChannelId ? `<#${session.projectChannelId}>` : 'None',
              inline: false
            }
          ],
          timestamp: new Date().toISOString()
        }
      ]
    })
  } catch (error) {
    logger.debug('Error in handleStatus:', error)

    await interaction.editReply({
      embeds: [
        {
          title: '❌ Error',
          description: 'Failed to retrieve voice status.',
          color: DISCORD_COLORS.ERROR,
          timestamp: new Date().toISOString()
        }
      ]
    })
  }
}
