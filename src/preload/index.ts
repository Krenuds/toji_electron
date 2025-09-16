import { contextBridge, ipcRenderer, IpcRendererEvent } from 'electron'
import { electronAPI } from '@electron-toolkit/preload'
import type { BinaryInfo, BinaryProgress } from './index.d'

// Custom APIs for renderer
const api = {
  // Core API - new centralized interface
  core: {
    // Service Management
    getStatus: (): Promise<any> => ipcRenderer.invoke('core:get-status'),
    startService: (serviceName: string): Promise<void> =>
      ipcRenderer.invoke('core:start-service', serviceName),
    stopService: (serviceName: string): Promise<void> =>
      ipcRenderer.invoke('core:stop-service', serviceName),
    getServiceStatus: (serviceName: string): Promise<any> =>
      ipcRenderer.invoke('core:get-service-status', serviceName),

    // Chat functionality
    sendMessage: (message: string): Promise<string> =>
      ipcRenderer.invoke('core:send-message', message),
    createSession: (title?: string): Promise<string> =>
      ipcRenderer.invoke('core:create-session', title),

    // Events
    onServiceStatusChange: (callback: (data: any) => void): (() => void) => {
      const subscription = (_event: IpcRendererEvent, data: any): void =>
        callback(data)
      ipcRenderer.on('core:service-status-changed', subscription)
      return (): void => {
        ipcRenderer.removeListener('core:service-status-changed', subscription)
      }
    },

    onServiceError: (callback: (data: any) => void): (() => void) => {
      const subscription = (_event: IpcRendererEvent, data: any): void =>
        callback(data)
      ipcRenderer.on('core:service-error', subscription)
      return (): void => {
        ipcRenderer.removeListener('core:service-error', subscription)
      }
    }
  },

  // OpenCode API - maintained for backward compatibility
  opencode: {
    getBinaryInfo: (): Promise<BinaryInfo> => ipcRenderer.invoke('opencode:get-binary-info'),
    downloadBinary: (): Promise<void> => ipcRenderer.invoke('opencode:download-binary'),
    ensureBinary: (): Promise<void> => ipcRenderer.invoke('opencode:ensure-binary'),

    // Events
    onBinaryUpdate: (callback: (progress: BinaryProgress) => void): (() => void) => {
      const subscription = (_event: IpcRendererEvent, progress: BinaryProgress): void =>
        callback(progress)
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
