// Project-related IPC handlers
import { ipcMain, shell } from 'electron'
import type { Config } from '@opencode-ai/sdk'
import type { Toji } from '../toji'

export function registerProjectHandlers(toji: Toji): void {
  // List all projects
  ipcMain.handle('toji:project:list', async () => {
    try {
      return await toji.project.list()
    } catch (error) {
      console.error('Failed to list projects:', error)
      throw error
    }
  })

  // Get current project
  ipcMain.handle('toji:project:current', async () => {
    try {
      return await toji.project.getCurrent()
    } catch (error) {
      console.error('Failed to get current project:', error)
      throw error
    }
  })

  // Open projects data folder
  ipcMain.handle('toji:project:open-folder', async () => {
    const projectsPath = toji.project.getDataPath()

    try {
      await shell.openPath(projectsPath)
    } catch (error) {
      console.error('Failed to open projects folder:', error)
      throw error
    }
  })

  // Create new project
  ipcMain.handle('toji:project:create', async (_, directory: string, config?: Partial<Config>) => {
    try {
      await toji.project.createProject(directory, config)
    } catch (error) {
      console.error('Failed to create project:', error)
      throw error
    }
  })

  // Open project (start server)
  ipcMain.handle('toji:project:open', async (_, directory: string) => {
    try {
      return await toji.project.openProject(directory)
    } catch (error) {
      console.error('Failed to open project:', error)
      throw error
    }
  })

  // Close project (stop server)
  ipcMain.handle('toji:project:close', async (_, directory: string) => {
    try {
      await toji.project.closeProject(directory)
    } catch (error) {
      console.error('Failed to close project:', error)
      throw error
    }
  })

  // Set active project
  ipcMain.handle('toji:project:set-active', async (_, directory: string) => {
    try {
      await toji.project.setActiveProject(directory)
    } catch (error) {
      console.error('Failed to set active project:', error)
      throw error
    }
  })

  // Get all projects with states
  ipcMain.handle('toji:project:get-all', async () => {
    try {
      return await toji.project.getAllProjects()
    } catch (error) {
      console.error('Failed to get all projects:', error)
      throw error
    }
  })

  // Get project configuration
  ipcMain.handle('toji:project:get-config', async (_, directory: string) => {
    try {
      // TODO: Implement config access through toji
      console.log('Getting config for directory:', directory)
      return {}
    } catch (error) {
      console.error('Failed to get project config:', error)
      throw error
    }
  })

  // Get current project path
  ipcMain.handle('toji:project:get-current-path', async () => {
    try {
      return toji.getCurrentProjectDirectory() || null
    } catch (error) {
      console.error('Failed to get current project path:', error)
      throw error
    }
  })
}
