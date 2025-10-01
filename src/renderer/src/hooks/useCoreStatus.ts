import { useState, useCallback } from 'react'

/**
 * Hook for core OpenCode status operations
 * Abstracts window.api.toji status calls
 */

interface CoreStatus {
  isRunning: () => Promise<boolean>
  getCurrentProject: () => Promise<string | undefined>
  isLoading: boolean
  error: string | null
}

export const useCoreStatus = (): CoreStatus => {
  const [isLoading, setIsLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const isRunning = useCallback(async (): Promise<boolean> => {
    if (!window.api?.toji) {
      setError('Toji API not available')
      return false
    }

    setIsLoading(true)
    setError(null)

    try {
      const running = await window.api.toji.isRunning()
      return running
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Failed to check running status'
      setError(errorMessage)
      // Backend handles error logging
      return false
    } finally {
      setIsLoading(false)
    }
  }, [])

  const getCurrentProject = useCallback(async (): Promise<string | undefined> => {
    if (!window.api?.toji) {
      setError('Toji API not available')
      return undefined
    }

    setIsLoading(true)
    setError(null)

    try {
      const session = await window.api.toji.getCurrentSession()
      return session?.directory || undefined
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Failed to get current project'
      setError(errorMessage)
      // Backend handles error logging
      return undefined
    } finally {
      setIsLoading(false)
    }
  }, [])

  return {
    isRunning,
    getCurrentProject,
    isLoading,
    error
  }
}
