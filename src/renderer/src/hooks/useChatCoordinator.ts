import { useState, useCallback, useEffect, useRef } from 'react'
import { formatMessagesFromSDK, type ChatMessage } from '../utils/messageFormatter'
import type { Session } from '../../../preload/index.d'

interface Project {
  worktree: string
}

interface CurrentProject {
  path: string
  sessionId?: string
}

interface ChatState {
  // Projects
  projects: Project[]
  currentProject: CurrentProject | null

  // Sessions
  sessions: Session[]
  currentSessionId: string | undefined

  // Messages
  messages: ChatMessage[]

  // Server status
  serverStatus: 'offline' | 'online' | 'initializing'

  // Loading states
  isLoadingProjects: boolean
  isLoadingSessions: boolean
  isLoadingMessages: boolean
  isSendingMessage: boolean

  // Error states
  projectError: string | null
  sessionError: string | null
  messageError: string | null
}

interface UseChatCoordinatorReturn extends ChatState {
  // Project actions
  switchProject: (projectPath: string) => Promise<void>
  openProjectDialog: () => Promise<void>

  // Session actions
  createSession: (name?: string) => Promise<void>
  deleteSession: (sessionId: string) => Promise<void>
  switchSession: (sessionId: string) => Promise<void>

  // Message actions
  sendMessage: (message: string) => Promise<void>

  // Utility actions
  refreshAll: () => Promise<void>
  clearErrors: () => void
}

// Cache keys for localStorage
const CACHE_KEYS = {
  LAST_PROJECT: 'toji3_last_project',
  LAST_SESSION: 'toji3_last_session',
  CACHED_MESSAGES: 'toji3_cached_messages'
} as const

