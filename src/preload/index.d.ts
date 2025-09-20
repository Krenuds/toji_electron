import { ElectronAPI } from '@electron-toolkit/preload'
// TODO: Import these from OpenCode SDK when needed
// import type { Project, Session } from '@opencode-ai/sdk'
import type { WorkspaceSettings } from '../main/toji/types'

// Temporary type definitions until we properly import from SDK
interface Project {
  id: string
  worktree: string
  vcs?: any
}

interface Session {
  id: string
  title?: string
  directory?: string
  projectID?: string
  time?: {
    created?: number
    updated?: number
  }
}

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
  getSessionsForWorkspace: (workspacePath: string) => Promise<Session[]>

  // Chat Operations
  ensureReadyForChat: (directory?: string) => Promise<{ sessionId: string; serverStatus: string }>
  chat: (message: string) => Promise<string>

  // Workspace Management
  changeWorkspace: (directory: string) => Promise<{
    isNew: boolean
    hasGit: boolean
    hasOpenCodeConfig: boolean
    hasTojiToken: boolean
    sessionId: string
    workspacePath: string
  }>

  // Workspace Collections & Projects
  getWorkspaceCollections: () => Promise<unknown[]>
  getWorkspacesFromSessions: (limit?: number) => Promise<
    Array<{
      path: string
      name: string
      sessionCount: number
      lastActivity: Date | null
    }>
  >
  getAllWorkspaces: (limit?: number) => Promise<
    Array<{
      path: string
      name: string
      sessionCount: number
      lastActivity: Date | null
      source: 'session' | 'recent' | 'both'
    }>
  >
  openWorkspaceDirectory: (path: string) => Promise<void>
  openSessionsDirectory: () => Promise<void>
  getAllProjects: () => Promise<unknown[]>
  discoverProjects: (baseDir?: string) => Promise<unknown[]>
  getEnrichedProjects: () => Promise<unknown[]>
  inspectWorkspace: (directory: string) => Promise<{
    exists: boolean
    hasGit: boolean
    hasOpenCodeConfig: boolean
    hasGitignore: boolean
    hasTojiToken: boolean
  }>

  // Recent Workspaces Management
  getRecentWorkspaces: () => Promise<string[]>
  removeRecentWorkspace: (path: string) => Promise<string[]>
  clearRecentWorkspaces: () => Promise<string[]>

  // Workspace-specific settings
  getWorkspaceSettings: (workspacePath: string) => Promise<WorkspaceSettings>
  setWorkspaceSettings: (workspacePath: string, settings: WorkspaceSettings) => Promise<void>
  clearWorkspaceSettings: (workspacePath: string) => Promise<void>
  getAllWorkspaceSettings: () => Promise<Record<string, WorkspaceSettings>>

  // Auto-start settings
  getAutoStart: () => Promise<boolean>
  setAutoStart: (enabled: boolean) => Promise<boolean>
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
  selectDirectory: () => Promise<string | null>
}

export interface LogsAPI {
  getOpenCodeLogs: () => Promise<string>
}

export interface DiscordAPI {
  connect: () => Promise<void>
  disconnect: () => Promise<void>
  getStatus: () => Promise<{
    connected: boolean
    username?: string
    botId?: string
    guilds?: number
  }>
  setToken: (token: string) => Promise<{ success: boolean }>
  hasToken: () => Promise<boolean>
  clearToken: () => Promise<{ success: boolean }>
}

declare global {
  interface Window {
    electron: ElectronAPI
    api: {
      core: CoreAPI
      binary: BinaryAPI
      window: WindowAPI
      logs: LogsAPI
      discord: DiscordAPI
    }
  }
}
