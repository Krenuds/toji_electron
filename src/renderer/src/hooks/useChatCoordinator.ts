import { useCallback, useEffect } from 'react'
import { useProjectManager } from './chat/useProjectManager'
import { useSessionManager } from './chat/useSessionManager'
import { useMessageManager } from './chat/useMessageManager'
import { useServerStatus } from './chat/useServerStatus'
import type { ChatMessage } from '../utils/messageFormatter'
import type { Session } from '../../../preload/index.d'

// ============================================================================
// Type Definitions
// ============================================================================

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
  LAST_SESSION: 'toji3_last_session',
  CACHED_MESSAGES: 'toji3_cached_messages'
} as const

// ============================================================================
// Hook Implementation
// ============================================================================

export function useChatCoordinator(): UseChatCoordinatorReturn {
  // Compose focused hooks
  const projectManager = useProjectManager()
  const sessionManager = useSessionManager(projectManager.currentProject)
  const serverStatus = useServerStatus()
  const messageManager = useMessageManager(
    sessionManager.currentSessionId,
    serverStatus.setServerStatus,
    serverStatus.checkServerStatus
  )

  // ============================================================================
  // Initialization
  // ============================================================================

  const initialize = useCallback(async () => {
    // Load cached data first for instant UI
    projectManager.loadCachedProject()
    sessionManager.loadCachedSession()
    messageManager.loadCachedMessages()

    // Check server status
    await serverStatus.checkServerStatus()

    try {
      // Load current project from backend
      const current = await window.api.toji.getCurrentProject()

      if (current?.path) {
        const project = { path: current.path, sessionId: current.sessionId }
        projectManager.setCurrentProject(project)
        localStorage.setItem('toji3_last_project', JSON.stringify(project))

        // Check project status (global vs proper project)
        console.log('[ChatCoordinator.initialize] Loading project status...')
        const status = await window.api.toji.getProjectStatus()
        console.log('[ChatCoordinator.initialize] Project status:', status)
        projectManager.setProjectStatus(status)

        // Load sessions for this project
        await sessionManager.loadSessions()

        // Get current session from backend
        const currentSessionId = await window.api.toji.getCurrentSessionId()

        if (currentSessionId) {
          sessionManager.setCurrentSessionId(currentSessionId)
          localStorage.setItem(CACHE_KEYS.LAST_SESSION, currentSessionId)
          await messageManager.loadMessages(currentSessionId)
        }
      }

      // Load all projects
      await projectManager.loadProjects()
    } catch {
      // Backend handles error logging
    }
  }, [projectManager, sessionManager, messageManager, serverStatus])

  // Initialize on mount
  useEffect(() => {
    initialize()
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []) // Only run once on mount

  // ============================================================================
  // Coordinated Actions
  // ============================================================================

  // Enhanced switchProject that coordinates with sessions and messages
  const switchProject = useCallback(
    async (projectPath: string) => {
      if (projectManager.currentProject?.path === projectPath) {
        return
      }

      projectManager.setIsLoadingProjects(true)
      sessionManager.setIsLoadingSessions(true)
      messageManager.setIsLoadingMessages(true)
      projectManager.setProjectError(null)

      try {
        // First ensure server is ready
        const serverReady = await serverStatus.checkServerStatus()
        if (!serverReady) {
          serverStatus.setServerStatus('initializing')
          await window.api.toji.ensureReadyForChat()
          await serverStatus.checkServerStatus()
        }

        // Switch project in backend
        const result = await window.api.toji.switchProject(projectPath)

        if (result.success) {
          const project = { path: projectPath }
          projectManager.setCurrentProject(project)
          localStorage.setItem('toji3_last_project', JSON.stringify(project))

          // Check project status
          const status = await window.api.toji.getProjectStatus()
          projectManager.setProjectStatus(status)

          // Clear old session/messages immediately
          sessionManager.setSessions([])
          sessionManager.setCurrentSessionId(undefined)
          messageManager.clearMessages()

          // Clear caches
          localStorage.removeItem(CACHE_KEYS.CACHED_MESSAGES)
          localStorage.removeItem(CACHE_KEYS.LAST_SESSION)

          // Load new project's sessions
          const sessions = await sessionManager.loadSessions()

          // Load projects list (might have new project)
          await projectManager.loadProjects()

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

            // Update state FIRST so loadMessages has the right context
            sessionManager.setCurrentSessionId(mostRecentSession.id)
            localStorage.setItem(CACHE_KEYS.LAST_SESSION, mostRecentSession.id)

            // Then switch in backend
            await window.api.toji.switchSession(mostRecentSession.id)

            // Load messages for the selected session
            await messageManager.loadMessages(mostRecentSession.id, true)
          } else {
            // No sessions exist - create one automatically
            const projectName = projectPath.split(/[/\\]/).pop() || 'Project'
            const sessionName = `${projectName} - ${new Date().toLocaleDateString()}`

            try {
              const newSession = await window.api.toji.createSession(sessionName)
              if (newSession) {
                sessionManager.setSessions([newSession])
                sessionManager.setCurrentSessionId(newSession.id)
                await window.api.toji.switchSession(newSession.id)
                localStorage.setItem(CACHE_KEYS.LAST_SESSION, newSession.id)
              }
            } catch {
              // Backend handles error logging
              // Continue without a session - user can create one manually
            }
          }
        } else {
          throw new Error('Failed to switch project')
        }
      } catch {
        // Backend handles error logging
        projectManager.setProjectError('Failed to switch project')
      } finally {
        projectManager.setIsLoadingProjects(false)
        sessionManager.setIsLoadingSessions(false)
        messageManager.setIsLoadingMessages(false)
      }
    },
    [projectManager, sessionManager, messageManager, serverStatus]
  )

  // Enhanced switchSession that coordinates with messages
  const switchSession = useCallback(
    async (sessionId: string) => {
      if (sessionManager.currentSessionId === sessionId) {
        return
      }

      messageManager.setIsLoadingMessages(true)
      sessionManager.setSessionError(null)

      try {
        // Update state FIRST so loadMessages has the right context
        sessionManager.setCurrentSessionId(sessionId)
        localStorage.setItem(CACHE_KEYS.LAST_SESSION, sessionId)

        // Then switch in backend
        await window.api.toji.switchSession(sessionId)

        // Load messages for new session
        await messageManager.loadMessages(sessionId, true)
      } catch (error) {
        console.error('Failed to switch session:', error)
        sessionManager.setSessionError('Failed to switch session')
      } finally {
        messageManager.setIsLoadingMessages(false)
      }
    },
    [sessionManager, messageManager]
  )

  // Enhanced closeProject that coordinates cleanup
  const closeProject = useCallback(async () => {
    try {
      // Clear UI state immediately for responsiveness
      projectManager.setCurrentProject(null)
      sessionManager.setSessions([])
      sessionManager.setCurrentSessionId(undefined)
      messageManager.clearMessages()
      serverStatus.setServerStatus('offline')
      projectManager.setProjectError(null)
      sessionManager.setSessionError(null)
      messageManager.setMessageError(null)

      // Clear all cache
      localStorage.removeItem(CACHE_KEYS.CACHED_MESSAGES)
      localStorage.removeItem(CACHE_KEYS.LAST_SESSION)
      localStorage.removeItem('toji3_last_project')

      // Close project in backend
      await window.api.toji.closeProject()

      // Wait for global server
      await new Promise((resolve) => setTimeout(resolve, 500))

      // Check if global server is ready
      const serverReady = await serverStatus.checkServerStatus()
      if (!serverReady) {
        serverStatus.setServerStatus('initializing')
        await new Promise((resolve) => setTimeout(resolve, 1000))
        await serverStatus.checkServerStatus()
      }

      // Reload projects list
      await projectManager.loadProjects()
    } catch (error) {
      console.error('[ChatCoordinator.closeProject] Failed to close project:', error)
      projectManager.setProjectError('Failed to close project')
    }
  }, [projectManager, sessionManager, messageManager, serverStatus])

  // Enhanced initializeProject that reloads sessions
  const initializeProject = useCallback(async () => {
    await projectManager.initializeProject()
    // Reload sessions after initialization
    await sessionManager.loadSessions()
  }, [projectManager, sessionManager])

  // Refresh all data
  const refreshAll = useCallback(async () => {
    const [, , sessions] = await Promise.all([
      serverStatus.checkServerStatus(),
      projectManager.loadProjects(),
      sessionManager.loadSessions()
    ])
    // Load messages separately with current session ID from sessions
    const currentId = sessions.find((s) => s.id === sessionManager.currentSessionId)?.id
    if (currentId) {
      await messageManager.loadMessages(currentId, true)
    }
  }, [serverStatus, projectManager, sessionManager, messageManager])

  // Clear all errors
  const clearErrors = useCallback(() => {
    projectManager.setProjectError(null)
    sessionManager.setSessionError(null)
    messageManager.setMessageError(null)
  }, [projectManager, sessionManager, messageManager])

  // Wrap sendMessage to pass server status
  const sendMessage = useCallback(
    async (message: string) => {
      await messageManager.sendMessage(message, serverStatus.serverStatus)
    },
    [messageManager, serverStatus.serverStatus]
  )

  // ============================================================================
  // Event Listeners
  // ============================================================================

  // Listen for session restoration from backend
  useEffect(() => {
    const cleanup = window.api.toji.onSessionRestored(async (data) => {
      sessionManager.setCurrentSessionId(data.sessionId)
      serverStatus.setServerStatus('online')
      localStorage.setItem(CACHE_KEYS.LAST_SESSION, data.sessionId)

      // Load messages for restored session
      await messageManager.loadMessages(data.sessionId, true)
    })

    return cleanup
  }, [sessionManager, serverStatus, messageManager])

  // Watch for project changes to reload sessions
  useEffect(() => {
    if (projectManager.currentProject) {
      sessionManager.loadSessions()
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [projectManager.currentProject])

  // ============================================================================
  // Return Combined Interface
  // ============================================================================

  return {
    // Project state
    projects: projectManager.projects,
    currentProject: projectManager.currentProject,
    projectStatus: projectManager.projectStatus,
    isLoadingProjects: projectManager.isLoadingProjects,
    isInitializingProject: projectManager.isInitializingProject,
    projectError: projectManager.projectError,

    // Session state
    sessions: sessionManager.sessions,
    currentSessionId: sessionManager.currentSessionId,
    isLoadingSessions: sessionManager.isLoadingSessions,
    sessionError: sessionManager.sessionError,

    // Message state
    messages: messageManager.messages,
    isLoadingMessages: messageManager.isLoadingMessages,
    isSendingMessage: messageManager.isSendingMessage,
    messageError: messageManager.messageError,

    // Server status
    serverStatus: serverStatus.serverStatus,

    // Project actions
    switchProject,
    openProjectDialog: projectManager.openProjectDialog,
    closeProject,
    initializeProject,

    // Session actions
    createSession: sessionManager.createSession,
    deleteSession: sessionManager.deleteSession,
    switchSession,

    // Message actions
    sendMessage,

    // Utility actions
    refreshAll,
    clearErrors
  }
}
