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
  projectStatus: {
    isGlobalProject: boolean
    hasGit: boolean
    hasOpenCodeConfig: boolean
    gitAvailable: boolean
    path: string
  } | null

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
  isInitializingProject: boolean

  // Error states
  projectError: string | null
  sessionError: string | null
  messageError: string | null
}

interface UseChatCoordinatorReturn extends ChatState {
  // Project actions
  switchProject: (projectPath: string) => Promise<void>
  openProjectDialog: () => Promise<void>
  closeProject: () => Promise<void>
  initializeProject: () => Promise<void>

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
    projectStatus: null,
    sessions: [],
    currentSessionId: undefined,
    messages: [],
    serverStatus: 'offline',
    isLoadingProjects: false,
    isLoadingSessions: false,
    isLoadingMessages: false,
    isSendingMessage: false,
    isInitializingProject: false,
    projectError: null,
    sessionError: null,
    messageError: null
  })

  // Refs to track ongoing operations and prevent race conditions
  const initializingRef = useRef(false)
  const switchingProjectRef = useRef(false)
  const switchingSessionRef = useRef(false)
  const pollingIntervalRef = useRef<NodeJS.Timeout | null>(null)
  const loadMessagesAbortRef = useRef<AbortController | null>(null)

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
  const loadSessions = useCallback(async (): Promise<Session[]> => {
    console.log('[ChatCoordinator] Loading sessions for project:', state.currentProject?.path)

    if (!state.currentProject) {
      updateState({ sessions: [], currentSessionId: undefined })
      return []
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

      return sessions || []
    } catch (error) {
      console.error('[ChatCoordinator] Failed to load sessions:', error)
      updateState({
        sessions: [],
        sessionError: 'Failed to load sessions'
      })
      return []
    } finally {
      updateState({ isLoadingSessions: false })
    }
  }, [state.currentProject, updateState, saveToCache])

  // Load messages for specific session
  const loadMessages = useCallback(
    async (sessionId?: string, forceRefresh = false) => {
      console.log(
        '[ChatCoordinator.loadMessages] Starting - sessionId:',
        sessionId,
        'currentSessionId:',
        state.currentSessionId,
        'forceRefresh:',
        forceRefresh
      )

      // Cancel any in-flight message loading
      if (loadMessagesAbortRef.current) {
        console.log('[ChatCoordinator.loadMessages] Aborting previous message load')
        loadMessagesAbortRef.current.abort()
      }

      // Create new abort controller for this request
      const abortController = new AbortController()
      loadMessagesAbortRef.current = abortController

      // Use provided sessionId or fall back to current state
      const targetSessionId = sessionId || state.currentSessionId

      if (!targetSessionId) {
        console.log('[ChatCoordinator.loadMessages] No session ID, clearing messages')
        updateState({ messages: [] })
        saveToCache(CACHE_KEYS.CACHED_MESSAGES, [])
        return
      }

      // If a specific sessionId is provided, we're explicitly loading for that session
      // This happens during project/session switches before state is updated
      // So we should NOT skip based on currentSessionId comparison
      if (!sessionId && !state.currentSessionId) {
        console.log('[ChatCoordinator.loadMessages] No sessionId provided and no current session')
        return
      }

      console.log('[ChatCoordinator.loadMessages] Loading messages for session:', targetSessionId)
      updateState({ isLoadingMessages: true, messageError: null })

      try {
        const sdkMessages = await window.api.toji.getSessionMessages(targetSessionId, !forceRefresh)
        console.log(
          '[ChatCoordinator.loadMessages] SDK returned',
          sdkMessages?.length || 0,
          'messages for session:',
          targetSessionId
        )

        // Check if request was aborted
        if (abortController.signal.aborted) {
          console.log('[ChatCoordinator.loadMessages] Request was aborted')
          return
        }

        const messages = formatMessagesFromSDK(sdkMessages)
        console.log(
          '[ChatCoordinator.loadMessages] Formatted',
          messages.length,
          'messages for display'
        )

        // If we explicitly requested this session's messages, update state
        // OR if it matches the current session
        if (sessionId || targetSessionId === state.currentSessionId) {
          console.log(
            '[ChatCoordinator.loadMessages] Updating state with',
            messages.length,
            'messages for session:',
            targetSessionId
          )
          updateState({ messages })
          saveToCache(CACHE_KEYS.CACHED_MESSAGES, messages)
        } else {
          console.log(
            "[ChatCoordinator.loadMessages] Not updating - no explicit session and doesn't match current:",
            targetSessionId,
            '!==',
            state.currentSessionId
          )
        }
      } catch (error) {
        // Don't log errors for aborted requests
        if (!abortController.signal.aborted) {
          console.error('[ChatCoordinator.loadMessages] Failed to load messages:', error)
          updateState({ messageError: 'Failed to load messages' })
        } else {
          console.log('[ChatCoordinator.loadMessages] Error was due to abort, ignoring')
        }
      } finally {
        if (!abortController.signal.aborted) {
          console.log('[ChatCoordinator.loadMessages] Complete, setting loading to false')
          updateState({ isLoadingMessages: false })
        }
        // Clear the abort controller reference if it's still this one
        if (loadMessagesAbortRef.current === abortController) {
          loadMessagesAbortRef.current = null
        }
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
          await loadMessages(currentSessionId)
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
      console.log(
        '[ChatCoordinator.switchProject] Starting switch to:',
        projectPath,
        'from:',
        state.currentProject?.path || 'none'
      )

      if (switchingProjectRef.current || state.currentProject?.path === projectPath) {
        console.log('[ChatCoordinator.switchProject] Already switching or same project, skipping')
        return
      }
      switchingProjectRef.current = true

      // Cancel any in-flight message loading
      if (loadMessagesAbortRef.current) {
        console.log('[ChatCoordinator.switchProject] Aborting in-flight message loading')
        loadMessagesAbortRef.current.abort()
        loadMessagesAbortRef.current = null
      }

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

          // Check project status (global vs proper project)
          const status = await window.api.toji.getProjectStatus()
          updateState({ projectStatus: status })

          if (status?.isGlobalProject) {
            console.log(
              '[ChatCoordinator.switchProject] Project is global (non-git), limited functionality'
            )
          }

          // Clear old session/messages immediately
          console.log('[ChatCoordinator.switchProject] Clearing old session data and messages')
          updateState({
            sessions: [],
            currentSessionId: undefined,
            messages: []
          })

          // Clear message cache to prevent showing stale data
          localStorage.removeItem(CACHE_KEYS.CACHED_MESSAGES)
          localStorage.removeItem(CACHE_KEYS.LAST_SESSION)
          console.log('[ChatCoordinator.switchProject] Cleared cache')

          // Load new project's sessions
          const sessions = await loadSessions()

          // Load projects list (might have new project)
          await loadProjects()

          // Auto-select or create a session
          if (sessions && sessions.length > 0) {
            // Sort sessions by most recent activity
            const sortedSessions = [...sessions].sort((a, b) => {
              const dateA = new Date(a.updated || a.created || 0)
              const dateB = new Date(b.updated || b.created || 0)
              return dateB.getTime() - dateA.getTime()
            })

            // Select the most recent session
            const mostRecentSession = sortedSessions[0]
            console.log(
              '[ChatCoordinator.switchProject] Auto-selecting most recent session:',
              mostRecentSession.id,
              'for project:',
              projectPath
            )

            // Update state FIRST so loadMessages has the right context
            updateState({ currentSessionId: mostRecentSession.id })
            saveToCache(CACHE_KEYS.LAST_SESSION, mostRecentSession.id)

            // Then switch in backend
            await window.api.toji.switchSession(mostRecentSession.id)

            // Load messages for the selected session
            console.log(
              '[ChatCoordinator.switchProject] Loading messages for auto-selected session'
            )
            await loadMessages(mostRecentSession.id, true)
          } else {
            // No sessions exist - create one automatically
            console.log('[ChatCoordinator] No sessions found, creating default session')
            const projectName = projectPath.split(/[/\\]/).pop() || 'Project'
            const sessionName = `${projectName} - ${new Date().toLocaleDateString()}`

            try {
              const newSession = await window.api.toji.createSession(sessionName)
              if (newSession) {
                console.log('[ChatCoordinator] Created new session:', newSession.id)
                updateState({
                  sessions: [newSession],
                  currentSessionId: newSession.id
                })
                await window.api.toji.switchSession(newSession.id)
                saveToCache(CACHE_KEYS.LAST_SESSION, newSession.id)
              }
            } catch (error) {
              console.error('[ChatCoordinator] Failed to auto-create session:', error)
              // Continue without a session - user can create one manually
            }
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

  // Close current project
  const closeProject = useCallback(async () => {
    console.log('[ChatCoordinator.closeProject] Closing current project')

    try {
      // Clear UI state immediately for responsiveness
      updateState({
        currentProject: undefined,
        sessions: [],
        currentSessionId: undefined,
        messages: [],
        serverStatus: 'offline',
        projectError: null,
        sessionError: null,
        messageError: null
      })

      // Clear all cache
      localStorage.removeItem(CACHE_KEYS.CACHED_MESSAGES)
      localStorage.removeItem(CACHE_KEYS.LAST_SESSION)
      localStorage.removeItem(CACHE_KEYS.LAST_PROJECT)
      console.log('[ChatCoordinator.closeProject] Cleared cache and state')

      // Close project in backend (this will stop the project server and reconnect to global server)
      await window.api.toji.closeProject()
      console.log('[ChatCoordinator.closeProject] Project closed successfully')

      // Wait a moment for the global server to be ready
      await new Promise((resolve) => setTimeout(resolve, 500))

      // Check if global server is ready
      const serverReady = await checkServerStatus()
      if (!serverReady) {
        console.log('[ChatCoordinator.closeProject] Waiting for global server to be ready...')
        updateState({ serverStatus: 'initializing' })
        // Give it more time for the global server to start
        await new Promise((resolve) => setTimeout(resolve, 1000))
        await checkServerStatus()
      }

      // Reload projects list (from the global server)
      console.log('[ChatCoordinator.closeProject] Loading projects from global server')
      await loadProjects()
    } catch (error) {
      console.error('[ChatCoordinator.closeProject] Failed to close project:', error)
      updateState({ projectError: 'Failed to close project' })
    }
  }, [loadProjects, updateState, checkServerStatus])

  // Initialize project with git and opencode.json
  const initializeProject = useCallback(async () => {
    if (!state.currentProject) {
      console.error('[ChatCoordinator.initializeProject] No current project')
      return
    }

    console.log('[ChatCoordinator.initializeProject] Starting project initialization')
    updateState({ isInitializingProject: true, projectError: null })

    try {
      const result = await window.api.toji.initializeProject()

      if (result.success) {
        console.log('[ChatCoordinator.initializeProject] Project initialized successfully')

        // Refresh project status
        const status = await window.api.toji.getProjectStatus()
        updateState({ projectStatus: status })

        // Reload sessions (project should now be recognized)
        await loadSessions()

        // Sessions will be created as needed by the user

        // Show success message
        updateState({ projectError: null })
      } else {
        console.error('[ChatCoordinator.initializeProject] Initialization failed:', result.error)
        updateState({
          projectError: result.needsGitInstall
            ? 'Git is not installed. Please install Git from https://git-scm.com'
            : result.error || 'Failed to initialize project'
        })
      }
    } catch (error) {
      console.error('[ChatCoordinator.initializeProject] Error:', error)
      updateState({ projectError: 'Failed to initialize project' })
    } finally {
      updateState({ isInitializingProject: false })
    }
  }, [state.currentProject, loadSessions, updateState])

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
      console.log(
        '[ChatCoordinator.switchSession] Switching from:',
        state.currentSessionId,
        'to:',
        sessionId
      )

      if (switchingSessionRef.current || state.currentSessionId === sessionId) {
        console.log('[ChatCoordinator.switchSession] Already switching or same session')
        return
      }
      switchingSessionRef.current = true

      updateState({ isLoadingMessages: true, sessionError: null })

      try {
        // Update state FIRST so loadMessages has the right context
        updateState({ currentSessionId: sessionId })
        saveToCache(CACHE_KEYS.LAST_SESSION, sessionId)

        // Then switch in backend
        await window.api.toji.switchSession(sessionId)

        // Load messages for new session
        await loadMessages(sessionId, true)
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
          await loadMessages(state.currentSessionId, true)
        }
      } catch (error) {
        console.error('Failed to send message:', error)
        updateState({ messageError: 'Failed to send message' })
      } finally {
        updateState({ isSendingMessage: false })
      }
    },
    [
      state.isSendingMessage,
      state.serverStatus,
      state.currentSessionId,
      checkServerStatus,
      loadMessages,
      updateState
    ]
  )

  // Refresh all data
  const refreshAll = useCallback(async () => {
    const [, , sessions] = await Promise.all([checkServerStatus(), loadProjects(), loadSessions()])
    // Load messages separately with current session ID from sessions
    const currentId = sessions.find((s) => s.id === state.currentSessionId)?.id
    if (currentId) {
      await loadMessages(currentId, true)
    }
  }, [checkServerStatus, loadProjects, loadSessions, loadMessages, state.currentSessionId])

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
      await loadMessages(data.sessionId, true)
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

  // Removed duplicate useEffect - messages are loaded explicitly in switchSession and switchProject

  return {
    ...state,
    switchProject,
    openProjectDialog,
    closeProject,
    initializeProject,
    createSession,
    deleteSession,
    switchSession,
    sendMessage,
    refreshAll,
    clearErrors
  }
}
