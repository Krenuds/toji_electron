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

  // Chat handlers
  ipcMain.handle('toji:chat', async (_, message: string, sessionId?: string) => {
    try {
      return await toji.chat(message, sessionId)
    } catch (error) {
      console.error('Chat error:', error)
      throw error
    }
  })

  ipcMain.handle('toji:clear-session', () => {
    toji.clearSession()
  })

  // Message history handlers
  ipcMain.handle('toji:get-session-messages', async (_, sessionId?: string, useCache = true) => {
    try {
      return await toji.getSessionMessages(sessionId, useCache)
    } catch (error) {
      console.error('Get session messages error:', error)
      throw error
    }
  })

  ipcMain.handle('toji:get-current-session-id', () => {
    return toji.getCurrentSessionId()
  })

  ipcMain.handle('toji:get-current-session', async () => {
    try {
      return await toji.getCurrentSession()
    } catch (error) {
      console.error('Get current session error:', error)
      throw error
    }
  })

  // Session management handlers
  ipcMain.handle('toji:list-sessions', async () => {
    try {
      return await toji.listSessions()
    } catch (error) {
      console.error('List sessions error:', error)
      throw error
    }
  })

  ipcMain.handle('toji:create-session', async (_, title?: string) => {
    try {
      return await toji.createSession(title)
    } catch (error) {
      console.error('Create session error:', error)
      throw error
    }
  })

  ipcMain.handle('toji:delete-session', async (_, sessionId: string) => {
    try {
      return await toji.deleteSession(sessionId)
    } catch (error) {
      console.error('Delete session error:', error)
      throw error
    }
  })

  ipcMain.handle('toji:switch-session', async (_, sessionId: string) => {
    try {
      return await toji.switchSession(sessionId)
    } catch (error) {
      console.error('Switch session error:', error)
      throw error
    }
  })
}
