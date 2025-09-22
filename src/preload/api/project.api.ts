// Project API for preload
import { ipcRenderer } from 'electron'

// Project type (temporary until we import from SDK)
export interface Project {
  id: string
  worktree: string
  vcs?: unknown
}

export const projectAPI = {
  // List all projects
  list: (): Promise<Project[]> => ipcRenderer.invoke('toji:project:list'),

  // Get current project
  current: (): Promise<Project | null> => ipcRenderer.invoke('toji:project:current'),

  // Open projects data folder
  openFolder: (): Promise<void> => ipcRenderer.invoke('toji:project:open-folder')
}
