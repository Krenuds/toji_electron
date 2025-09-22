import { useState, useCallback, useEffect } from 'react'

// Project interface (temporary until we import from SDK)
interface Project {
  id: string
  worktree: string
  vcs?: unknown
}

interface UseProjectsReturn {
  projects: Project[]
  isLoading: boolean
  error: string | null
  fetchProjects: () => Promise<void>
  openProjectsFolder: () => Promise<void>
}

export function useProjects(): UseProjectsReturn {
  const [projects, setProjects] = useState<Project[]>([])
  const [isLoading, setIsLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

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

  // Fetch projects on mount
  useEffect(() => {
    fetchProjects()
  }, [fetchProjects])

  return {
    projects,
    isLoading,
    error,
    fetchProjects,
    openProjectsFolder
  }
}
