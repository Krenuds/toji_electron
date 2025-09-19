import { useState, useCallback, useContext, useEffect } from 'react'
import { AppViewContext } from '../contexts/AppViewContextDef'

interface WorkspaceInfo {
  isNew: boolean
  hasGit: boolean
  hasOpenCodeConfig: boolean
  hasTojiToken: boolean
  sessionId: string
  workspacePath: string
}

interface UseWorkspaceResult {
  isChangingWorkspace: boolean
  currentWorkspace: string | undefined
  workspaceInfo: WorkspaceInfo | null
  error: string | null
  recentWorkspaces: string[]
  selectAndChangeWorkspace: () => Promise<void>
  changeWorkspace: (directory: string) => Promise<void>
  fetchRecentWorkspaces: () => Promise<void>
  removeRecentWorkspace: (path: string) => Promise<void>
  clearRecentWorkspaces: () => Promise<void>
}

export function useWorkspace(): UseWorkspaceResult {
  const [isChangingWorkspace, setIsChangingWorkspace] = useState(false)
  const [currentWorkspace, setCurrentWorkspace] = useState<string | undefined>()
  const [workspaceInfo, setWorkspaceInfo] = useState<WorkspaceInfo | null>(null)
  const [error, setError] = useState<string | null>(null)
  const [recentWorkspaces, setRecentWorkspaces] = useState<string[]>([])

  // Get the view context to switch to chat after opening workspace
  const viewContext = useContext(AppViewContext)

  const changeWorkspace = useCallback(
    async (directory: string) => {
      setIsChangingWorkspace(true)
      setError(null)

      try {
        const info = await window.api.core.changeWorkspace(directory)
        setWorkspaceInfo(info)
        setCurrentWorkspace(info.workspacePath)
        console.log('Workspace changed successfully:', info)

        // After successfully opening a workspace, switch to the chat view
        if (viewContext) {
          viewContext.setActiveView('chat')
        }
      } catch (err) {
        const errorMessage = err instanceof Error ? err.message : 'Failed to change workspace'
        setError(errorMessage)
        console.error('Failed to change workspace:', err)
        throw err
      } finally {
        setIsChangingWorkspace(false)
      }
    },
    [viewContext]
  )

  const selectAndChangeWorkspace = useCallback(async () => {
    try {
      const selectedDirectory = await window.api.window.selectDirectory()

      if (!selectedDirectory) {
        // User canceled the dialog
        return
      }

      await changeWorkspace(selectedDirectory)
    } catch (err) {
      console.error('Failed to select and change workspace:', err)
      // Error is already handled in changeWorkspace
    }
  }, [changeWorkspace])

  const fetchRecentWorkspaces = useCallback(async () => {
    try {
      const recent = await window.api.core.getRecentWorkspaces()
      setRecentWorkspaces(recent)
    } catch (err) {
      console.error('Failed to fetch recent workspaces:', err)
    }
  }, [])

  const removeRecentWorkspace = useCallback(async (path: string) => {
    try {
      const updated = await window.api.core.removeRecentWorkspace(path)
      setRecentWorkspaces(updated)
    } catch (err) {
      console.error('Failed to remove recent workspace:', err)
    }
  }, [])

  const clearRecentWorkspaces = useCallback(async () => {
    try {
      await window.api.core.clearRecentWorkspaces()
      setRecentWorkspaces([])
    } catch (err) {
      console.error('Failed to clear recent workspaces:', err)
    }
  }, [])

  // Fetch current workspace directory and recent workspaces on mount
  useEffect(() => {
    const fetchInitialData = async (): Promise<void> => {
      try {
        // Check if OpenCode is running and get current directory
        const isRunning = await window.api.core.isRunning()
        if (isRunning) {
          const directory = await window.api.core.getCurrentDirectory()
          if (directory) {
            // Set the workspace info without changing it (just populating state)
            setCurrentWorkspace(directory)
            // We need to get the full workspace info, but we don't have a direct API for that
            // So we'll just set what we know
            setWorkspaceInfo({
              workspacePath: directory,
              isNew: false,
              hasGit: true, // These would need proper checking
              hasOpenCodeConfig: true,
              hasTojiToken: false,
              sessionId: ''
            })
          }
        }

        // Fetch recent workspaces
        const recent = await window.api.core.getRecentWorkspaces()
        setRecentWorkspaces(recent)
      } catch (err) {
        console.error('Failed to fetch initial workspace data:', err)
      }
    }

    fetchInitialData()
  }, [])

  return {
    isChangingWorkspace,
    currentWorkspace,
    workspaceInfo,
    error,
    recentWorkspaces,
    selectAndChangeWorkspace,
    changeWorkspace,
    fetchRecentWorkspaces,
    removeRecentWorkspace,
    clearRecentWorkspaces
  }
}
