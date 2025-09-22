// Project-related IPC handlers
import { ipcMain, shell } from 'electron'
import type { Toji } from '../toji'

export function registerProjectHandlers(toji: Toji | null): void {
  // List all projects
  ipcMain.handle('toji:project:list', async () => {
    if (!toji) {
      throw new Error('Toji not initialized')
    }

    try {
      return await toji.project.list()
    } catch (error) {
      console.error('Failed to list projects:', error)
      throw error
    }
  })

  // Get current project
  ipcMain.handle('toji:project:current', async () => {
    if (!toji) {
      throw new Error('Toji not initialized')
    }

    try {
      return await toji.project.getCurrent()
    } catch (error) {
      console.error('Failed to get current project:', error)
      throw error
    }
  })

  // Open projects data folder
  ipcMain.handle('toji:project:open-folder', async () => {
    if (!toji) {
      throw new Error('Toji not initialized')
    }

    const projectsPath = toji.project.getDataPath()

    try {
      await shell.openPath(projectsPath)
    } catch (error) {
      console.error('Failed to open projects folder:', error)
      throw error
    }
  })
}
