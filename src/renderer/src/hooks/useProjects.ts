import { useState, useCallback, useEffect, useContext } from 'react'
import { AppViewContext } from '../contexts/AppViewContextDef'

// Project interface (temporary until we import from SDK)
interface Project {
  id: string
  worktree: string
  vcs?: unknown
}

interface ProjectInfo {
  path: string
  name: string
  isActive: boolean
}

interface UseProjectsReturn {
  // Project listing
  projects: Project[]
  isLoading: boolean
  error: string | null
  fetchProjects: () => Promise<void>
  openProjectsFolder: () => Promise<void>

  // Active project management
  isChangingProject: boolean
  currentProject: string | undefined
  projectInfo: ProjectInfo | null
  selectAndChangeProject: () => Promise<void>
  changeProject: (directory: string) => Promise<void>
}

export function useProjects(): UseProjectsReturn {
  const [projects, setProjects] = useState<Project[]>([])
  const [isLoading, setIsLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  // Active project state
  const [isChangingProject, setIsChangingProject] = useState(false)
  const [currentProject, setCurrentProject] = useState<string | undefined>()
  const [projectInfo, setProjectInfo] = useState<ProjectInfo | null>(null)

  // Get the view context to switch to chat after opening project
  const viewContext = useContext(AppViewContext)

  const fetchProjects = useCallback(async (): Promise<void> => {
    setIsLoading(true)
    setError(null)

    try {
      const projectList = await window.api.project.list()
      setProjects(projectList || [])
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Failed to fetch projects'
      setError(errorMessage)
      setProjects([])
    } finally {
      setIsLoading(false)
    }
  }, [])

  const openProjectsFolder = useCallback(async (): Promise<void> => {
    try {
      await window.api.project.openFolder()
    } catch (error) {
      console.error('Failed to open projects folder:', error)
    }
  }, [])

  const changeProject = useCallback(
    async (directory: string) => {
      setIsChangingProject(true)
      setError(null)

      try {
        await window.api.project.open(directory)

        // Create project info from directory path
        const projectName = directory.split(/[\\/]/).pop() || directory
        const info: ProjectInfo = {
          path: directory,
          name: projectName,
          isActive: true
        }

        setProjectInfo(info)
        setCurrentProject(directory)
        console.log('Project changed successfully:', info)

        // After successfully opening a project, switch to the chat view
        if (viewContext) {
          viewContext.setActiveView('chat')
        }
      } catch (err) {
        const errorMessage = err instanceof Error ? err.message : 'Failed to change project'
        setError(errorMessage)
        console.error('Failed to change project:', err)
        throw err
      } finally {
        setIsChangingProject(false)
      }
    },
    [viewContext]
  )

  const selectAndChangeProject = useCallback(async () => {
    try {
      const selectedDirectory = await window.api.window.selectDirectory()

      if (!selectedDirectory) {
        // User canceled the dialog
        return
      }

      await changeProject(selectedDirectory)
    } catch (err) {
      console.error('Failed to select and change project:', err)
      // Error is already handled in changeProject
    }
  }, [changeProject])

  // Fetch projects on mount and check for current project
  useEffect(() => {
    const initializeProjects = async (): Promise<void> => {
      // Fetch projects list
      await fetchProjects()

      // Check if there's a current active project/session
      try {
        const isRunning = await window.api.toji.isRunning()
        if (isRunning) {
          const currentSession = await window.api.toji.getCurrentSession()
          if (currentSession?.directory) {
            // Set the project info based on current session directory
            const projectName =
              currentSession.directory.split(/[\\/]/).pop() || currentSession.directory
            setCurrentProject(currentSession.directory)
            setProjectInfo({
              path: currentSession.directory,
              name: projectName,
              isActive: true
            })
          } else {
            // Fallback: if no session but server is running, check current project path
            const currentPath = await window.api.project.getCurrentPath()
            if (currentPath) {
              const projectName = currentPath.split(/[\\/]/).pop() || currentPath
              setCurrentProject(currentPath)
              setProjectInfo({
                path: currentPath,
                name: projectName,
                isActive: true
              })
              console.log('Fallback project detection used:', projectName)
            }
          }
        }
      } catch (err) {
        console.error('Failed to fetch current project data:', err)
      }
    }

    initializeProjects()
  }, [fetchProjects])

  // Listen for project opened events from backend
  useEffect(() => {
    const cleanup = window.api.project.onProjectOpened((data) => {
      console.log('Project opened event received:', data)
      // Update project state when backend opens/auto-starts a project
      setCurrentProject(data.path)
      setProjectInfo({
        path: data.path,
        name: data.name,
        isActive: true
      })

      // Switch to chat view after project is opened
      if (viewContext) {
        viewContext.setActiveView('chat')
      }
    })

    return cleanup
  }, [viewContext])

  return {
    // Project listing
    projects,
    isLoading,
    error,
    fetchProjects,
    openProjectsFolder,

    // Active project management
    isChangingProject,
    currentProject,
    projectInfo,
    selectAndChangeProject,
    changeProject
  }
}
