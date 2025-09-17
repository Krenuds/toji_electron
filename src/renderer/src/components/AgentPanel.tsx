import React, { useState, useEffect } from 'react'

interface BinaryInfo {
  path: string
  lastChecked: Date
  installed: boolean
}

interface AgentPanelProps {
  className?: string
}

export const AgentPanel: React.FC<AgentPanelProps> = ({ className = '' }) => {
  const [binaryInfo, setBinaryInfo] = useState<BinaryInfo | null>(null)
  const [isAgentRunning, setIsAgentRunning] = useState(false)
  const [currentDirectory, setCurrentDirectory] = useState<string>('')
  const [directoryInput, setDirectoryInput] = useState<string>('')
  const [isLoading, setIsLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  // Load initial status
  useEffect(() => {
    const loadStatus = async (): Promise<void> => {
      try {
        // Check binary status
        const info = await window.api.opencode.getBinaryInfo()
        setBinaryInfo(info)

        // Check agent status
        const running = await window.api.core.isRunning()
        setIsAgentRunning(running)

        if (running) {
          const dir = await window.api.core.getCurrentDirectory()
          setCurrentDirectory(dir || '')
          setDirectoryInput(dir || '')
        }
      } catch (err) {
        setError(err instanceof Error ? err.message : 'Failed to load status')
      }
    }

    loadStatus()
  }, [])

  const handleDownloadBinary = async (): Promise<void> => {
    setIsLoading(true)
    setError(null)

    try {
      await window.api.opencode.downloadBinary()

      // Refresh binary info
      const info = await window.api.opencode.getBinaryInfo()
      setBinaryInfo(info)
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to download binary')
    } finally {
      setIsLoading(false)
    }
  }

  const handleStartAgent = async (): Promise<void> => {
    if (!directoryInput.trim()) {
      setError('Please enter a directory path')
      return
    }

    setIsLoading(true)
    setError(null)

    try {
      await window.api.core.startOpencode(directoryInput.trim())

      // Update status
      setIsAgentRunning(true)
      setCurrentDirectory(directoryInput.trim())
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to start agent')
    } finally {
      setIsLoading(false)
    }
  }

  const handleStopAgent = async (): Promise<void> => {
    setIsLoading(true)
    setError(null)

    try {
      await window.api.core.stopOpencode()

      // Update status
      setIsAgentRunning(false)
      setCurrentDirectory('')
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to stop agent')
    } finally {
      setIsLoading(false)
    }
  }

  return (
    <div className={`agent-panel ${className}`}>
      <h2>OpenCode Agent</h2>

      {error && (
        <div className="error-message" style={{ color: 'red', marginBottom: '10px' }}>
          {error}
        </div>
      )}

      {/* Binary Status */}
      <div className="binary-status" style={{ marginBottom: '20px' }}>
        <h3>Binary Status</h3>
        {binaryInfo ? (
          <div>
            <p>Status: {binaryInfo.installed ? '✅ Installed' : '❌ Not Installed'}</p>
            <p>Path: {binaryInfo.path}</p>
            {!binaryInfo.installed && (
              <button
                onClick={handleDownloadBinary}
                disabled={isLoading}
                style={{ marginTop: '5px' }}
              >
                {isLoading ? 'Downloading...' : 'Download Binary'}
              </button>
            )}
          </div>
        ) : (
          <p>Loading...</p>
        )}
      </div>

      {/* Agent Control */}
      <div className="agent-control" style={{ marginBottom: '20px' }}>
        <h3>Agent Control</h3>

        <div style={{ marginBottom: '10px' }}>
          <label>
            Directory:
            <input
              type="text"
              value={directoryInput}
              onChange={(e) => setDirectoryInput(e.target.value)}
              placeholder="/path/to/your/project"
              disabled={isAgentRunning}
              style={{
                marginLeft: '10px',
                width: '300px',
                padding: '5px'
              }}
            />
          </label>
        </div>

        <div style={{ marginBottom: '10px' }}>
          {isAgentRunning ? (
            <button
              onClick={handleStopAgent}
              disabled={isLoading}
              style={{
                backgroundColor: '#ff4444',
                color: 'white',
                padding: '10px 20px',
                border: 'none',
                borderRadius: '4px',
                cursor: 'pointer'
              }}
            >
              {isLoading ? 'Stopping...' : 'Stop Agent'}
            </button>
          ) : (
            <button
              onClick={handleStartAgent}
              disabled={isLoading || !binaryInfo?.installed || !directoryInput.trim()}
              style={{
                backgroundColor: '#44aa44',
                color: 'white',
                padding: '10px 20px',
                border: 'none',
                borderRadius: '4px',
                cursor: 'pointer'
              }}
            >
              {isLoading ? 'Starting...' : 'Start Agent'}
            </button>
          )}
        </div>

        {/* Current Status */}
        <div className="agent-status">
          <p>
            <strong>Agent Status:</strong> {isAgentRunning ? '🟢 Running' : '⚫ Stopped'}
          </p>
          {currentDirectory && (
            <p>
              <strong>Working Directory:</strong> {currentDirectory}
            </p>
          )}
        </div>
      </div>

      {/* Usage Instructions */}
      <div className="usage-info" style={{ fontSize: '14px', color: '#666' }}>
        <h4>Quick Start:</h4>
        <ol>
          <li>Ensure binary is installed</li>
          <li>Enter your project directory path</li>
          <li>Click &quot;Start Agent&quot;</li>
          <li>Use the chat panel to interact with OpenCode</li>
        </ol>
      </div>
    </div>
  )
}
