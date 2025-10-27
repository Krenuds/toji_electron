/**
 * Centralized cache keys for localStorage
 *
 * This ensures consistency across the application and makes it easy to:
 * - Find all cache keys in one place
 * - Avoid typos and key collisions
 * - Update keys in a single location
 * - Track what data is being cached
 */
export const CACHE_KEYS = {
  /**
   * Stores the last opened project path and session ID
   * Type: CurrentProject | null
   */
  LAST_PROJECT: 'toji3_last_project',

  /**
   * Stores the last active session ID
   * Type: string | undefined
   */
  LAST_SESSION: 'toji3_last_session',

  /**
   * Stores cached messages for a specific session
   * Type: ChatMessage[]
   * @param sessionId - The session ID to cache messages for
   */
  CACHED_MESSAGES: (sessionId: string) => `toji3_cached_messages_${sessionId}`
} as const
