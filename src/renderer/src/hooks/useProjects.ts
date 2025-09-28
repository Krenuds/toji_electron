import { useState, useEffect, useCallback } from 'react'

interface Project {
  worktree: string
  // Add other project properties as needed
}

interface CurrentProject {
  path: string
  sessionId?: string
}

interface UseProjectsReturn {
  projects: Project[]
  currentProject: CurrentProject | null
  switchProject: (
    projectPath: string,
    config?: Record<string, unknown>
  ) => Promise<{ success: boolean; projectPath: string; port: number }>
  isLoading: boolean
  refreshProjects: () => Promise<void>
}

export const useProjects = (): UseProjectsReturn => {
  const [projects, setProjects] = useState<Project[]>([])
  const [currentProject, setCurrentProject] = useState<CurrentProject | null>(null)
  const [isLoading, setIsLoading] = useState(false)

  // Load projects and current project on mount and periodically
  const loadProjects = useCallback(async () => {
    try {
      const [projectList, current] = await Promise.all([
        window.api.toji.getProjects(),
        window.api.toji.getCurrentProject()
      ])

      setProjects((projectList as unknown as Project[]) || [])

      if (current && current.path) {
        setCurrentProject({ path: current.path, sessionId: current.sessionId })
      }
    } catch (error) {
      console.error('Failed to load projects:', error)
    }
  }, [])

  // Initialize and set up periodic refresh
  useEffect(() => {
    // Load immediately
    loadProjects()

    // Refresh every 5 seconds to catch newly discovered projects
    const interval = setInterval(loadProjects, 5000)

    return () => clearInterval(interval)
  }, [loadProjects])

  // Switch to a different project
  const switchProject = useCallback(
    async (projectPath: string, config?: Record<string, unknown>) => {
      setIsLoading(true)
      try {
        const result = await window.api.toji.switchProject(projectPath, config)

        if (result.success) {
          // Update current project immediately
          setCurrentProject({ path: projectPath })

          // Refresh the projects list (new project should appear)
          await loadProjects()

          return result
        } else {
          throw new Error('Failed to switch project')
        }
      } catch (error) {
        console.error('Error switching project:', error)
        throw error
      } finally {
        setIsLoading(false)
      }
    },
    [loadProjects]
  )

  return {
    projects,
    currentProject,
    switchProject,
    isLoading,
    refreshProjects: loadProjects
  }
}
