import { useState, useCallback, useRef } from 'react'
import type { Session } from '../../../../preload/index.d'
import { usePersistedState } from '../usePersistedState'
import { CACHE_KEYS } from '../../constants/cacheKeys'

// ============================================================================
// Type Definitions
// ============================================================================

interface CurrentProject {
  path: string
  sessionId?: string
}

interface SessionState {
  sessions: Session[]
  currentSessionId: string | undefined
  isLoadingSessions: boolean
  sessionError: string | null
}

export interface UseSessionManagerReturn extends SessionState {
  createSession: (name?: string) => Promise<void>
  deleteSession: (sessionId: string) => Promise<void>
  switchSession: (sessionId: string) => Promise<void>
  loadSessions: () => Promise<Session[]>
  loadCachedSession: () => void
  setSessions: (sessions: Session[]) => void
  setCurrentSessionId: (sessionId: string | undefined) => void
  setIsLoadingSessions: (loading: boolean) => void
  setSessionError: (error: string | null) => void
}

// ============================================================================
// Hook Implementation
// ============================================================================

export function useSessionManager(currentProject: CurrentProject | null): UseSessionManagerReturn {
  // Persisted state for current session
  const [currentSessionId, setCurrentSessionId] = usePersistedState<string | undefined>(
    CACHE_KEYS.LAST_SESSION,
    undefined
  )

  // Non-persisted state
  const [state, setState] = useState({
    sessions: [] as Session[],
    isLoadingSessions: false,
    sessionError: null as string | null
  })

  // Refs to prevent race conditions
  const switchingSessionRef = useRef(false)

  // Load cached session (now handled by usePersistedState, but kept for API compatibility)
  const loadCachedSession = useCallback(() => {
    // No-op: usePersistedState automatically loads cached data on mount
  }, [])

  // Load sessions for current project
  const loadSessions = useCallback(async (): Promise<Session[]> => {
    console.log('[SessionManager.loadSessions] Current project:', currentProject)
    if (!currentProject) {
      console.log('[SessionManager.loadSessions] No current project, clearing sessions')
      setState((prev) => ({ ...prev, sessions: [] }))
      setCurrentSessionId(undefined)
      return []
    }

    console.log('[SessionManager.loadSessions] Loading sessions for project:', currentProject.path)
    setState((prev) => ({ ...prev, isLoadingSessions: true, sessionError: null }))

    try {
      const sessions = await window.api.toji.listSessions()
      console.log('[SessionManager.loadSessions] Loaded sessions:', sessions)
      setState((prev) => ({ ...prev, sessions: sessions || [] }))

      // Get current session from backend
      const currentId = await window.api.toji.getCurrentSessionId()
      console.log('[SessionManager.loadSessions] Current session ID:', currentId)
      setCurrentSessionId(currentId)

      return sessions || []
    } catch {
      // Backend handles error logging
      setState((prev) => ({
        ...prev,
        sessions: [],
        sessionError: 'Failed to load sessions'
      }))
      return []
    } finally {
      setState((prev) => ({ ...prev, isLoadingSessions: false }))
    }
  }, [currentProject, setCurrentSessionId])

  // Create session
  const createSession = useCallback(
    async (name?: string) => {
      if (!currentProject) return

      setState((prev) => ({ ...prev, isLoadingSessions: true, sessionError: null }))

      try {
        const newSession = await window.api.toji.createSession(
          name || `Session ${new Date().toLocaleTimeString()}`
        )

        if (newSession) {
          // Optimistically add to list
          setState((prev) => ({
            ...prev,
            sessions: [...prev.sessions, newSession]
          }))
          setCurrentSessionId(newSession.id)

          // Switch to new session
          await window.api.toji.switchSession(newSession.id)

          // Reload sessions to ensure sync
          await loadSessions()
        }
      } catch (error) {
        console.error('Failed to create session:', error)
        setState((prev) => ({ ...prev, sessionError: 'Failed to create session' }))
        // Reload to restore correct state
        await loadSessions()
      } finally {
        setState((prev) => ({ ...prev, isLoadingSessions: false }))
      }
    },
    [currentProject, loadSessions, setCurrentSessionId]
  )

  // Delete session
  const deleteSession = useCallback(
    async (sessionId: string) => {
      setState((prev) => ({ ...prev, sessionError: null }))

      // Optimistically remove from list
      setState((prev) => ({
        ...prev,
        sessions: prev.sessions.filter((s) => s.id !== sessionId)
      }))

      try {
        await window.api.toji.deleteSession(sessionId)

        // If we deleted the current session, clear it
        if (currentSessionId === sessionId) {
          setCurrentSessionId(undefined)
        }

        // Reload sessions
        await loadSessions()
      } catch (error) {
        console.error('Failed to delete session:', error)
        setState((prev) => ({ ...prev, sessionError: 'Failed to delete session' }))
        // Reload to restore correct state
        await loadSessions()
      }
    },
    [currentSessionId, loadSessions, setCurrentSessionId]
  )

  // Switch session
  const switchSession = useCallback(
    async (sessionId: string) => {
      if (switchingSessionRef.current || currentSessionId === sessionId) {
        return
      }
      switchingSessionRef.current = true

      setState((prev) => ({ ...prev, sessionError: null }))

      try {
        // Update state FIRST so other hooks have the right context
        setCurrentSessionId(sessionId)

        // Then switch in backend
        await window.api.toji.switchSession(sessionId)
      } catch (error) {
        console.error('Failed to switch session:', error)
        setState((prev) => ({ ...prev, sessionError: 'Failed to switch session' }))
      } finally {
        switchingSessionRef.current = false
      }
    },
    [currentSessionId, setCurrentSessionId]
  )

  // Setters for external coordination
  const setSessions = useCallback((sessions: Session[]) => {
    setState((prev) => ({ ...prev, sessions }))
  }, [])

  const setIsLoadingSessions = useCallback((loading: boolean) => {
    setState((prev) => ({ ...prev, isLoadingSessions: loading }))
  }, [])

  const setSessionError = useCallback((error: string | null) => {
    setState((prev) => ({ ...prev, sessionError: error }))
  }, [])

  return {
    ...state,
    currentSessionId,
    createSession,
    deleteSession,
    switchSession,
    loadSessions,
    loadCachedSession,
    setSessions,
    setCurrentSessionId,
    setIsLoadingSessions,
    setSessionError
  }
}
