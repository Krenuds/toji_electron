// Core Toji API for preload
import { ipcRenderer, type IpcRendererEvent } from 'electron'
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
  getSessionMessages: (
    sessionId?: string,
    useCache = true
  ): Promise<Array<{ info: Message; parts: Part[] }>> =>
    ipcRenderer.invoke('toji:get-session-messages', sessionId, useCache),
  getCurrentSessionId: (): Promise<string | undefined> =>
    ipcRenderer.invoke('toji:get-current-session-id'),
  getCurrentSession: (): Promise<{ id: string; directory?: string } | null> =>
    ipcRenderer.invoke('toji:get-current-session'),

  // Session management operations
  listSessions: (): Promise<Session[]> => ipcRenderer.invoke('toji:list-sessions'),
  createSession: (title?: string): Promise<Session> =>
    ipcRenderer.invoke('toji:create-session', title),
  deleteSession: (sessionId: string): Promise<void> =>
    ipcRenderer.invoke('toji:delete-session', sessionId),
  switchSession: (sessionId: string): Promise<void> =>
    ipcRenderer.invoke('toji:switch-session', sessionId),

  // Session events
  onSessionRestored: (
    callback: (data: { sessionId: string; title?: string; projectPath: string }) => void
  ): (() => void) => {
    const subscription = (
      _event: IpcRendererEvent,
      data: { sessionId: string; title?: string; projectPath: string }
    ): void => callback(data)
    ipcRenderer.on('session:restored', subscription)
    return (): void => {
      ipcRenderer.removeListener('session:restored', subscription)
    }
  }

  // Legacy operations - removed (replaced by projects system)
}
