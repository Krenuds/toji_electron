import { contextBridge, ipcRenderer, IpcRendererEvent } from 'electron'
import { electronAPI } from '@electron-toolkit/preload'
import type { OpenCodeConfig, BinaryInfo, ServerStatus, BinaryProgress } from './index.d'

// Custom APIs for renderer
const api = {
  // OpenCode Binary Management
  opencode: {
    getBinaryInfo: (): Promise<BinaryInfo> => ipcRenderer.invoke('opencode:get-binary-info'),
    downloadBinary: (): Promise<void> => ipcRenderer.invoke('opencode:download-binary'),
    ensureBinary: (): Promise<void> => ipcRenderer.invoke('opencode:ensure-binary'),

    // Server Management
    startServer: (): Promise<ServerStatus> => ipcRenderer.invoke('opencode:start-server'),
    stopServer: (): Promise<void> => ipcRenderer.invoke('opencode:stop-server'),
    getServerStatus: (): Promise<ServerStatus> => ipcRenderer.invoke('opencode:get-server-status'),

    // Configuration
    updateConfig: (config: Partial<OpenCodeConfig>): Promise<void> =>
      ipcRenderer.invoke('opencode:update-config', config),

    // Events
    onServerStatusChange: (callback: (status: ServerStatus) => void): (() => void) => {
      const subscription = (
        _event: IpcRendererEvent,
        status: ServerStatus
      ): void => callback(status)
      ipcRenderer.on('opencode:server-status-changed', subscription)
      return (): void => {
        ipcRenderer.removeListener('opencode:server-status-changed', subscription)
      }
    },

    onBinaryUpdate: (callback: (progress: BinaryProgress) => void): (() => void) => {
      const subscription = (
        _event: IpcRendererEvent,
        progress: BinaryProgress
      ): void => callback(progress)
      ipcRenderer.on('opencode:binary-update', subscription)
      return (): void => {
        ipcRenderer.removeListener('opencode:binary-update', subscription)
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
