import type { Session as OpencodeSession, ToolState } from '@opencode-ai/sdk'

// Minimal types for Toji

// Tool event information
export interface ToolEvent {
  id: string
  callID: string
  tool: string
  state: ToolState
  sessionID: string
  messageID: string
}

// Image attachment for multimodal prompts
export interface ImageAttachment {
  path: string // Absolute path to image file
  mimeType?: string // Optional: will be auto-detected if not provided
}

// Event streaming types
export interface StreamCallbacks {
  onChunk?: (text: string, partId: string) => void | Promise<void>
  onComplete?: (fullText: string) => void | Promise<void>
  onError?: (error: Error) => void | Promise<void>
  onThinking?: (isThinking: boolean) => void | Promise<void>
  onTool?: (tool: ToolEvent) => void | Promise<void>
}

// Re-export Event type for use in other modules
export type { Event as OpencodeEvent, ToolState } from '@opencode-ai/sdk'

export interface TojiConfig {
  server?: {
    hostname?: string
    port?: number
    timeout?: number
  }
  project?: {
    autoInit?: boolean
    gitInit?: boolean
  }
}

// SDK-backed session with UI metadata
export type Session = OpencodeSession & {
  projectPath?: string
  lastActive?: Date
  created?: Date
  updated?: Date
}

export type { Session as OpencodeSession } from '@opencode-ai/sdk'

export interface ProjectInfo {
  path: string
  hasGit?: boolean
  hasOpenCodeConfig?: boolean
  sessions?: Session[]
}

export interface ProjectCollection {
  id: string
  name: string
  projects: ProjectInfo[]
}

export interface EnrichedProject {
  id: string
  path: string
  name?: string
  sessionCount?: number
  vcs?: boolean
  metadata?: unknown
}

export interface DiscoveredProject {
  path: string
  type?: string
  name?: string
}

export interface ServerStatus {
  isRunning: boolean
  port?: number
  pid?: number
  startTime?: Date
  uptime?: number
  isHealthy?: boolean
  lastHealthCheck?: Date
}
