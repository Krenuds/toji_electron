// Binary management API for preload
import { ipcRenderer, IpcRendererEvent } from 'electron'

// Binary info types
export interface BinaryInfo {
  installed: boolean
  path?: string
  version?: string
}

export interface BinaryProgress {
  stage: 'downloading' | 'extracting' | 'complete' | 'error'
  progress?: number
  message?: string
  error?: string
}

export const binaryAPI = {
  // Binary info
  getInfo: (): Promise<BinaryInfo> => ipcRenderer.invoke('binary:get-info'),

  // Binary installation
  install: (): Promise<void> => ipcRenderer.invoke('binary:install'),

  // OpenCode logs
  getOpenCodeLogs: (): Promise<string> => ipcRenderer.invoke('api:get-opencode-logs'),

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
