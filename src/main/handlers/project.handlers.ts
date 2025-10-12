// Project-related IPC handlers
import { ipcMain } from 'electron'
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

  // Get all projects with states
  ipcMain.handle('toji:project:get-all', async () => {
    try {
      return await toji.project.getAllProjects()
    } catch (error) {
      console.error('Failed to get all projects:', error)
      throw error
    }
  })

  // Delete a project
  ipcMain.handle('toji:project:delete', async (_, projectPath: string) => {
    return await toji.project.deleteProject(projectPath)
  })
}
