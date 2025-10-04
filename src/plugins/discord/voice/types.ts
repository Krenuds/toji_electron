/**
 * Voice-specific TypeScript types
 * Phase 1: Basic voice connection types
 */

import type { VoiceConnection as DiscordVoiceConnection } from '@discordjs/voice'

export interface VoiceSessionConfig {
  userId: string
  guildId: string
  channelId: string // Voice channel ID
  projectChannelId?: string // Text channel for project context (Phase 2)
}

export interface VoiceSession {
  id: string
  config: VoiceSessionConfig
  connection: DiscordVoiceConnection
  startTime: Date
  status: 'connecting' | 'connected' | 'disconnected' | 'error'
}

export interface VoiceModuleEvents {
  sessionStarted: [session: VoiceSession]
  sessionEnded: [sessionId: string]
  connectionError: [error: Error, sessionId: string]
}
