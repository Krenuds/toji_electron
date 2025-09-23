// IPC handlers for logger utilities
import { ipcMain } from 'electron'
import { getLogPath, getLogDir } from '../utils/logger'

export function registerLoggerHandlers(): void {
  // Get current log file path
  ipcMain.handle('logger:getLogPath', async (): Promise<string> => {
    return getLogPath()
  })

  // Get logs directory path
  ipcMain.handle('logger:getLogDir', async (): Promise<string> => {
    return getLogDir()
  })
}
