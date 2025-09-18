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
      const responseData = response.data as any // Type assertion since SDK types are incomplete

      // Check if response has parts array
      if (Array.isArray(responseData.parts)) {
        // Get ALL text content (reasoning + text)
        const textContent = responseData.parts
          .filter(
            (part: any) =>
              part &&
              typeof part === 'object' &&
              (part.type === 'text' || part.type === 'reasoning')
          )
          .map((part: any) => part.text || '')
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
        if (typeof responseData.text === 'string') {
          console.log('SessionManager: Text property found:', responseData.text)
          return responseData.text
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
    const client = this.clientManager.getClientForManager()
    const response = await client.session.list()

    return {
      data: response.data || []
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
}
