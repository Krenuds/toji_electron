import { useState, useEffect, useCallback } from 'react'

interface OpenCodeLogsState {
  logs: string | null
  loading: boolean
  error: string | null
}

export function useOpenCodeLogs(): OpenCodeLogsState & {
  refresh: () => Promise<void>
} {
  const [state, setState] = useState<OpenCodeLogsState>({
    logs: null,
    loading: true,
    error: null
  })

  const refresh = useCallback(async (): Promise<void> => {
    try {
      setState((prev) => ({ ...prev, loading: true, error: null }))
      const logPath = await window.api.logger.getLogPath()
      setState({ logs: `Log file location: ${logPath}`, loading: false, error: null })
    } catch (error) {
      setState((prev) => ({
        ...prev,
        loading: false,
        error: error instanceof Error ? error.message : 'Failed to fetch logs'
      }))
    }
  }, [])

  // Initial load
  useEffect(() => {
    refresh()
  }, [refresh])

  return {
    ...state,
    refresh
  }
}
