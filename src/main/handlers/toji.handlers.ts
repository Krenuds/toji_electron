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
      hasClient: toji.isReady() // isReady() already checks for both server and client
    }
  })

  // Server lifecycle handlers
  ipcMain.handle('toji:start-server', async () => {
    if (!toji) {
      throw new Error('Toji not initialized')
    }
    await toji.server.start()
    return toji.connectClient()
  })

  ipcMain.handle('toji:stop-server', async () => {
    if (!toji) {
      throw new Error('Toji not initialized')
    }
    return toji.server.stop()
  })

  ipcMain.handle('toji:get-server-status', async () => {
    if (!toji) {
      return {
        isRunning: false,
        port: undefined,
        pid: undefined,
        startTime: undefined,
        uptime: undefined,
        isHealthy: undefined,
        lastHealthCheck: undefined
      }
    }
    return toji.getServerStatus()
  })
}
