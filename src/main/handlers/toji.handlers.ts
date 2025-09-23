// Core Toji handlers for IPC
import { ipcMain } from 'electron'
import type { Toji } from '../toji'

export function registerTojiHandlers(toji: Toji): void {
  // Check if Toji is ready
  ipcMain.handle('toji:is-ready', () => {
    return toji.isReady()
  })

  // Get server status
  ipcMain.handle('toji:status', () => {
    return {
      ready: toji.isReady(),
      hasClient: toji.isReady() // isReady() already checks for both server and client
    }
  })

  // Server lifecycle handlers
  ipcMain.handle('toji:start-server', async () => {
    await toji.server.start()
    return toji.connectClient()
  })

  ipcMain.handle('toji:stop-server', async () => {
    return toji.server.stop()
  })

  ipcMain.handle('toji:get-server-status', async () => {
    return toji.getServerStatus()
  })
}
