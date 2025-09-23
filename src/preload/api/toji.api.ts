// Core Toji API for preload
import { ipcRenderer } from 'electron'
import type { Message, Part } from '@opencode-ai/sdk'
import type { Session, ServerStatus } from '../../main/toji/types'

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

  // Chat operations
  ensureReadyForChat: (directory?: string): Promise<void> => {
    void directory // Use parameter to satisfy TypeScript
    return Promise.resolve()
  },
  chat: (message: string, sessionId?: string): Promise<string> =>
    ipcRenderer.invoke('toji:chat', message, sessionId),
  clearSession: (): Promise<void> => ipcRenderer.invoke('toji:clear-session'),

  // Message history operations
  getSessionMessages: (sessionId?: string): Promise<Array<{ info: Message; parts: Part[] }>> =>
    ipcRenderer.invoke('toji:get-session-messages', sessionId),
  getCurrentSessionId: (): Promise<string | undefined> =>
    ipcRenderer.invoke('toji:get-current-session-id'),
  getCurrentSession: (): Promise<{ id: string; directory?: string } | null> =>
    ipcRenderer.invoke('toji:get-current-session'),

  // Session operations - stubbed
  listSessions: (): Promise<Session[]> => Promise.resolve([]),
  deleteSession: (sessionId: string): Promise<void> => {
    void sessionId // Use parameter to satisfy TypeScript
    return Promise.resolve()
  },
  getSessionsForWorkspace: (path: string): Promise<Session[]> => {
    void path // Use parameter to satisfy TypeScript
    return Promise.resolve([])
  }

  // Legacy operations - removed (replaced by projects system)
  // Note: These workspace operations have been replaced by the projects system
}
