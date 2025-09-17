import { contextBridge, ipcRenderer, IpcRendererEvent } from 'electron'
import { electronAPI } from '@electron-toolkit/preload'
import type { BinaryInfo, BinaryProgress } from './index.d'
import type { Project, Session } from '../main/core/core'

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
      ipcRenderer.invoke('core:delete-session', sessionId)
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
