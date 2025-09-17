import { useState, useCallback, useRef, useEffect } from 'react'

export interface Message {
  id: string
  type: 'user' | 'assistant' | 'system'
  content: string
  timestamp: Date
}

export interface ChatState {
  messages: Message[]
  isLoading: boolean
  error: string | null
}

export function useChat(): {
  messages: Message[]
  isLoading: boolean
  error: string | null
  messagesEndRef: React.RefObject<HTMLDivElement | null>
  sendMessage: (content: string) => Promise<void>
  addSystemMessage: (content: string) => void
  clearMessages: () => void
  clearError: () => void
} {
  const [state, setState] = useState<ChatState>({
    messages: [],
    isLoading: false,
    error: null
  })

  const messagesEndRef = useRef<HTMLDivElement>(null)

  // Auto-scroll to bottom when messages change
  const scrollToBottom = useCallback(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' })
  }, [])

  useEffect(() => {
    scrollToBottom()
  }, [state.messages, scrollToBottom])

  // Send message
  const sendMessage = useCallback(
    async (content: string) => {
      if (!content.trim() || state.isLoading) return

      const userMessage: Message = {
        id: Date.now().toString(),
        type: 'user',
        content: content.trim(),
        timestamp: new Date()
      }

      setState((prev) => ({
        ...prev,
        messages: [...prev.messages, userMessage],
        isLoading: true,
        error: null
      }))

      try {
        const response = await window.api.core.prompt(userMessage.content)

        const assistantMessage: Message = {
          id: (Date.now() + 1).toString(),
          type: 'assistant',
          content: response,
          timestamp: new Date()
        }

        setState((prev) => ({
          ...prev,
          messages: [...prev.messages, assistantMessage],
          isLoading: false
        }))
      } catch (error) {
        setState((prev) => ({
          ...prev,
          isLoading: false,
          error: error instanceof Error ? error.message : 'Failed to get response'
        }))
      }
    },
    [state.isLoading]
  )

  // Add system message
  const addSystemMessage = useCallback((content: string) => {
    const systemMessage: Message = {
      id: Date.now().toString(),
      type: 'system',
      content,
      timestamp: new Date()
    }

    setState((prev) => ({
      ...prev,
      messages: [...prev.messages, systemMessage]
    }))
  }, [])

  // Clear messages
  const clearMessages = useCallback(() => {
    setState((prev) => ({
      ...prev,
      messages: [],
      error: null
    }))
  }, [])

  // Clear error
  const clearError = useCallback(() => {
    setState((prev) => ({ ...prev, error: null }))
  }, [])

  return {
    ...state,
    messagesEndRef,
    sendMessage,
    addSystemMessage,
    clearMessages,
    clearError
  }
}
