import { useState, useCallback } from 'react'
import { formatMessagesFromSDK, type ChatMessage } from '../utils/messageFormatter'

interface ChatResponse {
  success: boolean
  message?: string
  error?: string
}

interface EnsureReadyResponse {
  serverStatus: 'online' | 'offline' | 'initializing'
  error?: string
}

interface UseChatReturn {
  sendMessage: (message: string) => Promise<ChatResponse>
  checkServerStatus: () => Promise<boolean>
  ensureReadyForChat: () => Promise<EnsureReadyResponse>
  getSessionMessages: (sessionId?: string) => Promise<ChatMessage[]>
  getCurrentSessionId: () => Promise<string | undefined>
  getCurrentSession: () => Promise<{ id: string; directory?: string } | null>
  isLoading: boolean
  error: string | null
}

export function useChat(): UseChatReturn {
  const [isLoading, setIsLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const checkServerStatus = useCallback(async (): Promise<boolean> => {
    try {
      const isRunning = await window.api.toji.isRunning()
      return isRunning
    } catch (error) {
      console.error('Failed to check server status:', error)
      return false
    }
  }, [])

  const ensureReadyForChat = useCallback(async (): Promise<EnsureReadyResponse> => {
    try {
      await window.api.toji.ensureReadyForChat()
      // For now, return stubbed status since API returns void
      return { serverStatus: 'online' }
    } catch (error) {
      console.error('Failed to ensure ready for chat:', error)
      return {
        serverStatus: 'offline',
        error: error instanceof Error ? error.message : 'Unknown error'
      }
    }
  }, [])

  const sendMessage = useCallback(async (message: string): Promise<ChatResponse> => {
    setIsLoading(true)
    setError(null)

    try {
      const response = await window.api.toji.chat(message)
      return { success: true, message: response }
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Failed to send message'
      setError(errorMessage)
      return { success: false, error: errorMessage }
    } finally {
      setIsLoading(false)
    }
  }, [])

  const getSessionMessages = useCallback(async (sessionId?: string): Promise<ChatMessage[]> => {
    try {
      const sdkMessages = await window.api.toji.getSessionMessages(sessionId)
      return formatMessagesFromSDK(sdkMessages)
    } catch (error) {
      console.error('Failed to get session messages:', error)
      setError(error instanceof Error ? error.message : 'Failed to load message history')
      return []
    }
  }, [])

  const getCurrentSessionId = useCallback(async (): Promise<string | undefined> => {
    try {
      return await window.api.toji.getCurrentSessionId()
    } catch (error) {
      console.error('Failed to get current session ID:', error)
      return undefined
    }
  }, [])

  const getCurrentSession = useCallback(async (): Promise<{
    id: string
    directory?: string
  } | null> => {
    try {
      return await window.api.toji.getCurrentSession()
    } catch (error) {
      console.error('Failed to get current session:', error)
      return null
    }
  }, [])

  return {
    sendMessage,
    checkServerStatus,
    ensureReadyForChat,
    getSessionMessages,
    getCurrentSessionId,
    getCurrentSession,
    isLoading,
    error
  }
}
