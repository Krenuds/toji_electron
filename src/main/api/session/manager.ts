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
    // TODO: Next session - implement prompt functionality
    // - Get client from clientManager
    // - Use client.session.prompt() with proper parts structure
    // - Handle response and extract text
    // - Update current session if needed
    throw new Error('SessionManager.prompt() - To be implemented in next session')
  }

  /**
   * List all sessions
   */
  async list(): Promise<{ data: Session[] }> {
    // TODO: Next session - implement session listing
    // - Use client.session.list()
    // - Return standardized response format
    throw new Error('SessionManager.list() - To be implemented in next session')
  }

  /**
   * Get a specific session
   */
  async get(sessionId: string): Promise<Session> {
    // TODO: Next session - implement session retrieval
    throw new Error('SessionManager.get() - To be implemented in next session')
  }

  /**
   * Create a new session
   */
  async create(): Promise<Session> {
    // TODO: Next session - implement session creation
    throw new Error('SessionManager.create() - To be implemented in next session')
  }

  /**
   * Delete a session
   */
  async delete(sessionId: string): Promise<void> {
    // TODO: Next session - implement session deletion
    throw new Error('SessionManager.delete() - To be implemented in next session')
  }

  /**
   * Get messages for a session
   */
  async getMessages(sessionId: string): Promise<any[]> {
    // TODO: Next session - implement message retrieval
    throw new Error('SessionManager.getMessages() - To be implemented in next session')
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
