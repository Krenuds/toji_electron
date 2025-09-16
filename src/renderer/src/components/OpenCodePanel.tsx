import React, { useState, useEffect } from 'react'

// Types (duplicated here to avoid import issues in renderer)
interface BinaryInfo {
  path: string
  version?: string
  installed: boolean
  lastChecked: Date
}

interface ServerStatus {
  running: boolean
  url?: string
  error?: string
}

interface BinaryProgress {
  stage: 'downloading' | 'installing' | 'complete' | 'error'
  progress?: number
  message?: string
  error?: string
}

interface OpenCodePanelProps {
  className?: string
}

export const OpenCodePanel: React.FC<OpenCodePanelProps> = ({ className = '' }) => {
  const [binaryInfo, setBinaryInfo] = useState<BinaryInfo | null>(null)
  const [serverStatus, setServerStatus] = useState<ServerStatus | null>(null)
  const [isLoading, setIsLoading] = useState(false)
  const [progress, setProgress] = useState<BinaryProgress | null>(null)
  const [error, setError] = useState<string | null>(null)

  // Load initial data
  useEffect(() => {
    const loadData = async (): Promise<void> => {
      try {
        const [info, status] = await Promise.all([
          window.api.opencode.getBinaryInfo(),
          window.api.opencode.getServerStatus()
        ])
        setBinaryInfo(info)
        setServerStatus(status)
      } catch (err) {
        setError(err instanceof Error ? err.message : 'Failed to load OpenCode data')
      }
    }

    loadData()
  }, [])

  // Set up event listeners
  useEffect(() => {
    const unsubscribeServer = window.api.opencode.onServerStatusChange((status) => {
      setServerStatus(status)
    })

    const unsubscribeProgress = window.api.opencode.onBinaryUpdate((progressData) => {
      setProgress(progressData)
      if (progressData.stage === 'complete') {
        // Refresh binary info after successful download
        window.api.opencode.getBinaryInfo().then(setBinaryInfo)
      }
    })

    return () => {
      unsubscribeServer()
      unsubscribeProgress()
    }
  }, [])

  const handleDownloadBinary = async (): Promise<void> => {
    if (isLoading) return

    setIsLoading(true)
    setError(null)
    setProgress(null)

    try {
      await window.api.opencode.downloadBinary()
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to download binary')
    } finally {
      setIsLoading(false)
    }
  }

  const handleStartServer = async (): Promise<void> => {
    if (isLoading) return

    setIsLoading(true)
    setError(null)

    try {
      const status = await window.api.opencode.startServer()
      setServerStatus(status)
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to start server')
    } finally {
      setIsLoading(false)
    }
  }

  const handleStopServer = async (): Promise<void> => {
    if (isLoading) return

    setIsLoading(true)

    try {
      await window.api.opencode.stopServer()
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to stop server')
    } finally {
      setIsLoading(false)
    }
  }

  return (
    <div className={`opencode-panel ${className}`}>
      <div className="opencode-header">
        <h2>OpenCode AI Assistant</h2>
        <div className="status-indicator">
          <span
            className={`status-dot ${
              serverStatus?.running ? 'status-running' : 'status-stopped'
            }`}
          />
          <span className="status-text">
            {serverStatus?.running ? 'Running' : 'Stopped'}
          </span>
        </div>
      </div>

      {error && (
        <div className="error-message">
          <strong>Error:</strong> {error}
          <button
            type="button"
            className="error-dismiss"
            onClick={() => setError(null)}
          >
            ×
          </button>
        </div>
      )}

      <div className="opencode-section">
        <h3>Binary Status</h3>
        <div className="binary-info">
          <div className="info-row">
            <span className="label">Installed:</span>
            <span className={`value ${binaryInfo?.installed ? 'installed' : 'not-installed'}`}>
              {binaryInfo?.installed ? 'Yes' : 'No'}
            </span>
          </div>
          {binaryInfo?.installed && (
            <>
              <div className="info-row">
                <span className="label">Path:</span>
                <span className="value path">{binaryInfo.path}</span>
              </div>
              <div className="info-row">
                <span className="label">Version:</span>
                <span className="value">{binaryInfo.version || 'Unknown'}</span>
              </div>
            </>
          )}
        </div>

        {!binaryInfo?.installed && (
          <button
            type="button"
            className="action-button primary"
            onClick={handleDownloadBinary}
            disabled={isLoading}
          >
            {isLoading ? 'Downloading...' : 'Download Binary'}
          </button>
        )}

        {progress && (
          <div className="progress-section">
            <div className="progress-text">
              <strong>{progress.stage}:</strong> {progress.message}
            </div>
            {progress.progress !== undefined && (
              <div className="progress-bar">
                <div
                  className="progress-fill"
                  style={{ width: `${progress.progress}%` }}
                />
              </div>
            )}
          </div>
        )}
      </div>

      <div className="opencode-section">
        <h3>Server Control</h3>
        <div className="server-info">
          {serverStatus?.running && serverStatus.url && (
            <div className="info-row">
              <span className="label">URL:</span>
              <span className="value url">{serverStatus.url}</span>
            </div>
          )}
          {serverStatus?.error && (
            <div className="info-row">
              <span className="label">Error:</span>
              <span className="value error">{serverStatus.error}</span>
            </div>
          )}
        </div>

        <div className="server-controls">
          {!serverStatus?.running ? (
            <button
              type="button"
              className="action-button primary"
              onClick={handleStartServer}
              disabled={isLoading || !binaryInfo?.installed}
            >
              {isLoading ? 'Starting...' : 'Start Server'}
            </button>
          ) : (
            <button
              type="button"
              className="action-button secondary"
              onClick={handleStopServer}
              disabled={isLoading}
            >
              {isLoading ? 'Stopping...' : 'Stop Server'}
            </button>
          )}
        </div>
      </div>
    </div>
  )
}