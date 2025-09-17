import React, { useState, useEffect } from 'react'

// Types (duplicated here to avoid import issues in renderer)
interface BinaryInfo {
  path: string
  lastChecked: Date
  installed: boolean
}

interface ServerStatus {
  running: boolean
  url?: string
  error?: string
  healthy?: boolean
  port?: number
  pid?: number
  lastHealthCheck?: Date
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
        // Use new Core API to get service status
        const coreStatus = await window.api.core.getStatus()
        const openCodeServiceStatus = coreStatus.services.opencode

        // Use backward compatibility for binary info
        const info = await window.api.opencode.getBinaryInfo()
        setBinaryInfo(info)

        // Convert Core service status to our ServerStatus format
        const serverStatus: ServerStatus = {
          running: openCodeServiceStatus.running,
          healthy: openCodeServiceStatus.healthy,
          error: openCodeServiceStatus.error,
          lastHealthCheck: openCodeServiceStatus.lastCheck
        }
        setServerStatus(serverStatus)
      } catch (err) {
        setError(err instanceof Error ? err.message : 'Failed to load OpenCode data')
      }
    }

    loadData()
  }, [])

  // Set up event listeners
  useEffect(() => {
    // Listen to Core service status changes
    const unsubscribeService = window.api.core.onServiceStatusChange((data) => {
      if (data.service === 'opencode') {
        // Convert Core service status to our ServerStatus format
        const serverStatus: ServerStatus = {
          running: data.status.running,
          healthy: data.status.healthy,
          error: data.status.error,
          lastHealthCheck: data.status.lastCheck
        }
        setServerStatus(serverStatus)
      }
    })

    const unsubscribeProgress = window.api.opencode.onBinaryUpdate((progressData) => {
      setProgress(progressData)
      if (progressData.stage === 'complete') {
        // Refresh binary info after successful download
        window.api.opencode.getBinaryInfo().then(setBinaryInfo)
      }
    })

    return () => {
      unsubscribeService()
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
      // Use Core API to start the OpenCode service
      await window.api.core.startService('opencode')
      // Status will be updated via event listener
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to start server')
    } finally {
      setIsLoading(false)
    }
  }

  const handleRefreshStatus = async (): Promise<void> => {
    if (isLoading) return

    setIsLoading(true)
    setError(null)

    try {
      // Use Core API to get current service status
      const serviceStatus = await window.api.core.getServiceStatus('opencode')
      const serverStatus: ServerStatus = {
        running: serviceStatus.running,
        healthy: serviceStatus.healthy,
        error: serviceStatus.error,
        lastHealthCheck: serviceStatus.lastCheck
      }
      setServerStatus(serverStatus)
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to refresh server status')
    } finally {
      setIsLoading(false)
    }
  }

  const handleStopServer = async (): Promise<void> => {
    if (isLoading) return

    setIsLoading(true)

    try {
      // Use Core API to stop the OpenCode service
      await window.api.core.stopService('opencode')
      // Status will be updated via event listener
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
              serverStatus?.running
                ? serverStatus.healthy
                  ? 'running'
                  : 'unhealthy'
                : 'stopped'
            }`}
          />
          <span className="status-text">
            {serverStatus?.running
              ? serverStatus.healthy
                ? 'Running (Healthy)'
                : 'Running (Unhealthy)'
              : 'Stopped'}
          </span>
        </div>
      </div>

      {error && (
        <div className="error-message">
          <strong>Error:</strong> {error}
          <button type="button" className="error-dismiss" onClick={() => setError(null)}>
            ×
          </button>
        </div>
      )}

      <div className="opencode-content">
        <div className="opencode-section card">
        <h3 className="card-title">Binary Status</h3>
        <div className="binary-info info-grid">
          <div className="info-row">
            <span className="info-label">Installed:</span>
            <span className={`info-value ${binaryInfo?.installed ? 'success' : 'error'}`}>
              {binaryInfo?.installed ? 'Yes' : 'No'}
            </span>
          </div>
          {binaryInfo?.installed && (
            <>
              <div className="info-row">
                <span className="info-label">Path:</span>
                <span className="info-value code">{binaryInfo.path}</span>
              </div>
            </>
          )}
        </div>

        {!binaryInfo?.installed && (
          <button
            type="button"
            className="btn btn-primary"
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
                <div className="progress-fill" style={{ width: `${progress.progress}%` }} />
              </div>
            )}
          </div>
        )}
      </div>

      <div className="opencode-section card">
        <div className="card-header">
          <h3 className="card-title">Server Control</h3>
          <button
            type="button"
            className="btn btn-small btn-secondary"
            onClick={handleRefreshStatus}
            disabled={isLoading}
            title="Refresh server status"
          >
            🔄
          </button>
        </div>
        <div className="server-info info-grid">
          {serverStatus?.running && serverStatus.url && (
            <div className="info-row">
              <span className="info-label">URL:</span>
              <span className="info-value code">{serverStatus.url}</span>
            </div>
          )}
          {serverStatus?.port && (
            <div className="info-row">
              <span className="info-label">Port:</span>
              <span className="info-value">{serverStatus.port}</span>
            </div>
          )}
          {serverStatus?.running && (
            <div className="info-row">
              <span className="info-label">Health Status:</span>
              <span className={`info-value ${serverStatus.healthy ? 'success' : 'warning'}`}>
                {serverStatus.healthy ? 'Healthy' : 'Unhealthy'}
              </span>
            </div>
          )}
          {serverStatus?.lastHealthCheck && (
            <div className="info-row">
              <span className="info-label">Last Health Check:</span>
              <span className="info-value">
                {new Date(serverStatus.lastHealthCheck).toLocaleTimeString()}
              </span>
            </div>
          )}
          {serverStatus?.error && (
            <div className="info-row">
              <span className="info-label">Error:</span>
              <span className="info-value error">{serverStatus.error}</span>
            </div>
          )}
        </div>

        <div className="server-controls">
          {!serverStatus?.running ? (
            <button
              type="button"
              className="btn btn-primary"
              onClick={handleStartServer}
              disabled={isLoading || !binaryInfo?.installed}
            >
              {isLoading ? 'Starting...' : 'Start Server'}
            </button>
          ) : (
            <button
              type="button"
              className="btn btn-secondary"
              onClick={handleStopServer}
              disabled={isLoading}
            >
              {isLoading ? 'Stopping...' : 'Stop Server'}
            </button>
          )}
        </div>
      </div>
      </div>
    </div>
  )
}
