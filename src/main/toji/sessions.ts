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
  // Changed: Use composite key (projectPath:sessionId) for message cache to prevent cross-project contamination
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
      // Normalize path to forward slashes for OpenCode API
      const normalizedPath = projectPath?.replace(/\\/g, '/')

      const response = await client.session.list({
        query: normalizedPath ? { directory: normalizedPath } : undefined
      })

      // Check if we got a valid response
      if (!response) {
        throw new Error('Failed to list sessions: No response data')
      }

      // Get existing cached sessions to preserve lastActive times
      const existingCache = this.sessionCache.get(projectPath || '') || []
      const existingSessionMap = new Map(existingCache.map((s) => [s.id, s]))

      // With responseStyle: 'data', response is the data directly
      // TypeScript needs explicit type assertion due to SDK type definitions
      const sessionsData = (response as unknown as Array<{ id: string; title?: string }>) || []
      const sessions: SessionInfo[] = sessionsData.map((session) => {
        const existing = existingSessionMap.get(session.id)
        return {
          id: session.id,
          title: session.title || `Session ${session.id.slice(0, 8)}`,
          projectPath: projectPath,
          // Preserve existing lastActive time, or use a reasonable default for unknown sessions
          lastActive: existing?.lastActive || new Date(Date.now() - 3600000) // 1 hour ago for unknown sessions
        }
      })

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
      // Normalize path to forward slashes for OpenCode API
      const normalizedPath = projectPath?.replace(/\\/g, '/')

      const response = await client.session.create({
        body: { title: title || `New Session ${new Date().toLocaleTimeString()}` },
        query: normalizedPath ? { directory: normalizedPath } : undefined
      })

      // Check if we got a valid response
      if (!response) {
        throw new Error('Failed to create session: No response data')
      }

      // With responseStyle: 'data', response is the Session directly
      // TypeScript needs explicit type assertion due to SDK type definitions
      const sessionData = response as unknown as { id: string; title?: string }
      const sessionInfo: SessionInfo = {
        id: sessionData.id,
        title: sessionData.title || title || `New Session ${new Date().toLocaleTimeString()}`,
        projectPath: projectPath,
        lastActive: new Date() // Mark as just created/active
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
      await client.session.delete({
        path: { id: sessionId },
        query: projectPath ? { directory: projectPath } : undefined
      })
      // With responseStyle: 'data', delete typically returns nothing on success

      // Update cache
      if (projectPath) {
        const cached = this.sessionCache.get(projectPath) || []
        this.sessionCache.set(
          projectPath,
          cached.filter((s) => s.id !== sessionId)
        )
      }

      // Clear message cache for this session (check all possible cache keys)
      this.messageCache.delete(sessionId) // Legacy key
      if (projectPath) {
        this.messageCache.delete(`${projectPath}:${sessionId}`) // Composite key
      }

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
    log(
      'Getting messages for session: %s in project: %s (useCache: %s)',
      sessionId,
      projectPath || 'default',
      useCache
    )

    // Create composite cache key to prevent cross-project contamination
    const cacheKey = projectPath ? `${projectPath}:${sessionId}` : sessionId

    // Check cache first
    if (useCache && this.messageCache.has(cacheKey)) {
      const cached = this.messageCache.get(cacheKey)!
      if (Date.now() - cached.timestamp < this.CACHE_TTL) {
        log(
          'Returning cached messages for session: %s in project: %s',
          sessionId,
          projectPath || 'default'
        )
        return cached.messages
      }
    }

    try {
      const response = await client.session.messages({
        path: { id: sessionId },
        query: projectPath ? { directory: projectPath } : undefined
      })

      // Check if we got a valid response
      if (!response) {
        throw new Error('Failed to get session messages: No response data')
      }

      // With responseStyle: 'data', response is the data directly
      // TypeScript needs explicit type assertion due to SDK type definitions
      const messages = (response as unknown as Array<{ info: Message; parts: Part[] }>) || []

      // Cache the results with composite key
      const cacheKey = projectPath ? `${projectPath}:${sessionId}` : sessionId
      this.messageCache.set(cacheKey, {
        messages: messages,
        timestamp: Date.now()
      })

      log('Retrieved %d messages for session: %s', messages.length, sessionId)
      return messages
    } catch (error) {
      log('ERROR: Failed to get session messages: %o', error)
      throw error
    }
  }

  /**
   * Set active session for project and update its lastActive time
   */
  setActiveSession(sessionId: string, projectPath: string): void {
    log('Setting active session: %s for project: %s', sessionId, projectPath)
    this.activeSessionPerProject.set(projectPath, sessionId)

    // Update lastActive time for this session in cache
    this.updateSessionLastActive(sessionId, projectPath)
  }

  /**
   * Update the lastActive time for a session in cache
   */
  private updateSessionLastActive(sessionId: string, projectPath: string): void {
    const cached = this.sessionCache.get(projectPath)
    if (cached) {
      const sessionIndex = cached.findIndex((s) => s.id === sessionId)
      if (sessionIndex !== -1) {
        cached[sessionIndex].lastActive = new Date()
        this.sessionCache.set(projectPath, cached)
        log('Updated lastActive for session: %s', sessionId)
      }
    }
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
  invalidateMessageCache(sessionId: string, projectPath?: string): void {
    log(
      'Invalidating message cache for session: %s in project: %s',
      sessionId,
      projectPath || 'all'
    )
    // Clear both legacy and composite keys
    this.messageCache.delete(sessionId)
    if (projectPath) {
      this.messageCache.delete(`${projectPath}:${sessionId}`)
    } else {
      // If no project path provided, clear all entries for this session
      for (const key of this.messageCache.keys()) {
        if (key.endsWith(`:${sessionId}`)) {
          this.messageCache.delete(key)
        }
      }
    }
  }

  /**
   * Clear session cache for a project
   */
  invalidateSessionCache(projectPath: string): void {
    log('Invalidating session cache for project: %s', projectPath)
    this.sessionCache.delete(projectPath)

    // Also clear message caches for all sessions in this project
    for (const key of this.messageCache.keys()) {
      if (key.startsWith(`${projectPath}:`)) {
        this.messageCache.delete(key)
      }
    }
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
