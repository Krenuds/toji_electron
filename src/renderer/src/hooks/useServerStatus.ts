import { useState, useEffect } from 'react'

interface ServerStatus {
  isRunning: boolean
  port?: number
  pid?: number
  startTime?: Date
  uptime?: number
  isHealthy?: boolean
  lastHealthCheck?: Date
}

interface UseServerStatusReturn {
  status: ServerStatus
  loading: boolean
  error: string | null
  startServer: () => Promise<void>
  stopServer: () => Promise<void>
}

export function useServerStatus(): UseServerStatusReturn {
  const [status, setStatus] = useState<ServerStatus>({
    isRunning: false
  })
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const fetchStatus = async (): Promise<void> => {
    try {
      const serverStatus = await window.api.toji.getServerStatus()
      setStatus(serverStatus)
    } catch {
      // Backend handles error logging
    }
  }

  const startServer = async (): Promise<void> => {
    setLoading(true)
    setError(null)
    try {
      await window.api.toji.startServer()
      await fetchStatus()
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Failed to start server'
      setError(message)
      // Backend handles error logging
    } finally {
      setLoading(false)
    }
  }

  const stopServer = async (): Promise<void> => {
    setLoading(true)
    setError(null)
    try {
      await window.api.toji.stopServer()
      await fetchStatus()
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Failed to stop server'
      setError(message)
      // Backend handles error logging
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    fetchStatus()
    const interval = setInterval(fetchStatus, 2000) // Poll every 2 seconds
    return () => clearInterval(interval)
  }, [])

  return {
    status,
    loading,
    error,
    startServer,
    stopServer
  }
}
