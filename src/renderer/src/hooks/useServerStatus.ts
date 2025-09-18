import { useState, useEffect } from 'react'

type ServerStatus = 'running' | 'stopped' | 'checking'

export function useServerStatus(): ServerStatus {
  const [serverStatus, setServerStatus] = useState<ServerStatus>('checking')

  useEffect(() => {
    const checkStatus = async (): Promise<void> => {
      try {
        const isRunning = await window.api.core.isRunning()
        setServerStatus(isRunning ? 'running' : 'stopped')
      } catch (error) {
        console.error('Failed to check server status:', error)
        setServerStatus('stopped')
      }
    }

    checkStatus()
    const interval = setInterval(checkStatus, 2000)

    return () => clearInterval(interval)
  }, [])

  return serverStatus
}
