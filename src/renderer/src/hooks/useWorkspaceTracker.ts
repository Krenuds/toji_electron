import { useState, useCallback, useEffect } from 'react'

interface WorkspaceInfo {
  exists: boolean
  hasGit: boolean
  hasOpenCodeConfig: boolean
  hasGitignore: boolean
}

interface UseWorkspaceTrackerReturn {
  // Current workspace
  currentDirectory: string | undefined
  isLoading: boolean
  error: string | null

  // Workspace collections
  collections: any[] // Using any for now since types aren't properly exported
  enrichedProjects: any[]
  discoveredProjects: any[]

  // Actions
  changeWorkspace: (directory: string) => Promise<void>
  inspectWorkspace: (directory: string) => Promise<WorkspaceInfo | null>
  discoverProjects: (baseDir?: string) => Promise<void>
  refreshCollections: () => Promise<void>
  refreshProjects: () => Promise<void>
}

export function useWorkspaceTracker(): UseWorkspaceTrackerReturn {
  const [currentDirectory, setCurrentDirectory] = useState<string | undefined>(undefined)
  const [collections, setCollections] = useState<any[]>([])
  const [enrichedProjects, setEnrichedProjects] = useState<any[]>([])
  const [discoveredProjects, setDiscoveredProjects] = useState<any[]>([])
  const [isLoading, setIsLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  // Get current workspace directory
  const fetchCurrentDirectory = useCallback(async () => {
    try {
      const dir = await window.api.core.getCurrentDirectory()
      setCurrentDirectory(dir)
    } catch (error) {
      console.error('Failed to get current directory:', error)
    }
  }, [])

  // Refresh workspace collections
  const refreshCollections = useCallback(async () => {
    setIsLoading(true)
    setError(null)

    try {
      const result = await window.api.core.getWorkspaceCollections()
      setCollections(result || [])
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Failed to fetch collections'
      setError(errorMessage)
      setCollections([])
    } finally {
      setIsLoading(false)
    }
  }, [])

  // Refresh enriched projects
  const refreshProjects = useCallback(async () => {
    setIsLoading(true)
    setError(null)

    try {
      const result = await window.api.core.getEnrichedProjects()
      setEnrichedProjects(result || [])
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Failed to fetch projects'
      setError(errorMessage)
      setEnrichedProjects([])
    } finally {
      setIsLoading(false)
    }
  }, [])

  // Change workspace
  const changeWorkspace = useCallback(async (directory: string) => {
    setIsLoading(true)
    setError(null)

    try {
      await window.api.core.changeWorkspace(directory)
      setCurrentDirectory(directory)

      // Refresh collections and projects after workspace change
      await refreshCollections()
      await refreshProjects()
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Failed to change workspace'
      setError(errorMessage)
      throw error
    } finally {
      setIsLoading(false)
    }
  }, [refreshCollections, refreshProjects])

  // Inspect a workspace without changing to it
  const inspectWorkspace = useCallback(async (directory: string): Promise<WorkspaceInfo | null> => {
    try {
      return await window.api.core.inspectWorkspace(directory)
    } catch (error) {
      console.error('Failed to inspect workspace:', error)
      return null
    }
  }, [])

  // Discover projects in a directory
  const discoverProjects = useCallback(async (baseDir?: string) => {
    setIsLoading(true)
    setError(null)

    try {
      const result = await window.api.core.discoverProjects(baseDir)
      setDiscoveredProjects(result || [])
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Failed to discover projects'
      setError(errorMessage)
      setDiscoveredProjects([])
    } finally {
      setIsLoading(false)
    }
  }, [])

  // Initialize on mount
  useEffect(() => {
    fetchCurrentDirectory()
    refreshCollections()
    refreshProjects()
  }, [fetchCurrentDirectory, refreshCollections, refreshProjects])

  // Set up polling for updates (every 30 seconds)
  useEffect(() => {
    const interval = setInterval(() => {
      refreshCollections()
      refreshProjects()
    }, 30000)

    return () => clearInterval(interval)
  }, [refreshCollections, refreshProjects])

  return {
    currentDirectory,
    isLoading,
    error,
    collections,
    enrichedProjects,
    discoveredProjects,
    changeWorkspace,
    inspectWorkspace,
    discoverProjects,
    refreshCollections,
    refreshProjects
  }
}