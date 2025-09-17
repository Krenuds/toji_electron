import React from 'react'
import { useBinary } from '../../hooks/useBinary'
import { Button, StatusIndicator, ErrorMessage } from '../ui'

export interface BinaryInstallerProps {
  className?: string
}

export function BinaryInstaller({ className = '' }: BinaryInstallerProps): React.JSX.Element {
  const { info, isInstalling, installStatus, error, installBinary, statusDisplay } = useBinary()

  return (
    <div className={`binary-installer ${className}`}>
      <div className="section-header">
        <h3>OpenCode Binary</h3>
        <StatusIndicator
          status={
            statusDisplay.status === 'installed'
              ? 'success'
              : statusDisplay.status === 'checking'
                ? 'loading'
                : 'error'
          }
          text={statusDisplay.text}
        />
      </div>

      <ErrorMessage error={error} />

      {!info?.installed && (
        <div className="installer-actions">
          <Button
            variant="primary"
            onClick={installBinary}
            loading={isInstalling}
            disabled={isInstalling}
          >
            Install OpenCode Binary
          </Button>
        </div>
      )}

      {installStatus && (
        <div className="install-status">
          <p>{installStatus}</p>
        </div>
      )}

      {info?.installed && (
        <div className="binary-info">
          <p>
            <strong>Installation Path:</strong>
            <br />
            <code>{info.path}</code>
          </p>
          <p>
            <strong>Last Checked:</strong> {info.lastChecked.toLocaleString()}
          </p>
        </div>
      )}
    </div>
  )
}
