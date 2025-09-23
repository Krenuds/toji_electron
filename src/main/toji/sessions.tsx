// Session Management for OpenCode SDK
import type { OpencodeClient, Message, Part } from '@opencode-ai/sdk'
import { createFileDebugLogger } from '../utils/logger'

const log = createFileDebugLogger('toji:sessions')

export interface SessionInfo {
  id: string
  title?: string
  projectPath?: string
  lastActive?: Date
}

export class SessionManager {
  // Per-project session tracking
  private sessionCache: Map<string, SessionInfo[]> = new Map()
  private activeSessionPerProject: Map<string, string> = new Map()
  private messageCache: Map<
    string,
    { messages: Array<{ info: Message; parts: Part[] }>; timestamp: number }
  > = new Map()

  // Cache TTL in milliseconds (5 seconds)
  private readonly CACHE_TTL = 5000

  /**
   * List sessions for current project
   */
  async listSessions(client: OpencodeClient, projectPath?: string): Promise<SessionInfo[]> {
    log('Listing sessions for project: %s', projectPath || 'default')

    try {
      const response = await client.session.list({
        query: projectPath ? { directory: projectPath } : undefined
      })

      if (response.error || !response.data) {
        throw new Error(`Failed to list sessions: ${response.error || 'No response data'}`)
      }

      const sessions: SessionInfo[] = response.data.map((session) => ({
        id: session.id,
        title: session.title || `Session ${session.id.slice(0, 8)}`,
        projectPath: projectPath,
        lastActive: new Date() // For now, just use current time
      }))

      // Cache the results
      if (projectPath) {
        this.sessionCache.set(projectPath, sessions)
      }

      log('Found %d sessions for project %s', sessions.length, projectPath || 'default')
      return sessions
    } catch (error) {
      log('ERROR: Failed to list sessions: %o', error)
      throw error
    }
  }

  /**
   * Create a new session
   */
  async createSession(
    client: OpencodeClient,
    title?: string,
    projectPath?: string
  ): Promise<SessionInfo> {
    log('Creating session: title="%s", project="%s"', title || 'untitled', projectPath || 'default')

    try {
      const response = await client.session.create({
        body: { title: title || `New Session ${new Date().toLocaleTimeString()}` },
        query: projectPath ? { directory: projectPath } : undefined
      })

      if (response.error || !response.data) {
        throw new Error(`Failed to create session: ${response.error || 'No response data'}`)
      }

      const sessionInfo: SessionInfo = {
        id: response.data.id,
        title: response.data.title,
        projectPath: projectPath,
        lastActive: new Date()
      }

      // Update cache
      if (projectPath) {
        const cached = this.sessionCache.get(projectPath) || []
        this.sessionCache.set(projectPath, [...cached, sessionInfo])
      }

      log('Created session: %s', sessionInfo.id)
      return sessionInfo
    } catch (error) {
      log('ERROR: Failed to create session: %o', error)
      throw error
    }
  }

  /**
   * Delete a session
   */
  async deleteSession(
    client: OpencodeClient,
    sessionId: string,
    projectPath?: string
  ): Promise<void> {
    log('Deleting session: %s', sessionId)

    try {
      const response = await client.session.delete({
        path: { id: sessionId },
        query: projectPath ? { directory: projectPath } : undefined
      })

      if (response.error) {
        throw new Error(`Failed to delete session: ${response.error}`)
      }

      // Update cache
      if (projectPath) {
        const cached = this.sessionCache.get(projectPath) || []
        this.sessionCache.set(
          projectPath,
          cached.filter((s) => s.id !== sessionId)
        )
      }

      // Clear message cache for this session
      this.messageCache.delete(sessionId)

      // Clear active session if it was deleted
      if (projectPath && this.activeSessionPerProject.get(projectPath) === sessionId) {
        this.activeSessionPerProject.delete(projectPath)
      }

      log('Deleted session: %s', sessionId)
    } catch (error) {
      log('ERROR: Failed to delete session: %o', error)
      throw error
    }
  }

  /**
   * Get session messages with caching
   */
  async getSessionMessages(
    client: OpencodeClient,
    sessionId: string,
    projectPath?: string,
    useCache = true
  ): Promise<Array<{ info: Message; parts: Part[] }>> {
    log('Getting messages for session: %s (useCache: %s)', sessionId, useCache)

    // Check cache first
    if (useCache && this.messageCache.has(sessionId)) {
      const cached = this.messageCache.get(sessionId)!
      if (Date.now() - cached.timestamp < this.CACHE_TTL) {
        log('Returning cached messages for session: %s', sessionId)
        return cached.messages
      }
    }

    try {
      const response = await client.session.messages({
        path: { id: sessionId },
        query: projectPath ? { directory: projectPath } : undefined
      })

      if (response.error || !response.data) {
        throw new Error(`Failed to get session messages: ${response.error || 'No response data'}`)
      }

      // Cache the results
      this.messageCache.set(sessionId, {
        messages: response.data,
        timestamp: Date.now()
      })

      log('Retrieved %d messages for session: %s', response.data.length, sessionId)
      return response.data
    } catch (error) {
      log('ERROR: Failed to get session messages: %o', error)
      throw error
    }
  }

  /**
   * Set active session for project
   */
  setActiveSession(sessionId: string, projectPath: string): void {
    log('Setting active session: %s for project: %s', sessionId, projectPath)
    this.activeSessionPerProject.set(projectPath, sessionId)
  }

  /**
   * Get active session for project
   */
  getActiveSession(projectPath: string): string | undefined {
    return this.activeSessionPerProject.get(projectPath)
  }

  /**
   * Clear message cache for a session
   */
  invalidateMessageCache(sessionId: string): void {
    log('Invalidating message cache for session: %s', sessionId)
    this.messageCache.delete(sessionId)
  }

  /**
   * Clear session cache for a project
   */
  invalidateSessionCache(projectPath: string): void {
    log('Invalidating session cache for project: %s', projectPath)
    this.sessionCache.delete(projectPath)
  }

  /**
   * Clear all caches
   */
  clearAllCaches(): void {
    log('Clearing all caches')
    this.sessionCache.clear()
    this.messageCache.clear()
    this.activeSessionPerProject.clear()
  }

  /**
   * Get cached sessions (for UI responsiveness)
   */
  getCachedSessions(projectPath: string): SessionInfo[] | undefined {
    return this.sessionCache.get(projectPath)
  }
}
