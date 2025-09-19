// ============================================
// Session Manager - Session Operations and Management
// ============================================

import type { Session, Part } from '@opencode-ai/sdk'
import type { ClientManager } from '../client'

/**
 * Manages OpenCode sessions, providing enhanced session operations
 * on top of the raw SDK client. This includes session lifecycle,
 * message handling, and session history management.
 */
export class SessionManager {
  private currentSession?: Session
  private sessionIdentifiers: Map<string, string> = new Map() // Maps identifiers to session IDs

  constructor(private clientManager: ClientManager) {}

  /**
   * Send a prompt to the current or specified session
   */
  async prompt(text: string, sessionId?: string): Promise<string> {
    const client = this.clientManager.getClientForManager()

    // Use specified session or current session
    const targetSessionId = sessionId || this.currentSession?.id
    if (!targetSessionId) {
      throw new Error('No session specified and no current session available')
    }

    // Create proper text part input
    const parts = [
      {
        type: 'text' as const,
        text
      }
    ]

    // Send prompt using exact SDK signature
    const response = await client.session.prompt({
      path: { id: targetSessionId },
      body: {
        model: {
          providerID: 'opencode',
          modelID: 'grok-code'
        },
        parts
      }
    })

    console.log('SessionManager: Raw response:', JSON.stringify(response, null, 2))

    // Extract text from response - handle different possible response structures
    if (response.data) {
      const responseData = response.data as unknown // Type assertion since SDK types are incomplete

      // Check if response has parts array
      if (
        responseData &&
        typeof responseData === 'object' &&
        'parts' in responseData &&
        Array.isArray((responseData as { parts: unknown[] }).parts)
      ) {
        const dataWithParts = responseData as { parts: Array<{ type?: string; text?: string }> }
        // Get ALL text content (reasoning + text)
        const textContent = dataWithParts.parts
          .filter(
            (part) =>
              part &&
              typeof part === 'object' &&
              (part.type === 'text' || part.type === 'reasoning')
          )
          .map((part) => part.text || '')
          .filter(Boolean)
          .join('\n')

        if (textContent) {
          console.log('SessionManager: Extracted text from parts:', textContent)
          return textContent
        }
      }

      // Check if response has direct text property
      if (typeof responseData === 'string') {
        console.log('SessionManager: Direct string response:', responseData)
        return responseData
      }

      // Check if response.data has a text property
      if (responseData && typeof responseData === 'object' && 'text' in responseData) {
        const dataWithText = responseData as { text: unknown }
        if (typeof dataWithText.text === 'string') {
          console.log('SessionManager: Text property found:', dataWithText.text)
          return dataWithText.text
        }
      }
    }

    console.warn('SessionManager: Could not extract text from response:', response)
    return 'Sorry, I received an empty response.'
  }

  /**
   * List all sessions
   */
  async list(): Promise<{ data: Session[] }> {
    try {
      const client = this.clientManager.getClientForManager()
      const response = await client.session.list()

      return {
        data: response.data || []
      }
    } catch (error) {
      // If client not initialized, return empty list
      console.log('SessionManager: Client not initialized, returning empty session list')
      return { data: [] }
    }
  }

  /**
   * Get a specific session
   */
  async get(sessionId: string): Promise<Session> {
    const client = this.clientManager.getClientForManager()
    const response = await client.session.get({ path: { id: sessionId } })

    if (!response.data) {
      throw new Error(`Session ${sessionId} not found`)
    }

    return response.data
  }

  /**
   * Create a new session
   */
  async create(title?: string): Promise<Session> {
    const client = this.clientManager.getClientForManager()
    const response = await client.session.create({
      body: { title }
    })

    if (!response.data) {
      throw new Error('Failed to create session')
    }

    // Set as current session
    this.currentSession = response.data
    return response.data
  }

  /**
   * Delete a session
   */
  async delete(sessionId: string): Promise<void> {
    const client = this.clientManager.getClientForManager()
    await client.session.delete({ path: { id: sessionId } })

    // Clear current session if it was deleted
    if (this.currentSession?.id === sessionId) {
      this.currentSession = undefined
    }
  }

  /**
   * Get messages for a session
   */
  async getMessages(sessionId: string): Promise<Part[]> {
    const session = await this.get(sessionId)
    // Note: Session type may contain messages - this needs verification from actual SDK
    return (session as { messages?: Part[] }).messages || []
  }

  /**
   * Get current session
   */
  getCurrentSession(): Session | undefined {
    return this.currentSession
  }

  /**
   * Set current session
   */
  setCurrentSession(session: Session): void {
    this.currentSession = session
  }

  /**
   * Get a session by its external identifier
   * @param identifier - External identifier (e.g., Discord channel ID)
   * @returns The session if found, undefined otherwise
   */
  async getByIdentifier(identifier: string): Promise<Session | undefined> {
    const sessionId = this.sessionIdentifiers.get(identifier)
    if (!sessionId) {
      return undefined
    }

    try {
      return await this.get(sessionId)
    } catch {
      // Session may have been deleted
      this.sessionIdentifiers.delete(identifier)
      return undefined
    }
  }

  /**
   * Set or update the identifier mapping for a session
   * @param sessionId - The OpenCode session ID
   * @param identifier - External identifier to map
   */
  async setSessionIdentifier(sessionId: string, identifier: string): Promise<void> {
    // First verify the session exists
    await this.get(sessionId)
    this.sessionIdentifiers.set(identifier, sessionId)
  }

  /**
   * Get or create a session by identifier
   * @param identifier - External identifier for the session
   * @param title - Optional title for new sessions
   * @returns The session (existing or newly created) and whether it was created
   */
  async getOrCreateSession(
    identifier: string,
    title?: string
  ): Promise<{
    session: Session
    isNew: boolean
  }> {
    const existingSession = await this.getByIdentifier(identifier)

    if (existingSession) {
      return {
        session: existingSession,
        isNew: false
      }
    }

    const newSession = await this.create(title || `Session ${identifier}`)
    await this.setSessionIdentifier(newSession.id, identifier)

    return {
      session: newSession,
      isNew: true
    }
  }

  /**
   * Get session context (recent messages)
   * @param sessionId - The session ID
   * @param limit - Maximum number of messages to return
   * @returns Array of message parts
   */
  async getSessionContext(sessionId: string, limit = 10): Promise<Part[]> {
    const messages = await this.getMessages(sessionId)
    return messages.slice(-limit)
  }

  /**
   * Cleanup inactive sessions
   * @param _maxAge - Maximum age in milliseconds (unused until session timestamps are available)
   */
  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  async cleanupInactiveSessions(_maxAge: number): Promise<void> {
    // OpenCode SDK sessions don't have a createdAt field by default
    // For now, we'll skip cleanup until we can track session age properly
    // This would require extending the session data with metadata
    console.log('Session cleanup not implemented - sessions lack timestamp metadata')
  }
}
