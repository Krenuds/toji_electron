// Project API for preload
import { ipcRenderer, type IpcRendererEvent } from 'electron'

// Import types directly from SDK as recommended
import type { Project, Config } from '@opencode-ai/sdk'
export type { Project, Config }

// Enhanced project info with state
export interface ProjectInfo {
  path: string
  name: string
  isOpen: boolean
  port?: number
  config?: Partial<Config>
  sdkProject?: Project
}

export const projectAPI = {
  // Legacy SDK methods (keeping for compatibility)
  list: (): Promise<Project[]> => ipcRenderer.invoke('toji:project:list'),
  current: (): Promise<Project | null> => ipcRenderer.invoke('toji:project:current'),
  openFolder: (): Promise<void> => ipcRenderer.invoke('toji:project:open-folder'),

  // New project lifecycle methods
  create: (directory: string, config?: Partial<Config>): Promise<void> =>
    ipcRenderer.invoke('toji:project:create', directory, config),

  open: (directory: string): Promise<number> => ipcRenderer.invoke('toji:project:open', directory),

  close: (directory: string): Promise<void> => ipcRenderer.invoke('toji:project:close', directory),

  setActive: (directory: string): Promise<void> =>
    ipcRenderer.invoke('toji:project:set-active', directory),

  getAll: (): Promise<ProjectInfo[]> => ipcRenderer.invoke('toji:project:get-all'),

  getConfig: (directory: string): Promise<Partial<Config>> =>
    ipcRenderer.invoke('toji:project:get-config', directory),

  getCurrentPath: (): Promise<string | null> => ipcRenderer.invoke('toji:project:get-current-path'),

  // Project events
  onProjectOpened: (callback: (data: { path: string; name: string }) => void): (() => void) => {
    const subscription = (_event: IpcRendererEvent, data: { path: string; name: string }): void =>
      callback(data)
    ipcRenderer.on('project:opened', subscription)
    return (): void => {
      ipcRenderer.removeListener('project:opened', subscription)
    }
  }
}
