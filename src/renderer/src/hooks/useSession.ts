import { useState, useCallback, useEffect } from 'react'
import type { Session } from '../../../preload/index.d'

interface UseSessionReturn {
  sessions: Session[]
  isLoading: boolean
  error: string | null
  getCurrentSessionId: () => Promise<string | undefined>
  fetchSessions: () => Promise<void>
  deleteSession: (sessionId: string) => Promise<boolean>
  createSession: (name?: string) => Promise<Session | null>
  switchSession: (sessionId: string) => Promise<boolean>
}

export function useSession(): UseSessionReturn {
  const [sessions, setSessions] = useState<Session[]>([])
  const [isLoading, setIsLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const fetchSessions = useCallback(async (): Promise<void> => {
    setIsLoading(true)
    setError(null)

    try {
      const response = await window.api.toji.listSessions()
      setSessions(response || [])
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Failed to fetch sessions'
      setError(errorMessage)
      setSessions([])
    } finally {
      setIsLoading(false)
    }
  }, [])

  const getCurrentSessionId = useCallback(async (): Promise<string | undefined> => {
    try {
      return await window.api.toji.getCurrentSessionId()
    } catch (error) {
      console.error('Failed to get current session ID:', error)
      return undefined
    }
  }, [])

  const deleteSession = useCallback(
    async (sessionId: string): Promise<boolean> => {
      setError(null)

      try {
        await window.api.toji.deleteSession(sessionId)

        // Refetch sessions to get updated list from backend
        await fetchSessions()

        return true
      } catch (error) {
        const errorMessage = error instanceof Error ? error.message : 'Failed to delete session'
        setError(errorMessage)
        return false
      }
    },
    [fetchSessions]
  )

  const createSession = useCallback(
    async (name?: string): Promise<Session | null> => {
      setError(null)

      try {
        const newSession = await window.api.toji.createSession(name)

        // Refetch sessions to get updated list from backend
        await fetchSessions()

        return newSession
      } catch (error) {
        const errorMessage = error instanceof Error ? error.message : 'Failed to create session'
        setError(errorMessage)
        return null
      }
    },
    [fetchSessions]
  )

  const switchSession = useCallback(async (sessionId: string): Promise<boolean> => {
    setError(null)

    try {
      await window.api.toji.switchSession(sessionId)

      // Emit event to notify other components (like ChatViewMain) to sync messages
      window.dispatchEvent(new CustomEvent('session-changed', { detail: { sessionId } }))

      return true
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Failed to switch session'
      setError(errorMessage)
      return false
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
    getCurrentSessionId,
    fetchSessions,
    deleteSession,
    createSession,
    switchSession
  }
}
