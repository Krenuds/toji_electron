/**
 * Voice Command - Phase 1: Basic voice channel join/leave
 * Slash command interface for voice functionality
 */

import {
  SlashCommandBuilder,
  ChatInputCommandInteraction,
  ChannelType,
  PermissionFlagsBits,
  MessageFlags
} from 'discord.js'
import { DISCORD_COLORS } from '../constants'
import { createFileDebugLogger } from '../../../main/utils/logger'
import type { VoiceModule } from '../voice/VoiceModule'

const log = createFileDebugLogger('discord:command:voice')

export const data = new SlashCommandBuilder()
  .setName('voice')
  .setDescription('Voice channel commands')
  .addSubcommand((subcommand) =>
    subcommand.setName('join').setDescription('Join your current voice channel')
  )
  .addSubcommand((subcommand) =>
    subcommand.setName('leave').setDescription('Leave the voice channel')
  )
  .addSubcommand((subcommand) =>
    subcommand.setName('status').setDescription('Check your voice session status')
  )
  .setDefaultMemberPermissions(PermissionFlagsBits.SendMessages)

export async function execute(
  interaction: ChatInputCommandInteraction,
  _toji: unknown,
  _projectManager?: unknown,
  voiceModule?: VoiceModule
): Promise<void> {
  if (!voiceModule) {
    await interaction.reply({
      content: '❌ Voice module not initialized',
      flags: MessageFlags.Ephemeral
    })
    return
  }

  const subcommand = interaction.options.getSubcommand()

  switch (subcommand) {
    case 'join':
      await handleJoin(interaction, voiceModule)
      break

    case 'leave':
      await handleLeave(interaction, voiceModule)
      break

    case 'status':
      await handleStatus(interaction, voiceModule)
      break

    default:
      await interaction.reply({
        content: '❌ Unknown subcommand',
        flags: MessageFlags.Ephemeral
      })
  }
}

/**
 * Handle /voice join - Join user's current voice channel
 */
async function handleJoin(
  interaction: ChatInputCommandInteraction,
  voiceModule: VoiceModule
): Promise<void> {
  await interaction.deferReply({ flags: MessageFlags.Ephemeral })

  try {
    // Check if user is in a voice channel
    const member = interaction.guild?.members.cache.get(interaction.user.id)
    if (!member || !member.voice) {
      await interaction.editReply({
        content: '❌ Could not determine your voice state. Please try again.'
      })
      return
    }

    const voiceChannel = member.voice.channel
    if (!voiceChannel) {
      await interaction.editReply({
        content: '❌ You must be in a voice channel to use this command!'
      })
      return
    }

    // Verify it's a voice channel (not stage)
    if (
      voiceChannel.type !== ChannelType.GuildVoice &&
      voiceChannel.type !== ChannelType.GuildStageVoice
    ) {
      await interaction.editReply({
        content: '❌ You must be in a voice or stage channel!'
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

    log(`User ${interaction.user.tag} joining voice channel ${voiceChannel.id}`)

    // Join the voice channel
    const session = await voiceModule.joinVoiceChannel(voiceChannel, interaction.user.id)

    await interaction.editReply({
      embeds: [
        {
          title: '🎙️ Voice Session Started',
          description: `Connected to **${voiceChannel.name}**`,
          color: DISCORD_COLORS.SUCCESS,
          fields: [
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
              name: 'Next Steps',
              value:
                'Phase 1 complete! Voice connection established.\nUse `/voice leave` to disconnect.',
              inline: false
            }
          ],
          timestamp: new Date().toISOString()
        }
      ]
    })

    log(`Successfully connected user ${interaction.user.tag} to voice`)
  } catch (error) {
    log('Error in handleJoin:', error)

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
  voiceModule: VoiceModule
): Promise<void> {
  await interaction.deferReply({ flags: MessageFlags.Ephemeral })

  try {
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

    log(`User ${interaction.user.tag} left voice`)
  } catch (error) {
    log('Error in handleLeave:', error)

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
  voiceModule: VoiceModule
): Promise<void> {
  await interaction.deferReply({ flags: MessageFlags.Ephemeral })

  try {
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
              name: 'Channel',
              value: `<#${session.config.channelId}>`,
              inline: true
            }
          ],
          timestamp: new Date().toISOString()
        }
      ]
    })
  } catch (error) {
    log('Error in handleStatus:', error)

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
