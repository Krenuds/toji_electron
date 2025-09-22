// Core Toji handlers for IPC
import { ipcMain } from 'electron'
import type { Toji } from '../toji'

export function registerTojiHandlers(toji: Toji | null): void {
  // Check if Toji is ready
  ipcMain.handle('toji:is-ready', () => {
    return toji?.isReady() || false
  })

  // Get server status
  ipcMain.handle('toji:status', () => {
    if (!toji) {
      return { ready: false, message: 'Toji not initialized' }
    }
    return {
      ready: toji.isReady(),
      hasClient: Boolean(toji.getClient())
    }
  })
}
