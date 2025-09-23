import { useState, useCallback } from 'react'
import { useBinaryStatus } from './useBinaryStatus'

interface UseOpenProjectReturn {
  openProject: () => Promise<void>
  loading: boolean
  error: string | null
  currentProject: string | null
}

export function useOpenProject(): UseOpenProjectReturn {
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [currentProject, setCurrentProject] = useState<string | null>(null)
  const { info } = useBinaryStatus()

  const openProject = useCallback(async (): Promise<void> => {
    setError(null)

    // Check if binary is installed first
    if (!info?.installed) {
      setError('OpenCode binary not installed. Please install it first.')
      return
    }

    setLoading(true)

    try {
      // Open directory dialog
      const directory = await window.api.window.selectDirectory()
      if (!directory) {
        // User cancelled the dialog
        return
      }

      // Open the project (starts server and connects client)
      const port = await window.api.project.open(directory)

      // Update current project state
      setCurrentProject(directory)

      console.log(`Project opened successfully: ${directory} on port ${port}`)
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Failed to open project'
      setError(message)
      console.error('Failed to open project:', err)
    } finally {
      setLoading(false)
    }
  }, [info?.installed])

  return {
    openProject,
    loading,
    error,
    currentProject
  }
}
