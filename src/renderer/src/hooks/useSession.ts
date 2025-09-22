import { useState, useCallback, useEffect } from 'react'
import type { Session } from '../../../preload/index.d'

interface UseSessionReturn {
  sessions: Session[]
  isLoading: boolean
  error: string | null
  currentSessionId: string | null
  fetchSessions: () => Promise<void>
  deleteSession: (sessionId: string) => Promise<boolean>
  createSession: (name?: string) => Promise<Session | null>
}

export function useSession(): UseSessionReturn {
  const [sessions, setSessions] = useState<Session[]>([])
  const [isLoading, setIsLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [currentSessionId, setCurrentSessionId] = useState<string | null>(null)

  const fetchSessions = useCallback(async (): Promise<void> => {
    setIsLoading(true)
    setError(null)

    try {
      const response = await window.api.toji.listSessions()
      setSessions(response || [])

      // Try to determine current session from the list
      if (response && response.length > 0) {
        // For now, assume the first session is current
        // In future, we might need a getCurrentSession API method
        setCurrentSessionId(response[0].id)
      }
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Failed to fetch sessions'
      setError(errorMessage)
      setSessions([])
    } finally {
      setIsLoading(false)
    }
  }, [])

  const deleteSession = useCallback(
    async (sessionId: string): Promise<boolean> => {
      setError(null)

      try {
        await window.api.toji.deleteSession(sessionId)

        // Remove from local state
        setSessions((prev) => prev.filter((s) => s.id !== sessionId))

        // Clear current if it was deleted
        if (currentSessionId === sessionId) {
          setCurrentSessionId(null)
        }

        return true
      } catch (error) {
        const errorMessage = error instanceof Error ? error.message : 'Failed to delete session'
        setError(errorMessage)
        return false
      }
    },
    [currentSessionId]
  )

  const createSession = useCallback(async (name?: string): Promise<Session | null> => {
    setError(null)

    try {
      // We don't have a direct create session API exposed through IPC
      // This would need to be added to the preload bridge
      // For now, return null
      console.warn('Create session not yet implemented in IPC bridge')
      if (name) {
        // Placeholder - would need IPC method
      }
      return null
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Failed to create session'
      setError(errorMessage)
      return null
    }
  }, [])

  // Fetch sessions on mount
  useEffect(() => {
    fetchSessions()
  }, [fetchSessions])

  return {
    sessions,
    isLoading,
    error,
    currentSessionId,
    fetchSessions,
    deleteSession,
    createSession
  }
}
