import React from 'react'

export interface StatusIndicatorProps {
  status: 'running' | 'stopped' | 'loading' | 'error' | 'success'
  text?: string
  showIcon?: boolean
  className?: string
}

export function StatusIndicator({
  status,
  text,
  showIcon = true,
  className = ''
}: StatusIndicatorProps): React.JSX.Element {
  const statusConfig = {
    running: { icon: '🟢', color: '#28a745', label: 'Running' },
    stopped: { icon: '⚫', color: '#6c757d', label: 'Stopped' },
    loading: { icon: '🟡', color: '#ffc107', label: 'Loading' },
    error: { icon: '🔴', color: '#dc3545', label: 'Error' },
    success: { icon: '✅', color: '#28a745', label: 'Success' }
  }

  const config = statusConfig[status]
  const displayText = text || config.label

  return (
    <span
      className={`status-indicator status-${status} ${className}`}
      style={{ color: config.color }}
    >
      {showIcon && <span className="status-icon">{config.icon}</span>}
      <span className="status-text">{displayText}</span>
    </span>
  )
}
