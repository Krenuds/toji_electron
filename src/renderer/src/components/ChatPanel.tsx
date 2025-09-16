import React, { useState } from 'react'

interface ChatPanelProps {
  className?: string
}

interface ChatMessage {
  role: 'user' | 'assistant'
  content: string
  timestamp: Date
  error?: boolean
}

export function ChatPanel({ className }: ChatPanelProps): React.JSX.Element {
  const [messages, setMessages] = useState<ChatMessage[]>([])
  const [inputText, setInputText] = useState('')
  const [isLoading, setIsLoading] = useState(false)

  const sendMessage = async () => {
    if (!inputText.trim() || isLoading) return

    const userMessage: ChatMessage = {
      role: 'user',
      content: inputText.trim(),
      timestamp: new Date()
    }

    setMessages(prev => [...prev, userMessage])
    setInputText('')
    setIsLoading(true)

    try {
      // Use Core API to send message
      const response = await window.api.core.sendMessage(inputText.trim())

      const assistantMessage: ChatMessage = {
        role: 'assistant',
        content: response,
        timestamp: new Date()
      }

      setMessages(prev => [...prev, assistantMessage])
    } catch (error) {
      const errorMessage: ChatMessage = {
        role: 'assistant',
        content: `Error: ${error instanceof Error ? error.message : 'Unknown error'}`,
        timestamp: new Date(),
        error: true
      }

      setMessages(prev => [...prev, errorMessage])
    } finally {
      setIsLoading(false)
    }
  }

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault()
      sendMessage()
    }
  }

  return (
    <div className={`chat-panel ${className}`}>
      <div className="chat-header">
        <h3>AI Chat</h3>
        <small>Powered by OpenCode Core API</small>
      </div>

      <div className="chat-messages">
        {messages.length === 0 && (
          <div className="chat-welcome">
            <p>Welcome! Start a conversation with the AI.</p>
            <p><small>Make sure OpenCode service is running first.</small></p>
          </div>
        )}

        {messages.map((message, index) => (
          <div
            key={index}
            className={`chat-message ${message.role} ${message.error ? 'error' : ''}`}
          >
            <div className="message-header">
              <span className="role">{message.role}</span>
              <span className="timestamp">
                {message.timestamp.toLocaleTimeString()}
              </span>
            </div>
            <div className="message-content">
              {message.content}
            </div>
          </div>
        ))}

        {isLoading && (
          <div className="chat-message assistant loading">
            <div className="message-header">
              <span className="role">assistant</span>
            </div>
            <div className="message-content">
              <span className="loading-dots">Thinking...</span>
            </div>
          </div>
        )}
      </div>

      <div className="chat-input">
        <textarea
          value={inputText}
          onChange={(e) => setInputText(e.target.value)}
          onKeyDown={handleKeyDown}
          placeholder="Type your message... (Enter to send, Shift+Enter for new line)"
          disabled={isLoading}
          rows={3}
        />
        <button
          onClick={sendMessage}
          disabled={!inputText.trim() || isLoading}
          className="send-button"
        >
          {isLoading ? 'Sending...' : 'Send'}
        </button>
      </div>
    </div>
  )
}