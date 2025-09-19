import { contextBridge, ipcRenderer, IpcRendererEvent } from 'electron'
import { electronAPI } from '@electron-toolkit/preload'
import type { BinaryInfo, BinaryProgress } from './index.d'
import type { Project, Session } from '../main/api'

// Custom APIs for renderer
const api = {
  // Core API - OpenCode agent management
  core: {
    // Agent Management
    isRunning: (): Promise<boolean> => ipcRenderer.invoke('core:is-running'),
    getCurrentDirectory: (): Promise<string | undefined> =>
      ipcRenderer.invoke('core:get-current-directory'),
    startOpencode: (directory: string, config?: object): Promise<void> =>
      ipcRenderer.invoke('core:start-opencode', directory, config),
    stopOpencode: (): Promise<void> => ipcRenderer.invoke('core:stop-opencode'),

    // OpenCode SDK API
    prompt: (text: string): Promise<string> => ipcRenderer.invoke('core:prompt', text),
    listProjects: (): Promise<{ data: Project[] }> => ipcRenderer.invoke('core:list-projects'),
    listSessions: (): Promise<{ data: Session[] }> => ipcRenderer.invoke('core:list-sessions'),
    deleteSession: (sessionId: string): Promise<void> =>
      ipcRenderer.invoke('core:delete-session', sessionId),

    // Chat Operations
    ensureReadyForChat: (
      directory?: string
    ): Promise<{ sessionId: string; serverStatus: string }> =>
      ipcRenderer.invoke('core:ensure-ready-for-chat', directory),
    chat: (message: string): Promise<string> => ipcRenderer.invoke('core:chat', message),

    // Workspace Management
    changeWorkspace: (
      directory: string
    ): Promise<{
      isNew: boolean
      hasGit: boolean
      hasOpenCodeConfig: boolean
      hasTojiToken: boolean
      sessionId: string
      workspacePath: string
    }> => ipcRenderer.invoke('core:change-workspace', directory),

    // Workspace Collections & Projects
    getWorkspaceCollections: (): Promise<unknown[]> =>
      ipcRenderer.invoke('core:workspace-collections'),
    getWorkspacesFromSessions: (
      limit?: number
    ): Promise<
      Array<{
        path: string
        name: string
        sessionCount: number
        lastActivity: Date | null
      }>
    > => ipcRenderer.invoke('core:get-workspaces-from-sessions', limit),
    getAllWorkspaces: (
      limit?: number
    ): Promise<
      Array<{
        path: string
        name: string
        sessionCount: number
        lastActivity: Date | null
        source: 'session' | 'recent' | 'both'
      }>
    > => ipcRenderer.invoke('core:get-all-workspaces', limit),
    openWorkspaceDirectory: (path: string): Promise<void> =>
      ipcRenderer.invoke('core:open-workspace-directory', path),
    openSessionsDirectory: (): Promise<void> => ipcRenderer.invoke('core:open-sessions-directory'),
    getAllProjects: (): Promise<unknown[]> => ipcRenderer.invoke('core:all-projects'),
    discoverProjects: (baseDir?: string): Promise<unknown[]> =>
      ipcRenderer.invoke('core:discover-projects', baseDir),
    getEnrichedProjects: (): Promise<unknown[]> => ipcRenderer.invoke('core:enriched-projects'),
    inspectWorkspace: (
      directory: string
    ): Promise<{
      exists: boolean
      hasGit: boolean
      hasOpenCodeConfig: boolean
      hasGitignore: boolean
      hasTojiToken: boolean
    }> => ipcRenderer.invoke('core:inspect-workspace', directory),

    // Recent Workspaces Management
    getRecentWorkspaces: (): Promise<string[]> => ipcRenderer.invoke('core:get-recent-workspaces'),
    removeRecentWorkspace: (path: string): Promise<string[]> =>
      ipcRenderer.invoke('core:remove-recent-workspace', path),
    clearRecentWorkspaces: (): Promise<string[]> =>
      ipcRenderer.invoke('core:clear-recent-workspaces'),

    // Auto-start settings
    getAutoStart: (): Promise<boolean> => ipcRenderer.invoke('core:get-auto-start'),
    setAutoStart: (enabled: boolean): Promise<boolean> =>
      ipcRenderer.invoke('core:set-auto-start', enabled)
  },

  // Binary Management API - separated from core agent logic
  binary: {
    getInfo: (): Promise<BinaryInfo> => ipcRenderer.invoke('binary:get-info'),
    install: (): Promise<void> => ipcRenderer.invoke('binary:install'),

    // Events
    onStatusUpdate: (callback: (progress: BinaryProgress) => void): (() => void) => {
      const subscription = (_event: IpcRendererEvent, progress: BinaryProgress): void =>
        callback(progress)
      ipcRenderer.on('binary:status-update', subscription)
      return (): void => {
        ipcRenderer.removeListener('binary:status-update', subscription)
      }
    }
  },

  // Window Controls API
  window: {
    minimize: (): Promise<void> => ipcRenderer.invoke('window:minimize'),
    maximize: (): Promise<void> => ipcRenderer.invoke('window:maximize'),
    close: (): Promise<void> => ipcRenderer.invoke('window:close'),
    selectDirectory: (): Promise<string | null> => ipcRenderer.invoke('window:select-directory')
  },

  // System Service Management API
  system: {
    // Service Status
    getServiceStatus: (): Promise<{
      core: { status: 'running' | 'stopped' | 'error'; uptime?: number }
      discord: { status: 'connected' | 'disconnected' | 'error'; servers?: number }
      whisper: { status: 'running' | 'stopped' | 'loading' | 'error'; port?: number }
      tts: { status: 'running' | 'stopped' | 'error'; port?: number }
      claudeCli: { status: 'authenticated' | 'unauthenticated' | 'error' }
    }> => ipcRenderer.invoke('system:get-service-status'),

    // Service Controls
    startAllServices: (): Promise<void> => ipcRenderer.invoke('system:start-all-services'),
    stopAllServices: (): Promise<void> => ipcRenderer.invoke('system:stop-all-services'),
    restartAllServices: (): Promise<void> => ipcRenderer.invoke('system:restart-all-services'),

    // Individual Service Controls
    startService: (serviceName: string): Promise<void> =>
      ipcRenderer.invoke('system:start-service', serviceName),
    stopService: (serviceName: string): Promise<void> =>
      ipcRenderer.invoke('system:stop-service', serviceName),
    restartService: (serviceName: string): Promise<void> =>
      ipcRenderer.invoke('system:restart-service', serviceName),

    // System Resources
    getSystemResources: (): Promise<{
      cpu: number
      memory: { used: number; total: number }
      disk: { used: number }
      network: { latency: number }
    }> => ipcRenderer.invoke('system:get-system-resources'),

    // Interface Connections
    getInterfaceStatus: (): Promise<{
      electron: { status: 'active'; description: string }
      discord: { status: 'connected' | 'disconnected'; description: string }
      slack: { status: 'connected' | 'disconnected'; description: string }
      mcp: { status: 'active' | 'inactive'; description: string }
      voice: { status: 'active' | 'inactive'; description: string }
    }> => ipcRenderer.invoke('system:get-interface-status'),

    // Dependency Management
    installDependencies: (): Promise<void> => ipcRenderer.invoke('system:install-dependencies'),
    testConnections: (): Promise<{ [key: string]: boolean }> =>
      ipcRenderer.invoke('system:test-connections'),

    // Events
    onServiceStatusUpdate: (
      callback: (status: {
        serviceName: string
        status: 'running' | 'stopped' | 'error' | 'loading'
        message?: string
      }) => void
    ): (() => void) => {
      const subscription = (
        _event: IpcRendererEvent,
        status: {
          serviceName: string
          status: 'running' | 'stopped' | 'error' | 'loading'
          message?: string
        }
      ): void => callback(status)
      ipcRenderer.on('system:service-status-update', subscription)
      return (): void => {
        ipcRenderer.removeListener('system:service-status-update', subscription)
      }
    }
  },

  logs: {
    getOpenCodeLogs: (): Promise<string> => ipcRenderer.invoke('api:get-opencode-logs')
  },

  // Discord Service API
  discord: {
    connect: (): Promise<void> => ipcRenderer.invoke('discord:connect'),
    disconnect: (): Promise<void> => ipcRenderer.invoke('discord:disconnect'),
    getStatus: (): Promise<{
      connected: boolean
      username?: string
      botId?: string
      guilds?: number
    }> => ipcRenderer.invoke('discord:get-status'),
    setToken: (token: string): Promise<{ success: boolean }> =>
      ipcRenderer.invoke('discord:set-token', token),
    hasToken: (): Promise<boolean> => ipcRenderer.invoke('discord:has-token'),
    clearToken: (): Promise<{ success: boolean }> => ipcRenderer.invoke('discord:clear-token'),
    getDebugInfo: (): Promise<{
      connectionState: string
      isConnected: boolean
      hasClient: boolean
      hasToken: boolean
      lastError: string | null
      connectionAttemptTime: number | null
      clientUser: string | null
      guildsCount: number
    }> => ipcRenderer.invoke('discord:get-debug-info')
  }
}

// Use `contextBridge` APIs to expose Electron APIs to
// renderer only if context isolation is enabled, otherwise
// just add to the DOM global.
if (process.contextIsolated) {
  try {
    contextBridge.exposeInMainWorld('electron', electronAPI)
    contextBridge.exposeInMainWorld('api', api)
  } catch (error) {
    console.error(error)
  }
} else {
  // @ts-ignore (define in dts)
  window.electron = electronAPI
  // @ts-ignore (define in dts)
  window.api = api
}
