import { useState, useCallback } from 'react'

/**
 * Hook for core OpenCode status operations
 * Abstracts window.api.toji status calls
 */

interface CoreStatus {
  isRunning: () => Promise<boolean>
  getCurrentDirectory: () => Promise<string | undefined>
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
      console.error('Failed to check running status:', err)
      return false
    } finally {
      setIsLoading(false)
    }
  }, [])

  const getCurrentDirectory = useCallback(async (): Promise<string | undefined> => {
    if (!window.api?.toji) {
      setError('Toji API not available')
      return undefined
    }

    setIsLoading(true)
    setError(null)

    try {
      const directory = await window.api.toji.getCurrentDirectory()
      return directory || undefined
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Failed to get current directory'
      setError(errorMessage)
      console.error('Failed to get current directory:', err)
      return undefined
    } finally {
      setIsLoading(false)
    }
  }, [])

  return {
    isRunning,
    getCurrentDirectory,
    isLoading,
    error
  }
}
