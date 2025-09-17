import { contextBridge, ipcRenderer, IpcRendererEvent } from 'electron'
import { electronAPI } from '@electron-toolkit/preload'
import type { BinaryInfo, BinaryProgress } from './index.d'

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
    prompt: (text: string): Promise<string> => ipcRenderer.invoke('core:prompt', text)
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
