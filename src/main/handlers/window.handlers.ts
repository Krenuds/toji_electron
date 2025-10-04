// Window control IPC handlers
import { ipcMain, BrowserWindow, dialog, shell } from 'electron'

export function registerWindowHandlers(): void {
  // Minimize window
  ipcMain.handle('window:minimize', async () => {
    const mainWindow = BrowserWindow.getAllWindows()[0]
    if (mainWindow) {
      mainWindow.minimize()
    }
  })

  // Maximize/restore window
  ipcMain.handle('window:maximize', async () => {
    const mainWindow = BrowserWindow.getAllWindows()[0]
    if (mainWindow) {
      if (mainWindow.isMaximized()) {
        mainWindow.restore()
      } else {
        mainWindow.maximize()
      }
    }
  })

  // Close window
  ipcMain.handle('window:close', async () => {
    const mainWindow = BrowserWindow.getAllWindows()[0]
    if (mainWindow) {
      mainWindow.close()
    }
  })

  // Select directory dialog
  ipcMain.handle('window:select-directory', async () => {
    const mainWindow = BrowserWindow.getAllWindows()[0]
    if (!mainWindow) {
      throw new Error('No window available')
    }

    const result = await dialog.showOpenDialog(mainWindow, {
      properties: ['openDirectory'],
      title: 'Select Project Directory',
      buttonLabel: 'Select Folder'
    })

    if (result.canceled) {
      return null
    }

    return result.filePaths[0]
  })

  // Open folder in file explorer
  ipcMain.handle('window:open-folder', async (_, folderPath: string) => {
    await shell.openPath(folderPath)
  })
}
