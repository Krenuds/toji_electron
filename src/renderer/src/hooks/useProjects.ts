import { useState, useCallback, useEffect } from 'react'

// Import ProjectInfo interface matching backend
interface ProjectInfo {
  path: string
  name: string
  sdkProject: {
    id: string
    worktree: string
    vcs?: string
  }
}

interface UseProjectsReturn {
  // Project listing
  projects: ProjectInfo[]
  isLoading: boolean
  error: string | null
  fetchProjects: () => Promise<void>

  // Current project info
  currentProject: ProjectInfo | null
  currentProjectError: string | null
  fetchCurrentProject: () => Promise<void>
}

export function useProjects(): UseProjectsReturn {
  const [projects, setProjects] = useState<ProjectInfo[]>([])
  const [isLoading, setIsLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  // Current project state
  const [currentProject, setCurrentProject] = useState<ProjectInfo | null>(null)
  const [currentProjectError, setCurrentProjectError] = useState<string | null>(null)

  const fetchProjects = useCallback(async (): Promise<void> => {
    setIsLoading(true)
    setError(null)

    try {
      const projectList = await window.api.project.getAll()
      setProjects(projectList || [])
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Failed to fetch projects'
      setError(errorMessage)
      setProjects([])
    } finally {
      setIsLoading(false)
    }
  }, [])

  const fetchCurrentProject = useCallback(async (): Promise<void> => {
    setCurrentProjectError(null)
    try {
      const current = await window.api.project.current()
      if (current) {
        setCurrentProject({
          path: current.worktree,
          name: current.worktree.split(/[\\/]/).pop() || current.worktree,
          sdkProject: current
        })
      } else {
        setCurrentProject(null)
      }
    } catch (error) {
      const errorMessage =
        error instanceof Error ? error.message : 'Failed to fetch current project'
      setCurrentProjectError(errorMessage)
      setCurrentProject(null)
    }
  }, [])

  // Fetch projects and current project on mount
  useEffect(() => {
    const initialize = async (): Promise<void> => {
      await Promise.all([fetchProjects(), fetchCurrentProject()])
    }

    initialize()
  }, [fetchProjects, fetchCurrentProject])

  return {
    // Project listing
    projects,
    isLoading,
    error,
    fetchProjects,

    // Current project info
    currentProject,
    currentProjectError,
    fetchCurrentProject
  }
}