export function useChatCoordinator(): UseChatCoordinatorReturn {
  // Core state
  const [state, setState] = useState<ChatState>({
    projects: [],
    currentProject: null,
    sessions: [],
    currentSessionId: undefined,
    messages: [],
    serverStatus: 'offline',
    isLoadingProjects: false,
    isLoadingSessions: false,
    isLoadingMessages: false,
    isSendingMessage: false,
    projectError: null,
    sessionError: null,
    messageError: null
  })

  // Refs to track ongoing operations and prevent race conditions
  const initializingRef = useRef(false)
  const switchingProjectRef = useRef(false)
  const switchingSessionRef = useRef(false)
  const pollingIntervalRef = useRef<NodeJS.Timeout | null>(null)

  // Helper to update state partially
  const updateState = useCallback((updates: Partial<ChatState>) => {
    setState((prev) => ({ ...prev, ...updates }))
  }, [])

  // Load cached data for instant UI
  const loadCachedData = useCallback(() => {
    try {
      const cachedProject = localStorage.getItem(CACHE_KEYS.LAST_PROJECT)
      const cachedSession = localStorage.getItem(CACHE_KEYS.LAST_SESSION)
      const cachedMessages = localStorage.getItem(CACHE_KEYS.CACHED_MESSAGES)

      if (cachedProject) {
        const project = JSON.parse(cachedProject) as CurrentProject
        updateState({ currentProject: project })
      }

      if (cachedSession) {
        updateState({ currentSessionId: cachedSession })
      }

      if (cachedMessages) {
        const messages = JSON.parse(cachedMessages) as ChatMessage[]
        // Recreate Date objects
        const hydratedMessages = messages.map((msg) => ({
          ...msg,
          timestamp: new Date(msg.timestamp)
        }))
        updateState({ messages: hydratedMessages })
      }
    } catch (error) {
      console.error('Failed to load cached data:', error)
    }
  }, [updateState])

  // Save data to cache
  const saveToCache = useCallback((key: string, value: unknown) => {
    try {
      localStorage.setItem(key, JSON.stringify(value))
    } catch (error) {
      console.error(`Failed to cache ${key}:`, error)
    }
  }, [])

  // Check server status
  const checkServerStatus = useCallback(async (): Promise<boolean> => {
    try {
      const isRunning = await window.api.toji.isRunning()
      updateState({ serverStatus: isRunning ? 'online' : 'offline' })
      return isRunning
    } catch (error) {
      console.error('Failed to check server status:', error)
      updateState({ serverStatus: 'offline' })
      return false
    }
  }, [updateState])

  // Load projects
  const loadProjects = useCallback(async () => {
    try {
      const projectList = await window.api.toji.getProjects()
      updateState({ projects: (projectList as unknown as Project[]) || [] })
    } catch (error) {
      console.error('Failed to load projects:', error)
      updateState({ projectError: 'Failed to load projects' })
    }
  }, [updateState])

  // Load sessions for current project
  const loadSessions = useCallback(async () => {
    console.log('[ChatCoordinator] Loading sessions for project:', state.currentProject?.path)

    if (!state.currentProject) {
      updateState({ sessions: [], currentSessionId: undefined })
      return
    }

    updateState({ isLoadingSessions: true, sessionError: null })

    try {
      const sessions = await window.api.toji.listSessions()
      console.log('[ChatCoordinator] Sessions loaded:', sessions?.length || 0)
      updateState({ sessions: sessions || [] })

      // Get current session from backend
      const currentId = await window.api.toji.getCurrentSessionId()
      console.log('[ChatCoordinator] Current session ID from backend:', currentId)
      updateState({ currentSessionId: currentId })

      if (currentId) {
        saveToCache(CACHE_KEYS.LAST_SESSION, currentId)
      }
    } catch (error) {
      console.error('[ChatCoordinator] Failed to load sessions:', error)
      updateState({
        sessions: [],
        sessionError: 'Failed to load sessions'
      })
    } finally {
      updateState({ isLoadingSessions: false })
    }
  }, [state.currentProject, updateState, saveToCache])

  // Load messages for current session
  const loadMessages = useCallback(
    async (forceRefresh = false) => {
      if (!state.currentSessionId) {
        updateState({ messages: [] })
        saveToCache(CACHE_KEYS.CACHED_MESSAGES, [])
        return
      }

      updateState({ isLoadingMessages: true, messageError: null })

      try {
        const sdkMessages = await window.api.toji.getSessionMessages(
          state.currentSessionId,
          !forceRefresh
        )
        const messages = formatMessagesFromSDK(sdkMessages)

        updateState({ messages })
        saveToCache(CACHE_KEYS.CACHED_MESSAGES, messages)
      } catch (error) {
        console.error('Failed to load messages:', error)
        updateState({ messageError: 'Failed to load messages' })
      } finally {
        updateState({ isLoadingMessages: false })
      }
    },
    [state.currentSessionId, updateState, saveToCache]
  )

  // Initialize on mount
  const initialize = useCallback(async () => {
    if (initializingRef.current) return
    initializingRef.current = true

    console.log('[ChatCoordinator] Starting initialization...')

    // Load cached data first for instant UI
    loadCachedData()

    // Check server status
    await checkServerStatus()

    try {
      // Load current project from backend
      const current = await window.api.toji.getCurrentProject()
      console.log('[ChatCoordinator] Current project from backend:', current)

      if (current?.path) {
        const project = { path: current.path, sessionId: current.sessionId }
        updateState({ currentProject: project })
        saveToCache(CACHE_KEYS.LAST_PROJECT, project)

        // Load sessions for this project
        await loadSessions()

        // Get current session from backend
        const currentSessionId = await window.api.toji.getCurrentSessionId()
        console.log('[ChatCoordinator] Current session from backend:', currentSessionId)

        if (currentSessionId) {
          updateState({ currentSessionId })
          saveToCache(CACHE_KEYS.LAST_SESSION, currentSessionId)
          await loadMessages()
        }
      }

      // Load all projects
      await loadProjects()
    } catch (error) {
      console.error('[ChatCoordinator] Failed to initialize:', error)
    } finally {
      initializingRef.current = false
    }
  }, [
    loadCachedData,
    checkServerStatus,
    loadProjects,
    loadSessions,
    loadMessages,
    updateState,
    saveToCache
  ])

  // Switch project with proper sequencing
  const switchProject = useCallback(
    async (projectPath: string) => {
      if (switchingProjectRef.current || state.currentProject?.path === projectPath) return
      switchingProjectRef.current = true

      updateState({
        isLoadingProjects: true,
        isLoadingSessions: true,
        isLoadingMessages: true,
        projectError: null
      })

      try {
        // First ensure server is ready
        const serverReady = await checkServerStatus()
        if (!serverReady) {
          updateState({ serverStatus: 'initializing' })
          await window.api.toji.ensureReadyForChat()
          await checkServerStatus()
        }

        // Switch project in backend
        const result = await window.api.toji.switchProject(projectPath)

        if (result.success) {
          const project = { path: projectPath }
          updateState({ currentProject: project })
          saveToCache(CACHE_KEYS.LAST_PROJECT, project)

          // Clear old session/messages immediately
          updateState({
            sessions: [],
            currentSessionId: undefined,
            messages: []
          })

          // Load new project's sessions
          await loadSessions()

          // Load projects list (might have new project)
          await loadProjects()

          // If there's a current session, load its messages
          const currentId = await window.api.toji.getCurrentSessionId()
          if (currentId) {
            updateState({ currentSessionId: currentId })
            await loadMessages()
          }
        } else {
          throw new Error('Failed to switch project')
        }
      } catch (error) {
        console.error('Failed to switch project:', error)
        updateState({ projectError: 'Failed to switch project' })
      } finally {
        updateState({
          isLoadingProjects: false,
          isLoadingSessions: false,
          isLoadingMessages: false
        })
        switchingProjectRef.current = false
      }
    },
    [
      state.currentProject,
      checkServerStatus,
      loadSessions,
      loadProjects,
      loadMessages,
      updateState,
      saveToCache
    ]
  )

  // Open project dialog
  const openProjectDialog = useCallback(async () => {
    try {
      const result = await window.api.dialog.showOpenDialog({
        properties: ['openDirectory']
      })

      if (!result.canceled && result.filePaths[0]) {
        await switchProject(result.filePaths[0])
      }
    } catch (error) {
      console.error('Failed to open project:', error)
      updateState({ projectError: 'Failed to open project dialog' })
    }
  }, [switchProject, updateState])

  // Create session
  const createSession = useCallback(
    async (name?: string) => {
      if (!state.currentProject) return

      updateState({ isLoadingSessions: true, sessionError: null })

      try {
        const newSession = await window.api.toji.createSession(
          name || `Session ${new Date().toLocaleTimeString()}`
        )

        if (newSession) {
          // Optimistically add to list
          setState((prev) => ({
            ...prev,
            sessions: [...prev.sessions, newSession],
            currentSessionId: newSession.id
          }))

          // Switch to new session
          await window.api.toji.switchSession(newSession.id)

          // Clear messages for new session
          updateState({ messages: [] })
          saveToCache(CACHE_KEYS.CACHED_MESSAGES, [])
          saveToCache(CACHE_KEYS.LAST_SESSION, newSession.id)

          // Reload sessions to ensure sync
          await loadSessions()
        }
      } catch (error) {
        console.error('Failed to create session:', error)
        updateState({ sessionError: 'Failed to create session' })
        // Reload to restore correct state
        await loadSessions()
      } finally {
        updateState({ isLoadingSessions: false })
      }
    },
    [state.currentProject, loadSessions, updateState, saveToCache]
  )

  // Delete session
  const deleteSession = useCallback(
    async (sessionId: string) => {
      updateState({ sessionError: null })

      // Optimistically remove from list
      setState((prev) => ({
        ...prev,
        sessions: prev.sessions.filter((s) => s.id !== sessionId)
      }))

      try {
        await window.api.toji.deleteSession(sessionId)

        // If we deleted the current session, clear messages
        if (state.currentSessionId === sessionId) {
          updateState({
            currentSessionId: undefined,
            messages: []
          })
          saveToCache(CACHE_KEYS.CACHED_MESSAGES, [])
          localStorage.removeItem(CACHE_KEYS.LAST_SESSION)
        }

        // Reload sessions
        await loadSessions()
      } catch (error) {
        console.error('Failed to delete session:', error)
        updateState({ sessionError: 'Failed to delete session' })
        // Reload to restore correct state
        await loadSessions()
      }
    },
    [state.currentSessionId, loadSessions, updateState, saveToCache]
  )

  // Switch session
  const switchSession = useCallback(
    async (sessionId: string) => {
      if (switchingSessionRef.current || state.currentSessionId === sessionId) return
      switchingSessionRef.current = true

      updateState({ isLoadingMessages: true, sessionError: null })

      try {
        await window.api.toji.switchSession(sessionId)

        updateState({ currentSessionId: sessionId })
        saveToCache(CACHE_KEYS.LAST_SESSION, sessionId)

        // Load messages for new session
        await loadMessages(true)
      } catch (error) {
        console.error('Failed to switch session:', error)
        updateState({ sessionError: 'Failed to switch session' })
      } finally {
        updateState({ isLoadingMessages: false })
        switchingSessionRef.current = false
      }
    },
    [state.currentSessionId, loadMessages, updateState, saveToCache]
  )

  // Send message
  const sendMessage = useCallback(
    async (message: string) => {
      if (!message.trim() || state.isSendingMessage) return

      updateState({ isSendingMessage: true, messageError: null })

      try {
        // Ensure server is ready
        if (state.serverStatus === 'offline') {
          updateState({ serverStatus: 'initializing' })
          await window.api.toji.ensureReadyForChat()
          await checkServerStatus()
        }

        // Send message
        const response = await window.api.toji.chat(message)

        if (response) {
          // Reload messages to get the complete conversation
          await loadMessages(true)
        }
      } catch (error) {
        console.error('Failed to send message:', error)
        updateState({ messageError: 'Failed to send message' })
      } finally {
        updateState({ isSendingMessage: false })
      }
    },
    [state.isSendingMessage, state.serverStatus, checkServerStatus, loadMessages, updateState]
  )

  // Refresh all data
  const refreshAll = useCallback(async () => {
    await Promise.all([checkServerStatus(), loadProjects(), loadSessions(), loadMessages(true)])
  }, [checkServerStatus, loadProjects, loadSessions, loadMessages])

  // Clear all errors
  const clearErrors = useCallback(() => {
    updateState({
      projectError: null,
      sessionError: null,
      messageError: null
    })
  }, [updateState])

  // Initialize on mount
  useEffect(() => {
    initialize()
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []) // Only run once on mount

  // Set up polling for server status
  useEffect(() => {
    pollingIntervalRef.current = setInterval(() => {
      checkServerStatus()
    }, 5000)

    return () => {
      if (pollingIntervalRef.current) {
        clearInterval(pollingIntervalRef.current)
      }
    }
  }, [checkServerStatus])

  // Listen for session restoration from backend
  useEffect(() => {
    const cleanup = window.api.toji.onSessionRestored(async (data) => {
      console.log('Session restored from backend:', data.sessionId)
      updateState({
        currentSessionId: data.sessionId,
        serverStatus: 'online'
      })
      saveToCache(CACHE_KEYS.LAST_SESSION, data.sessionId)

      // Load messages for restored session
      await loadMessages(true)
    })

    return cleanup
  }, [loadMessages, updateState, saveToCache])

  // Watch for project changes to reload sessions
  useEffect(() => {
    if (state.currentProject && !switchingProjectRef.current) {
      loadSessions()
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [state.currentProject]) // Only depend on currentProject

  // Watch for session changes to reload messages
  useEffect(() => {
    if (state.currentSessionId && !switchingSessionRef.current) {
      loadMessages()
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [state.currentSessionId]) // Only depend on currentSessionId

  return {
    ...state,
    switchProject,
    openProjectDialog,
    createSession,
    deleteSession,
    switchSession,
    sendMessage,
    refreshAll,
    clearErrors
  }
}
