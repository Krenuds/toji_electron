import { useState, useEffect, useCallback } from 'react'

export interface AgentState {
  isRunning: boolean
  currentDirectory: string
  isLoading: boolean
  error: string | null
}

export function useAgent(): {
  isRunning: boolean
  currentDirectory: string
  isLoading: boolean
  error: string | null
  startAgent: (directory: string) => Promise<void>
  stopAgent: () => Promise<void>
  clearError: () => void
  refresh: () => Promise<void>
} {
  const [state, setState] = useState<AgentState>({
    isRunning: false,
    currentDirectory: '',
    isLoading: false,
    error: null
  })

  // Load initial agent status
  const loadStatus = useCallback(async () => {
    try {
      const running = await window.api.core.isRunning()
      const directory = running ? (await window.api.core.getCurrentDirectory()) || '' : ''

      setState((prev) => ({
        ...prev,
        isRunning: running,
        currentDirectory: directory,
        error: null
      }))
    } catch (error) {
      setState((prev) => ({
        ...prev,
        error: error instanceof Error ? error.message : 'Failed to load agent status'
      }))
    }
  }, [])

  // Start agent in specified directory
  const startAgent = useCallback(async (directory: string) => {
    if (!directory.trim()) {
      setState((prev) => ({ ...prev, error: 'Please enter a directory path' }))
      return
    }

    setState((prev) => ({ ...prev, isLoading: true, error: null }))

    try {
      await window.api.core.startOpencode(directory.trim())
      setState((prev) => ({
        ...prev,
        isRunning: true,
        currentDirectory: directory.trim(),
        isLoading: false
      }))
    } catch (error) {
      setState((prev) => ({
        ...prev,
        error: error instanceof Error ? error.message : 'Failed to start agent',
        isLoading: false
      }))
    }
  }, [])

  // Stop agent
  const stopAgent = useCallback(async () => {
    setState((prev) => ({ ...prev, isLoading: true, error: null }))

    try {
      await window.api.core.stopOpencode()
      setState((prev) => ({
        ...prev,
        isRunning: false,
        currentDirectory: '',
        isLoading: false
      }))
    } catch (error) {
      setState((prev) => ({
        ...prev,
        error: error instanceof Error ? error.message : 'Failed to stop agent',
        isLoading: false
      }))
    }
  }, [])

  // Clear error
  const clearError = useCallback(() => {
    setState((prev) => ({ ...prev, error: null }))
  }, [])

  // Load status on mount
  useEffect(() => {
    loadStatus()
  }, [loadStatus])

  return {
    ...state,
    startAgent,
    stopAgent,
    clearError,
    refresh: loadStatus
  }
}
