// Project-related IPC handlers
import { ipcMain, shell, app } from 'electron'
import { join } from 'path'
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
    const userData = app.getPath('userData')
    const projectsPath = join(userData, 'opencode-data', 'projects')

    try {
      await shell.openPath(projectsPath)
    } catch (error) {
      console.error('Failed to open projects folder:', error)
      throw error
    }
  })
}
