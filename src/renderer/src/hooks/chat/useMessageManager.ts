import { useState, useCallback, useRef, useEffect } from 'react'
import { formatMessagesFromSDK, type ChatMessage } from '../../utils/messageFormatter'
import { usePersistedState } from '../usePersistedState'
import { CACHE_KEYS } from '../../constants/cacheKeys'

// ============================================================================
// Type Definitions
// ============================================================================

interface MessageState {
  messages: ChatMessage[]
  isLoadingMessages: boolean
  isSendingMessage: boolean
  messageError: string | null
}

export interface UseMessageManagerReturn extends MessageState {
  sendMessage: (
    message: string,
    serverStatus: 'offline' | 'online' | 'initializing'
  ) => Promise<void>
  loadMessages: (sessionId?: string, forceRefresh?: boolean) => Promise<void>
  loadCachedMessages: () => void
  clearMessages: () => void
  setMessages: (messages: ChatMessage[]) => void
  setIsLoadingMessages: (loading: boolean) => void
  setIsSendingMessage: (sending: boolean) => void
  setMessageError: (error: string | null) => void
}

// ============================================================================
// Hook Implementation
// ============================================================================

export function useMessageManager(
  currentSessionId: string | undefined,
  onServerStatusChange: (status: 'offline' | 'online' | 'initializing') => void,
  checkServerStatus: () => Promise<boolean>
): UseMessageManagerReturn {
  // Persisted state for messages with Date hydration
  // Note: We use a dynamic key based on sessionId, so we need to handle the key change
  const cacheKey = currentSessionId
    ? CACHE_KEYS.CACHED_MESSAGES(currentSessionId)
    : 'toji3_cached_messages_none'

  const [messages, setMessages] = usePersistedState<ChatMessage[]>(cacheKey, [], {
    hydrate: (messages) =>
      messages.map((msg) => ({
        ...msg,
        timestamp: new Date(msg.timestamp)
      }))
  })

  // Non-persisted state
  const [state, setState] = useState({
    isLoadingMessages: false,
    isSendingMessage: false,
    messageError: null as string | null
  })

  // Refs to prevent race conditions
  const loadMessagesAbortRef = useRef<AbortController | null>(null)

  // Clear messages when session changes
  useEffect(() => {
    if (!currentSessionId) {
      setMessages([])
    }
  }, [currentSessionId, setMessages])

  // Load cached messages (now handled by usePersistedState, but kept for API compatibility)
  const loadCachedMessages = useCallback(() => {
    // No-op: usePersistedState automatically loads cached data on mount
  }, [])

  // Load messages for specific session
  const loadMessages = useCallback(
    async (sessionId?: string, forceRefresh = false) => {
      // Cancel any in-flight message loading
      if (loadMessagesAbortRef.current) {
        loadMessagesAbortRef.current.abort()
      }

      // Create new abort controller for this request
      const abortController = new AbortController()
      loadMessagesAbortRef.current = abortController

      // Use provided sessionId or fall back to current state
      const targetSessionId = sessionId || currentSessionId

      if (!targetSessionId) {
        setMessages([])
        return
      }

      // If a specific sessionId is provided, we're explicitly loading for that session
      // This happens during project/session switches before state is updated
      // So we should NOT skip based on currentSessionId comparison
      if (!sessionId && !currentSessionId) {
        return
      }
      setState((prev) => ({ ...prev, isLoadingMessages: true, messageError: null }))

      try {
        const sdkMessages = await window.api.toji.getSessionMessages(targetSessionId, !forceRefresh)

        // Check if request was aborted
        if (abortController.signal.aborted) {
          return
        }

        const formattedMessages = formatMessagesFromSDK(sdkMessages)

        // If we explicitly requested this session's messages, update state
        // OR if it matches the current session
        if (sessionId || targetSessionId === currentSessionId) {
          setMessages(formattedMessages)
        }
      } catch {
        // Don't log errors for aborted requests
        if (!abortController.signal.aborted) {
          // Backend handles error logging
          setState((prev) => ({ ...prev, messageError: 'Failed to load messages' }))
        }
      } finally {
        if (!abortController.signal.aborted) {
          setState((prev) => ({ ...prev, isLoadingMessages: false }))
        }
        // Clear the abort controller reference if it's still this one
        if (loadMessagesAbortRef.current === abortController) {
          loadMessagesAbortRef.current = null
        }
      }
    },
    [currentSessionId, setMessages]
  )

  // Send message
  const sendMessage = useCallback(
    async (message: string, serverStatus: 'offline' | 'online' | 'initializing') => {
      if (!message.trim() || state.isSendingMessage) return

      setState((prev) => ({ ...prev, isSendingMessage: true, messageError: null }))

      try {
        // Ensure server is ready
        if (serverStatus === 'offline') {
          onServerStatusChange('initializing')
          await window.api.toji.ensureReadyForChat()
          await checkServerStatus()
        }

        // Send message
        const response = await window.api.toji.chat(message)

        if (response) {
          // Reload messages to get the complete conversation
          await loadMessages(currentSessionId, true)
        }
      } catch (error) {
        console.error('Failed to send message:', error)
        setState((prev) => ({ ...prev, messageError: 'Failed to send message' }))
      } finally {
        setState((prev) => ({ ...prev, isSendingMessage: false }))
      }
    },
    [
      state.isSendingMessage,
      currentSessionId,
      checkServerStatus,
      loadMessages,
      onServerStatusChange
    ]
  )

  // Clear messages
  const clearMessages = useCallback(() => {
    setMessages([])
  }, [setMessages])

  // Setter for external coordination (setMessages is already from usePersistedState)

  const setIsLoadingMessages = useCallback((loading: boolean) => {
    setState((prev) => ({ ...prev, isLoadingMessages: loading }))
  }, [])

  const setIsSendingMessage = useCallback((sending: boolean) => {
    setState((prev) => ({ ...prev, isSendingMessage: sending }))
  }, [])

  const setMessageError = useCallback((error: string | null) => {
    setState((prev) => ({ ...prev, messageError: error }))
  }, [])

  return {
    ...state,
    messages,
    sendMessage,
    loadMessages,
    loadCachedMessages,
    clearMessages,
    setMessages,
    setIsLoadingMessages,
    setIsSendingMessage,
    setMessageError
  }
}
