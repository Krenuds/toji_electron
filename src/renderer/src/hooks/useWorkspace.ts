import { useState, useCallback } from 'react'

interface WorkspaceInfo {
  isNew: boolean
  hasGit: boolean
  hasOpenCodeConfig: boolean
  sessionId: string
  workspacePath: string
}

interface UseWorkspaceResult {
  isChangingWorkspace: boolean
  currentWorkspace: string | undefined
  workspaceInfo: WorkspaceInfo | null
  error: string | null
  selectAndChangeWorkspace: () => Promise<void>
  changeWorkspace: (directory: string) => Promise<void>
}

export function useWorkspace(): UseWorkspaceResult {
  const [isChangingWorkspace, setIsChangingWorkspace] = useState(false)
  const [currentWorkspace, setCurrentWorkspace] = useState<string | undefined>()
  const [workspaceInfo, setWorkspaceInfo] = useState<WorkspaceInfo | null>(null)
  const [error, setError] = useState<string | null>(null)

  const changeWorkspace = useCallback(async (directory: string) => {
    setIsChangingWorkspace(true)
    setError(null)

    try {
      const info = await window.api.core.changeWorkspace(directory)
      setWorkspaceInfo(info)
      setCurrentWorkspace(info.workspacePath)
      console.log('Workspace changed successfully:', info)
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Failed to change workspace'
      setError(errorMessage)
      console.error('Failed to change workspace:', err)
      throw err
    } finally {
      setIsChangingWorkspace(false)
    }
  }, [])

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

  return {
    isChangingWorkspace,
    currentWorkspace,
    workspaceInfo,
    error,
    selectAndChangeWorkspace,
    changeWorkspace
  }
}
