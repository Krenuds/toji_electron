// Core Toji API for preload
import { ipcRenderer } from 'electron'
import type {
  Session,
  WorkspaceInfo,
  WorkspaceCollection,
  EnrichedProject,
  DiscoveredProject,
  ServerStatus
} from '../../main/toji/types'

export const tojiAPI = {
  // Check if Toji is ready
  isReady: (): Promise<boolean> => ipcRenderer.invoke('toji:is-ready'),

  // Get Toji status
  status: (): Promise<{
    ready: boolean
    hasClient?: boolean
    message?: string
  }> => ipcRenderer.invoke('toji:status'),

  // Server lifecycle operations
  isRunning: (): Promise<boolean> =>
    ipcRenderer.invoke('toji:get-server-status').then((status) => status.isRunning),
  startServer: (): Promise<void> => ipcRenderer.invoke('toji:start-server'),
  stopServer: (): Promise<void> => ipcRenderer.invoke('toji:stop-server'),
  getServerStatus: (): Promise<ServerStatus> => ipcRenderer.invoke('toji:get-server-status'),

  // Chat operations - stubbed
  ensureReadyForChat: (directory?: string): Promise<void> => {
    void directory // Use parameter to satisfy TypeScript
    return Promise.resolve()
  },
  chat: (message: string): Promise<string> => {
    void message // Use parameter to satisfy TypeScript
    return Promise.resolve('Chat not implemented')
  },

  // Session operations - stubbed
  listSessions: (): Promise<Session[]> => Promise.resolve([]),
  deleteSession: (sessionId: string): Promise<void> => {
    void sessionId // Use parameter to satisfy TypeScript
    return Promise.resolve()
  },
  getSessionsForWorkspace: (path: string): Promise<Session[]> => {
    void path // Use parameter to satisfy TypeScript
    return Promise.resolve([])
  },

  // Workspace operations - stubbed
  getCurrentDirectory: (): Promise<string | null> => Promise.resolve(null),
  changeWorkspace: (path: string): Promise<void> => {
    void path // Use parameter to satisfy TypeScript
    return Promise.resolve()
  },
  getRecentWorkspaces: (): Promise<string[]> => Promise.resolve([]),
  removeRecentWorkspace: (path: string): Promise<void> => {
    void path // Use parameter to satisfy TypeScript
    return Promise.resolve()
  },
  clearRecentWorkspaces: (): Promise<void> => Promise.resolve(),
  getAllWorkspaces: (): Promise<WorkspaceInfo[]> => Promise.resolve([]),
  openWorkspaceDirectory: (): Promise<void> => Promise.resolve(),
  openSessionsDirectory: (): Promise<void> => Promise.resolve(),
  inspectWorkspace: (path: string): Promise<WorkspaceInfo> => Promise.resolve({ path }),

  // Advanced workspace operations - stubbed
  getWorkspaceCollections: (): Promise<WorkspaceCollection[]> => Promise.resolve([]),
  getEnrichedProjects: (): Promise<EnrichedProject[]> => Promise.resolve([]),
  discoverProjects: (path: string): Promise<DiscoveredProject[]> => {
    void path // Use parameter to satisfy TypeScript
    return Promise.resolve([])
  }
}
