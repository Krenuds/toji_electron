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
    // Return undefined if no project/session active
    return toji.getCurrentSessionId() || undefined
  })

  ipcMain.handle('toji:get-current-session', async () => {
    try {
      // Return null if no client connected
      if (!toji.isReady()) {
        return null
      }
      return await toji.getCurrentSession()
    } catch (error) {
      console.error('Get current session error:', error)
      // Return null for graceful degradation
      return null
    }
  })

  // Session management handlers
  ipcMain.handle('toji:list-sessions', async () => {
    try {
      // Return empty array if no client is connected
      if (!toji.isReady()) {
        return []
      }
      return await toji.listSessions()
    } catch (error) {
      console.error('List sessions error:', error)
      // Return empty array instead of throwing for graceful degradation
      return []
    }
  })

  ipcMain.handle('toji:create-session', async (_, title?: string) => {
    try {
      // Check if client is connected first
      if (!toji.isReady()) {
        throw new Error('No project selected. Please open a project first.')
      }
      return await toji.createSession(title)
    } catch (error) {
      console.error('Create session error:', error)
      throw error
    }
  })

  ipcMain.handle('toji:delete-session', async (_, sessionId: string) => {
    try {
      // Check if client is connected first
      if (!toji.isReady()) {
        throw new Error('No project selected. Please open a project first.')
      }
      return await toji.deleteSession(sessionId)
    } catch (error) {
      console.error('Delete session error:', error)
      throw error
    }
  })

  ipcMain.handle('toji:switch-session', async (_, sessionId: string) => {
    try {
      // Check if client is connected first
      if (!toji.isReady()) {
        throw new Error('No project selected. Please open a project first.')
      }
      return await toji.switchSession(sessionId)
    } catch (error) {
      console.error('Switch session error:', error)
      throw error
    }
  })

  // Project management handlers
  ipcMain.handle(
    'toji:switchProject',
    // eslint-disable-next-line @typescript-eslint/no-unused-vars
    async (_, projectPath: string, _config?: Record<string, unknown>) => {
      try {
        return await toji.switchToProject(projectPath)
      } catch (error) {
        console.error('Switch project error:', error)
        throw error
      }
    }
  )

  ipcMain.handle('toji:getProjects', async () => {
    try {
      // Return empty array if no client is connected
      if (!toji.isReady()) {
        return []
      }
      return await toji.getAvailableProjects()
    } catch (error) {
      console.error('Get projects error:', error)
      // Return empty array for graceful degradation
      return []
    }
  })

  ipcMain.handle('toji:getCurrentProject', async () => {
    try {
      // Return null values if no project is active
      const projectDir = toji.getCurrentProjectDirectory()
      const sessionId = toji.getCurrentSessionId()

      return {
        path: projectDir || null,
        sessionId: sessionId || null
      }
    } catch (error) {
      console.error('Get current project error:', error)
      // Return null values for graceful degradation
      return {
        path: null,
        sessionId: null
      }
    }
  })
}
