import React from 'react'

export interface ErrorMessageProps {
  error: string | null
  onDismiss?: () => void
  className?: string
}

export function ErrorMessage({
  error,
  onDismiss,
  className = ''
}: ErrorMessageProps): React.JSX.Element | null {
  if (!error) return null

  return (
    <div className={`error-message ${className}`}>
      <div className="error-content">
        <span className="error-icon">⚠️</span>
        <span className="error-text">{error}</span>
        {onDismiss && (
          <button className="error-dismiss" onClick={onDismiss} aria-label="Dismiss error">
            ✕
          </button>
        )}
      </div>
    </div>
  )
}
