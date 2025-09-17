import React, { useState } from 'react'
import { useAgent } from '../../hooks/useAgent'
import { Button, Input, StatusIndicator, ErrorMessage } from '../ui'

export interface AgentControlProps {
  className?: string
}

export function AgentControl({ className = '' }: AgentControlProps): React.JSX.Element {
  const { isRunning, currentDirectory, isLoading, error, startAgent, stopAgent, clearError } =
    useAgent()
  const [directoryInput, setDirectoryInput] = useState('')

  const handleStart = (): void => {
    startAgent(directoryInput)
  }

  const handleStop = (): void => {
    stopAgent()
  }

  // Update input when agent starts/stops
  React.useEffect(() => {
    if (isRunning && currentDirectory) {
      setDirectoryInput(currentDirectory)
    } else if (!isRunning) {
      setDirectoryInput('')
    }
  }, [isRunning, currentDirectory])

  return (
    <div className={`agent-control ${className}`}>
      <div className="section-header">
        <h2>Agent Control</h2>
        <StatusIndicator
          status={isRunning ? 'running' : 'stopped'}
          text={isRunning ? 'Agent Running' : 'Agent Stopped'}
        />
      </div>

      <ErrorMessage error={error} onDismiss={clearError} />

      <div className="control-form">
        <Input
          label="Project Directory"
          value={directoryInput}
          onChange={setDirectoryInput}
          placeholder="/path/to/your/project"
          disabled={isRunning}
          required
        />

        <div className="control-actions">
          {isRunning ? (
            <Button variant="danger" onClick={handleStop} loading={isLoading}>
              Stop Agent
            </Button>
          ) : (
            <Button
              variant="success"
              onClick={handleStart}
              disabled={!directoryInput.trim()}
              loading={isLoading}
            >
              Start Agent
            </Button>
          )}
        </div>

        {currentDirectory && (
          <div className="agent-info">
            <p>
              <strong>Working Directory:</strong> {currentDirectory}
            </p>
          </div>
        )}
      </div>

      <div className="usage-guide">
        <h4>Quick Start Guide:</h4>
        <ol>
          <li>Enter your project directory path</li>
          <li>Click &quot;Start Agent&quot; to begin</li>
          <li>Use the chat panel to interact with OpenCode</li>
          <li>Click &quot;Stop Agent&quot; when finished</li>
        </ol>
      </div>
    </div>
  )
}
