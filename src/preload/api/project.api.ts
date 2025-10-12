// Project API for preload
import { ipcRenderer } from 'electron'

// Import types directly from SDK as recommended
import type { Project, Config } from '@opencode-ai/sdk'
export type { Project, Config }

// Enhanced project info with state
export interface ProjectInfo {
  path: string
  name: string
  sdkProject: Project
}

export const projectAPI = {
  // Core SDK methods
  list: (): Promise<Project[]> => ipcRenderer.invoke('toji:project:list'),
  current: (): Promise<Project | null> => ipcRenderer.invoke('toji:project:current'),
  getAll: (): Promise<ProjectInfo[]> => ipcRenderer.invoke('toji:project:get-all'),

  // Project management
  delete: (projectPath: string): Promise<void> =>
    ipcRenderer.invoke('toji:project:delete', projectPath)
}
