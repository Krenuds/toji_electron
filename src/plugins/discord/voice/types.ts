/**
 * Voice-specific TypeScript types
 * Phase 1: Basic voice connection types
 */

import type { VoiceConnection as DiscordVoiceConnection } from '@discordjs/voice'

export interface VoiceSessionConfig {
  userId: string
  guildId: string
  channelId: string // Voice channel ID
  projectPath?: string // Project path for Toji context
  projectChannelId?: string // Text channel ID for the project
  wakeWord?: string // Wake word to trigger listening (default: 'listen')
}

export interface VoiceSession {
  id: string
  config: VoiceSessionConfig
  connection: DiscordVoiceConnection
  startTime: Date
  status: 'connecting' | 'connected' | 'disconnected' | 'error'
  projectPath?: string // Quick access to project path
  projectChannelId?: string // Quick access to project text channel
  isListening: boolean // Whether bot is currently listening for input (after wake word)
  wakeWord: string // Wake word that triggers listening mode
}

export interface VoiceModuleEvents {
  sessionStarted: [session: VoiceSession]
  sessionEnded: [sessionId: string]
  connectionError: [error: Error, sessionId: string]
}
