import { useState, useEffect, useCallback } from 'react'

interface DiscordStatus {
  connected: boolean
  username?: string
  botId?: string
  guilds?: number
}

interface UseDiscordReturn {
  status: DiscordStatus
  hasToken: boolean
  isConnecting: boolean
  error: string | null
  connect: () => Promise<void>
  disconnect: () => Promise<void>
  toggleConnection: () => Promise<void>
  refreshStatus: () => Promise<void>
}

export function useDiscord(): UseDiscordReturn {
  const [status, setStatus] = useState<DiscordStatus>({ connected: false })
  const [isConnecting, setIsConnecting] = useState(false)
  const [hasToken, setHasToken] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const checkToken = async (): Promise<void> => {
    try {
      const tokenExists = await window.api.discord.hasToken()
      setHasToken(tokenExists)
    } catch (err) {
      console.error('Failed to check Discord token:', err)
      setHasToken(false)
    }
  }

  const refreshStatus = useCallback(async (): Promise<void> => {
    try {
      // Check both token and status when refreshing
      await checkToken()
      const discordStatus = await window.api.discord.getStatus()
      setStatus(discordStatus)
    } catch (err) {
      console.error('Failed to get Discord status:', err)
      setStatus({ connected: false })
    }
  }, [])

  // Check for token on mount
  useEffect(() => {
    checkToken()
    refreshStatus()
  }, [refreshStatus])

  const connect = useCallback(async () => {
    if (isConnecting) return

    setIsConnecting(true)
    setError(null)

    try {
      await window.api.discord.connect()
      // Wait a moment for connection to establish
      await new Promise((resolve) => setTimeout(resolve, 1000))
      await refreshStatus()
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Failed to connect to Discord'
      console.error('Discord connection error:', err)
      setError(errorMessage)
    } finally {
      setIsConnecting(false)
    }
  }, [isConnecting, refreshStatus])

  const disconnect = useCallback(async () => {
    try {
      await window.api.discord.disconnect()
      setStatus({ connected: false })
    } catch (err) {
      console.error('Failed to disconnect Discord:', err)
      const errorMessage = err instanceof Error ? err.message : 'Failed to disconnect'
      setError(errorMessage)
    }
  }, [])

  const toggleConnection = useCallback(async () => {
    if (status.connected) {
      await disconnect()
    } else {
      await connect()
    }
  }, [status.connected, connect, disconnect])

  // Auto-refresh status every 5 seconds when connected
  useEffect(() => {
    if (status.connected) {
      const interval = setInterval(refreshStatus, 5000)
      return () => clearInterval(interval)
    }
    return undefined
  }, [status.connected, refreshStatus])

  return {
    status,
    hasToken,
    isConnecting,
    error,
    connect,
    disconnect,
    toggleConnection,
    refreshStatus
  }
}
