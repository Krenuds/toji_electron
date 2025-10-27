import { useState, useCallback, useRef } from 'react'
import { usePersistedState } from '../usePersistedState'
import { CACHE_KEYS } from '../../constants/cacheKeys'

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

interface ProjectStatus {
  isGlobalProject: boolean
  hasGit: boolean
  hasOpenCodeConfig: boolean
  gitAvailable: boolean
  path: string
}

interface ProjectState {
  projects: Project[]
  currentProject: CurrentProject | null
  projectStatus: ProjectStatus | null
  isLoadingProjects: boolean
  isInitializingProject: boolean
  projectError: string | null
}

export interface UseProjectManagerReturn extends ProjectState {
  switchProject: (projectPath: string) => Promise<void>
  openProjectDialog: () => Promise<void>
  closeProject: () => Promise<void>
  initializeProject: () => Promise<void>
  loadProjects: () => Promise<void>
  loadCachedProject: () => void
  setCurrentProject: (project: CurrentProject | null) => void
  setProjectStatus: (status: ProjectStatus | null) => void
  setProjects: (projects: Project[]) => void
  setIsLoadingProjects: (loading: boolean) => void
  setProjectError: (error: string | null) => void
}

// ============================================================================
// Hook Implementation
// ============================================================================

export function useProjectManager(): UseProjectManagerReturn {
  // Persisted state for current project
  const [currentProject, setCurrentProject] = usePersistedState<CurrentProject | null>(
    CACHE_KEYS.LAST_PROJECT,
    null
  )

  // Non-persisted state
  const [state, setState] = useState({
    projects: [] as Project[],
    projectStatus: null as ProjectStatus | null,
    isLoadingProjects: false,
    isInitializingProject: false,
    projectError: null as string | null
  })

  // Refs to prevent race conditions
  const switchingProjectRef = useRef(false)

  // Load cached project (now handled by usePersistedState, but kept for API compatibility)
  const loadCachedProject = useCallback(() => {
    // No-op: usePersistedState automatically loads cached data on mount
  }, [])

  // Load projects list
  const loadProjects = useCallback(async () => {
    console.log('[ProjectManager.loadProjects] Loading projects...')
    try {
      const projectList = await window.api.toji.getProjects()
      console.log('[ProjectManager.loadProjects] Loaded projects:', projectList)
      setState((prev) => ({ ...prev, projects: (projectList as unknown as Project[]) || [] }))
      console.log(
        '[ProjectManager.loadProjects] State updated with',
        projectList?.length || 0,
        'projects'
      )
    } catch (error) {
      console.error('[ProjectManager.loadProjects] Error loading projects:', error)
      setState((prev) => ({ ...prev, projectError: 'Failed to load projects' }))
    }
  }, [])

  // Switch project
  const switchProject = useCallback(
    async (projectPath: string) => {
      if (switchingProjectRef.current || currentProject?.path === projectPath) {
        return
      }
      switchingProjectRef.current = true

      setState((prev) => ({
        ...prev,
        isLoadingProjects: true,
        projectError: null
      }))

      try {
        // Switch project in backend
        const result = await window.api.toji.switchProject(projectPath)

        if (result.success) {
          const project = { path: projectPath }
          setCurrentProject(project)

          // Check project status (global vs proper project)
          const status = await window.api.toji.getProjectStatus()
          setState((prev) => ({ ...prev, projectStatus: status }))

          // Load projects list (might have new project)
          await loadProjects()
        } else {
          throw new Error('Failed to switch project')
        }
      } catch {
        // Backend handles error logging
        setState((prev) => ({ ...prev, projectError: 'Failed to switch project' }))
      } finally {
        setState((prev) => ({ ...prev, isLoadingProjects: false }))
        switchingProjectRef.current = false
      }
    },
    [currentProject, loadProjects, setCurrentProject]
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
    } catch {
      // Backend handles error logging
      setState((prev) => ({ ...prev, projectError: 'Failed to open project dialog' }))
    }
  }, [switchProject])

  // Close current project
  const closeProject = useCallback(async () => {
    try {
      // Clear UI state immediately for responsiveness
      setCurrentProject(null)
      setState((prev) => ({ ...prev, projectError: null }))

      // Close project in backend (this will stop the project server and reconnect to global server)
      await window.api.toji.closeProject()

      // Wait a moment for the global server to be ready
      await new Promise((resolve) => setTimeout(resolve, 500))

      // Reload projects list (from the global server)
      await loadProjects()
    } catch (error) {
      console.error('[ProjectManager.closeProject] Failed to close project:', error)
      setState((prev) => ({ ...prev, projectError: 'Failed to close project' }))
    }
  }, [loadProjects, setCurrentProject])

  // Initialize project with git and opencode.json
  const initializeProject = useCallback(async () => {
    if (!currentProject) {
      console.error('[ProjectManager.initializeProject] No current project')
      return
    }
    setState((prev) => ({ ...prev, isInitializingProject: true, projectError: null }))

    try {
      const result = await window.api.toji.initializeProject()

      if (result.success) {
        console.log('[ProjectManager.initializeProject] ✅ Success! Result:', result)
        console.log(
          '[ProjectManager.initializeProject] Current project before refresh:',
          currentProject
        )

        // Clear stale status immediately
        console.log('[ProjectManager.initializeProject] Clearing stale project status...')
        setState((prev) => ({ ...prev, projectStatus: null }))

        // Wait a moment for the backend to fully process
        console.log('[ProjectManager.initializeProject] Waiting 500ms for backend processing...')
        await new Promise((resolve) => setTimeout(resolve, 500))

        // Reload the full project list - THIS IS KEY!
        // This updates the OpenCode SDK's internal project cache
        console.log('[ProjectManager.initializeProject] 🔄 Reloading projects list...')
        await loadProjects()
        console.log('[ProjectManager.initializeProject] ✅ Projects list reloaded')

        // Refresh project status
        console.log('[ProjectManager.initializeProject] 🔄 Getting fresh project status...')
        const status = await window.api.toji.getProjectStatus()
        console.log('[ProjectManager.initializeProject] Fresh project status:', status)
        setState((prev) => ({ ...prev, projectStatus: status }))

        console.log(
          '[ProjectManager.initializeProject] ✅✅✅ Project state refreshed successfully!'
        )

        // Show success message
        setState((prev) => ({ ...prev, projectError: null }))
      } else {
        console.error('[ProjectManager.initializeProject] Initialization failed:', result.error)
        setState((prev) => ({
          ...prev,
          projectError: result.needsGitInstall
            ? 'Git is not installed. Please install Git from https://git-scm.com'
            : result.error || 'Failed to initialize project'
        }))
      }
    } catch (error) {
      console.error('[ProjectManager.initializeProject] Error:', error)
      setState((prev) => ({ ...prev, projectError: 'Failed to initialize project' }))
    } finally {
      setState((prev) => ({ ...prev, isInitializingProject: false }))
    }
  }, [currentProject, loadProjects])

  // Setters for external coordination
  const setProjectStatus = useCallback((status: ProjectStatus | null) => {
    setState((prev) => ({ ...prev, projectStatus: status }))
  }, [])

  const setProjects = useCallback((projects: Project[]) => {
    setState((prev) => ({ ...prev, projects }))
  }, [])

  const setIsLoadingProjects = useCallback((loading: boolean) => {
    setState((prev) => ({ ...prev, isLoadingProjects: loading }))
  }, [])

  const setProjectError = useCallback((error: string | null) => {
    setState((prev) => ({ ...prev, projectError: error }))
  }, [])

  return {
    ...state,
    currentProject,
    switchProject,
    openProjectDialog,
    closeProject,
    initializeProject,
    loadProjects,
    loadCachedProject,
    setCurrentProject,
    setProjectStatus,
    setProjects,
    setIsLoadingProjects,
    setProjectError
  }
}
