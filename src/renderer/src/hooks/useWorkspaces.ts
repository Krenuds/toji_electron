import { useState, useEffect, useCallback } from 'react'

interface SimpleWorkspace {
  path: string
  name: string
  sessionCount: number
  lastActivity: Date | null
  source?: 'session' | 'recent' | 'both'
}

interface UseWorkspacesReturn {
  workspaces: SimpleWorkspace[]
  isLoading: boolean
  error: string | null
  refreshWorkspaces: () => Promise<void>
  openWorkspaceDirectory: (path: string) => Promise<void>
}

export function useWorkspaces(): UseWorkspacesReturn {
  const [workspaces, setWorkspaces] = useState<SimpleWorkspace[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  const fetchWorkspaces = useCallback(async () => {
    setIsLoading(true)
    setError(null)
    try {
      const data = await window.api.toji.getAllWorkspaces()
      // Transform to SimpleWorkspace format
      const workspacesWithDates = data.map((ws) => ({
        path: ws.path,
        name: ws.path.split(/[/\\]/).pop() || ws.path,
        sessionCount: ws.sessions?.length || 0,
        lastActivity: null
      }))
      setWorkspaces(workspacesWithDates)
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to fetch workspaces')
      console.error('Error fetching workspaces:', err)
    } finally {
      setIsLoading(false)
    }
  }, [])

  const openWorkspaceDirectory = useCallback(async () => {
    try {
      await window.api.toji.openWorkspaceDirectory()
    } catch (err) {
      console.error('Error opening workspace directory:', err)
    }
  }, [])

  useEffect(() => {
    fetchWorkspaces()
  }, [fetchWorkspaces])

  return {
    workspaces,
    isLoading,
    error,
    refreshWorkspaces: fetchWorkspaces,
    openWorkspaceDirectory
  }
}
