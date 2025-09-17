import React, { useState } from 'react'
import { useChat } from '../../hooks/useChat'
import { Button, Input, ErrorMessage } from '../ui'

export interface ChatTerminalProps {
  className?: string
}

export function ChatTerminal({ className = '' }: ChatTerminalProps): React.JSX.Element {
  const { messages, isLoading, error, messagesEndRef, sendMessage, clearMessages, clearError } =
    useChat()
  const [input, setInput] = useState('')

  const handleSubmit = (e: React.FormEvent): void => {
    e.preventDefault()
    if (!input.trim() || isLoading) return

    sendMessage(input)
    setInput('')
  }

  const formatTime = (date: Date): string => {
    return date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
  }

  return (
    <div className={`chat-terminal ${className}`}>
      <div className="chat-header">
        <h3>AI Chat Terminal</h3>
        <div className="chat-controls">
          <Button
            variant="secondary"
            size="small"
            onClick={clearMessages}
            disabled={messages.length === 0}
          >
            Clear
          </Button>
        </div>
      </div>

      <ErrorMessage error={error} onDismiss={clearError} />

      <div className="messages-container">
        {messages.length === 0 && (
          <div className="empty-state">
            <div className="empty-icon">💬</div>
            <h4>Start a conversation</h4>
            <p>Type a message below to begin chatting with the AI agent.</p>
          </div>
        )}

        {messages.map((message) => (
          <div key={message.id} className={`message message-${message.type}`}>
            <div className="message-header">
              <span className="message-sender">
                {message.type === 'user'
                  ? '👤 You'
                  : message.type === 'assistant'
                    ? '🤖 AI'
                    : '⚙️ System'}
              </span>
              <span className="message-time">{formatTime(message.timestamp)}</span>
            </div>
            <div className="message-content">
              <pre className="message-text">{message.content}</pre>
            </div>
          </div>
        ))}

        {isLoading && (
          <div className="message message-assistant message-loading">
            <div className="message-header">
              <span className="message-sender">🤖 AI</span>
              <span className="message-time">thinking...</span>
            </div>
            <div className="message-content">
              <div className="loading-indicator">
                <div className="loading-dots">
                  <span></span>
                  <span></span>
                  <span></span>
                </div>
                <span className="loading-text">Generating response...</span>
              </div>
            </div>
          </div>
        )}

        <div ref={messagesEndRef} />
      </div>

      <form onSubmit={handleSubmit} className="chat-input">
        <div className="input-row">
          <Input
            value={input}
            onChange={setInput}
            placeholder="Type your message here..."
            disabled={isLoading}
            className="chat-input-field"
          />
          <Button
            type="submit"
            variant="primary"
            disabled={!input.trim() || isLoading}
            loading={isLoading}
          >
            Send
          </Button>
        </div>
      </form>
    </div>
  )
}
