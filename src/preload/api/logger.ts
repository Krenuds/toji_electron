// Logger API bridge for renderer process
import { ipcRenderer } from 'electron'

export const loggerAPI = {
  /**
   * Get the current log file path
   */
  getLogPath: (): Promise<string> => ipcRenderer.invoke('logger:getLogPath'),

  /**
   * Get the logs directory path
   */
  getLogDir: (): Promise<string> => ipcRenderer.invoke('logger:getLogDir')
}
