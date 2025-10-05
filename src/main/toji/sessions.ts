// Session Management for OpenCode SDK
import type { OpencodeClient, Message, Part, Session as SdkSession } from '@opencode-ai/sdk'
import { createLogger } from '../utils/logger'
import type { Session } from './types'

const logger = createLogger('toji:sessions')

export class SessionManager {
  // Per-project session tracking
  private sessionCache: Map<string, Session[]> = new Map()
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
  async listSessions(client: OpencodeClient, projectPath?: string): Promise<Session[]> {
    logger.debug('Listing sessions for project: %s', projectPath || 'default')

    try {
      // Normalize path to forward slashes for OpenCode API
      const normalizedPath = projectPath?.replace(/\\/g, '/')

      const response = await client.session.list({
        query: normalizedPath ? { directory: normalizedPath } : undefined
      })

      // Check if we got a valid response
      if (!response) {
        logger.debug('No sessions response (likely uninitialized project), returning empty array')
        return []
      }

      // Get existing cached sessions to preserve lastActive times
      const existingCache = this.sessionCache.get(projectPath || '') || []
      const existingSessionMap = new Map(existingCache.map((s) => [s.id, s]))

      let sessionsData: SdkSession[] = []
      if (Array.isArray(response)) {
        sessionsData = response as unknown as SdkSession[]
      } else if (response && typeof response === 'object') {
        const { data, error } = response as { data?: SdkSession[]; error?: unknown }
        if (error) {
          throw new Error('Failed to list sessions: Unexpected error response')
        }
        sessionsData = data ?? []
      }
      const sessions: Session[] = sessionsData.map((session) => {
        const existing = existingSessionMap.get(session.id)
        return this.toSession(session, projectPath, existing?.lastActive)
      })

      // Cache the results
      if (projectPath) {
        this.sessionCache.set(projectPath, sessions)
      }

      logger.debug('Found %d sessions for project %s', sessions.length, projectPath || 'default')
      return sessions
    } catch (error) {
      logger.debug('ERROR: Failed to list sessions: %o', error)
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
  ): Promise<Session> {
    logger.debug(
      'Creating session: title="%s", project="%s"',
      title || 'untitled',
      projectPath || 'default'
    )

    try {
      // Normalize path to forward slashes for OpenCode API
      const normalizedPath = projectPath?.replace(/\\/g, '/')

      const response = await client.session.create({
        body: { title: title || `New Session ${new Date().toLocaleTimeString()}` },
        query: normalizedPath ? { directory: normalizedPath } : undefined
      })

      // Check if we got a valid response
      if (!response) {
        logger.debug('No response when creating session (likely uninitialized project)')
        throw new Error('Cannot create session: Project not initialized')
      }

      let rawSession: SdkSession | undefined
      if (Array.isArray(response)) {
        rawSession = (response as unknown as SdkSession[])[0]
      } else if (response && typeof response === 'object') {
        const { data, error } = response as { data?: SdkSession; error?: unknown }
        if (error) {
          throw new Error('Failed to create session: Unexpected error response')
        }
        rawSession = data ?? (response as unknown as SdkSession)
      } else {
        rawSession = response as unknown as SdkSession
      }

      if (!rawSession) {
        throw new Error('Failed to create session: Invalid response data')
      }

      const sessionInfo = this.toSession(rawSession, projectPath, new Date(), title)

      // Update cache
      if (projectPath) {
        const cached = this.sessionCache.get(projectPath) || []
        this.sessionCache.set(projectPath, [...cached, sessionInfo])
      }

      logger.debug('Created session: %s', sessionInfo.id)
      return sessionInfo
    } catch (error) {
      logger.debug('ERROR: Failed to create session: %o', error)
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
    logger.debug('Deleting session: %s', sessionId)

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

      logger.debug('Deleted session: %s', sessionId)
    } catch (error) {
      logger.debug('ERROR: Failed to delete session: %o', error)
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
    logger.debug(
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
        logger.debug(
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
        logger.debug(
          'No response for session messages (likely uninitialized project), returning empty array'
        )
        return []
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

      logger.debug('Retrieved %d messages for session: %s', messages.length, sessionId)
      return messages
    } catch (error) {
      logger.debug('ERROR: Failed to get session messages: %o', error)
      throw error
    }
  }

  /**
   * Set active session for project and update its lastActive time
   */
  setActiveSession(sessionId: string, projectPath: string): void {
    logger.debug('Setting active session: %s for project: %s', sessionId, projectPath)
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
        logger.debug('Updated lastActive for session: %s', sessionId)
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
    logger.debug(
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
    logger.debug('Invalidating session cache for project: %s', projectPath)
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
    logger.debug('Clearing all caches')
    this.sessionCache.clear()
    this.messageCache.clear()
    this.activeSessionPerProject.clear()
  }

  /**
   * Get cached sessions (for UI responsiveness)
   */
  getCachedSessions(projectPath: string): Session[] | undefined {
    return this.sessionCache.get(projectPath)
  }

  /**
   * Convert raw SDK session to augmented session with local metadata
   */
  private toSession(
    raw: SdkSession,
    projectPath?: string,
    lastActive?: Date,
    titleOverride?: string
  ): Session {
    const createdAt = new Date(raw.time.created)
    const updatedAt = new Date(raw.time.updated)

    return {
      ...raw,
      title: raw.title ?? titleOverride ?? `Session ${raw.id.slice(0, 8)}`,
      projectPath,
      created: createdAt,
      updated: updatedAt,
      lastActive: lastActive ?? updatedAt
    }
  }
}
