import { useState, useCallback, useEffect, useRef } from 'react'

// ============================================================================
// Type Definitions
// ============================================================================

interface ServerStatusState {
  serverStatus: 'offline' | 'online' | 'initializing'
}

export interface UseServerStatusReturn extends ServerStatusState {
  checkServerStatus: () => Promise<boolean>
  setServerStatus: (status: 'offline' | 'online' | 'initializing') => void
}

// ============================================================================
// Hook Implementation
// ============================================================================

export function useServerStatus(): UseServerStatusReturn {
  // State
  const [state, setState] = useState<ServerStatusState>({
    serverStatus: 'offline'
  })

  // Refs for polling
  const pollingIntervalRef = useRef<NodeJS.Timeout | null>(null)

  // Check server status
  const checkServerStatus = useCallback(async (): Promise<boolean> => {
    try {
      const isRunning = await window.api.toji.isRunning()
      setState((prev) => ({ ...prev, serverStatus: isRunning ? 'online' : 'offline' }))
      return isRunning
    } catch {
      // Backend handles error logging
      setState((prev) => ({ ...prev, serverStatus: 'offline' }))
      return false
    }
  }, [])

  // Setter for external coordination
  const setServerStatus = useCallback((status: 'offline' | 'online' | 'initializing') => {
    setState((prev) => ({ ...prev, serverStatus: status }))
  }, [])

  // Set up polling for server status
  useEffect(() => {
    pollingIntervalRef.current = setInterval(() => {
      checkServerStatus()
    }, 5000)

    return () => {
      if (pollingIntervalRef.current) {
        clearInterval(pollingIntervalRef.current)
      }
    }
  }, [checkServerStatus])

  return {
    ...state,
    checkServerStatus,
    setServerStatus
  }
}
