import { ElectronAPI } from '@electron-toolkit/preload'
import type { Project, Session } from '../main/api/core'

// OpenCode API Types
export interface OpenCodeConfig {
  model?: string
  hostname?: string
  port?: number
  timeout?: number
}

export interface BinaryInfo {
  path: string
  installed: boolean
  lastChecked: Date
}

export interface ServerStatus {
  running: boolean
  url?: string
  error?: string
  healthy?: boolean
  port?: number
  pid?: number
  lastHealthCheck?: Date
}

export interface BinaryProgress {
  stage: 'downloading' | 'installing' | 'complete' | 'error'
  progress?: number
  message?: string
  error?: string
}

// Legacy types - can be removed later if not needed

export interface CoreAPI {
  // Agent Management
  isRunning: () => Promise<boolean>
  getCurrentDirectory: () => Promise<string | undefined>
  startOpencode: (directory: string, config?: object) => Promise<void>
  stopOpencode: () => Promise<void>

  // OpenCode SDK API
  prompt: (text: string) => Promise<string>
  listProjects: () => Promise<{ data: Project[] }>
  listSessions: () => Promise<{ data: Session[] }>
  deleteSession: (sessionId: string) => Promise<void>

  // Chat Operations
  ensureReadyForChat: (directory?: string) => Promise<{ sessionId: string; serverStatus: string }>
  chat: (message: string) => Promise<string>
}

export interface BinaryAPI {
  // Binary Management
  getInfo: () => Promise<BinaryInfo>
  install: () => Promise<void>

  // Events
  onStatusUpdate: (callback: (progress: BinaryProgress) => void) => () => void
}

export interface WindowAPI {
  minimize: () => Promise<void>
  maximize: () => Promise<void>
  close: () => Promise<void>
}

export interface LogsAPI {
  getOpenCodeLogs: () => Promise<string>
}

declare global {
  interface Window {
    electron: ElectronAPI
    api: {
      core: CoreAPI
      binary: BinaryAPI
      window: WindowAPI
      logs: LogsAPI
    }
  }
}
