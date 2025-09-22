import { useState, useCallback, useEffect } from 'react'
import type {
  WorkspaceCollection,
  EnrichedProject,
  DiscoveredProject,
  WorkspaceInfo as BaseWorkspaceInfo
} from '../../../preload/index.d'

interface WorkspaceInfo extends BaseWorkspaceInfo {
  exists?: boolean
  hasGitignore?: boolean
}

interface UseWorkspaceTrackerReturn {
  // Current workspace
  currentDirectory: string | undefined
  isLoading: boolean
  error: string | null

  // Workspace collections
  collections: WorkspaceCollection[]
  enrichedProjects: EnrichedProject[]
  discoveredProjects: DiscoveredProject[]

  // Actions
  changeWorkspace: (directory: string) => Promise<void>
  inspectWorkspace: (directory: string) => Promise<WorkspaceInfo | null>
  discoverProjects: (baseDir?: string) => Promise<void>
  refreshCollections: () => Promise<void>
  refreshProjects: () => Promise<void>
}

export function useWorkspaceTracker(): UseWorkspaceTrackerReturn {
  const [currentDirectory, setCurrentDirectory] = useState<string | undefined>(undefined)
  const [collections, setCollections] = useState<WorkspaceCollection[]>([])
  const [enrichedProjects, setEnrichedProjects] = useState<EnrichedProject[]>([])
  const [discoveredProjects, setDiscoveredProjects] = useState<DiscoveredProject[]>([])
  const [isLoading, setIsLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  // Get current workspace directory
  const fetchCurrentDirectory = useCallback(async () => {
    try {
      const dir = await window.api.toji.getCurrentDirectory()
      setCurrentDirectory(dir || undefined)
    } catch (error) {
      console.error('Failed to get current directory:', error)
    }
  }, [])

  // Refresh workspace collections
  const refreshCollections = useCallback(async () => {
    setIsLoading(true)
    setError(null)

    try {
      const result = await window.api.toji.getWorkspaceCollections()
      setCollections((result as WorkspaceCollection[]) || [])
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
      const result = await window.api.toji.getEnrichedProjects()
      setEnrichedProjects((result as EnrichedProject[]) || [])
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Failed to fetch projects'
      setError(errorMessage)
      setEnrichedProjects([])
    } finally {
      setIsLoading(false)
    }
  }, [])

  // Change workspace
  const changeWorkspace = useCallback(
    async (directory: string) => {
      setIsLoading(true)
      setError(null)

      try {
        await window.api.toji.changeWorkspace(directory)
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
    },
    [refreshCollections, refreshProjects]
  )

  // Inspect a workspace without changing to it
  const inspectWorkspace = useCallback(async (directory: string): Promise<WorkspaceInfo | null> => {
    try {
      return await window.api.toji.inspectWorkspace(directory)
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
      const result = await window.api.toji.discoverProjects(baseDir || '')
      setDiscoveredProjects((result as DiscoveredProject[]) || [])
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Failed to discover projects'
      setError(errorMessage)
      setDiscoveredProjects([])
    } finally {
      setIsLoading(false)
    }
  }, [])

  // Initialize on mount - empty dependency array to run only once
  useEffect(() => {
    fetchCurrentDirectory()
    refreshCollections()
    refreshProjects()
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

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
