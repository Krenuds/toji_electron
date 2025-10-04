// Hook for managing OpenCode API keys
import { useState, useCallback } from 'react'
import type { ApiKeySyncResult } from '../../../preload/index.d'

interface UseOpencodeApiKeysReturn {
  setApiKey: (providerId: string, apiKey: string) => Promise<void>
  hasApiKey: (providerId: string) => Promise<boolean>
  clearApiKey: (providerId: string) => Promise<void>
  getConfiguredProviders: () => Promise<string[]>
  clearAllApiKeys: () => Promise<void>
  syncApiKeys: () => Promise<ApiKeySyncResult[]>
  isLoading: boolean
  error: string | null
}

export function useOpencodeApiKeys(): UseOpencodeApiKeysReturn {
  const [isLoading, setIsLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const setApiKey = useCallback(async (providerId: string, apiKey: string) => {
    setIsLoading(true)
    setError(null)
    try {
      await window.api.opencode.setApiKey(providerId, apiKey)
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Failed to set API key'
      setError(message)
      throw err
    } finally {
      setIsLoading(false)
    }
  }, [])

  const hasApiKey = useCallback(async (providerId: string): Promise<boolean> => {
    setError(null)
    try {
      return await window.api.opencode.hasApiKey(providerId)
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Failed to check API key'
      setError(message)
      return false
    }
  }, [])

  const clearApiKey = useCallback(async (providerId: string) => {
    setIsLoading(true)
    setError(null)
    try {
      await window.api.opencode.clearApiKey(providerId)
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Failed to clear API key'
      setError(message)
      throw err
    } finally {
      setIsLoading(false)
    }
  }, [])

  const getConfiguredProviders = useCallback(async (): Promise<string[]> => {
    setError(null)
    try {
      return await window.api.opencode.getConfiguredProviders()
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Failed to get configured providers'
      setError(message)
      return []
    }
  }, [])

  const clearAllApiKeys = useCallback(async () => {
    setIsLoading(true)
    setError(null)
    try {
      await window.api.opencode.clearAllApiKeys()
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Failed to clear all API keys'
      setError(message)
      throw err
    } finally {
      setIsLoading(false)
    }
  }, [])

  const syncApiKeys = useCallback(async (): Promise<ApiKeySyncResult[]> => {
    setIsLoading(true)
    setError(null)
    try {
      return await window.api.opencode.syncApiKeys()
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Failed to sync API keys'
      setError(message)
      throw err
    } finally {
      setIsLoading(false)
    }
  }, [])

  return {
    setApiKey,
    hasApiKey,
    clearApiKey,
    getConfiguredProviders,
    clearAllApiKeys,
    syncApiKeys,
    isLoading,
    error
  }
}
