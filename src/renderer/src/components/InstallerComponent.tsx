import React, { useState, useEffect } from 'react'

interface BinaryInfo {
  path: string
  lastChecked: Date
  installed: boolean
}

interface BinaryProgress {
  stage: 'downloading' | 'installing' | 'complete' | 'error'
  message?: string
  error?: string
}

interface InstallerComponentProps {
  className?: string
}

export const InstallerComponent: React.FC<InstallerComponentProps> = ({ className = '' }) => {
  const [binaryInfo, setBinaryInfo] = useState<BinaryInfo | null>(null)
  const [isInstalling, setIsInstalling] = useState(false)
  const [installStatus, setInstallStatus] = useState<string>('')

  // Load binary status on mount
  useEffect(() => {
    const loadBinaryStatus = async (): Promise<void> => {
      try {
        const info = await window.api.binary.getInfo()
        setBinaryInfo(info)
      } catch (error) {
        console.error('Failed to load binary status:', error)
      }
    }

    loadBinaryStatus()
  }, [])

  // Listen for installation progress
  useEffect(() => {
    const cleanup = window.api.binary.onStatusUpdate((progress: BinaryProgress) => {
      setInstallStatus(progress.message || '')
      if (progress.stage === 'complete') {
        setIsInstalling(false)
        // Refresh binary info
        window.api.binary.getInfo().then(setBinaryInfo)
      } else if (progress.stage === 'error') {
        setIsInstalling(false)
        setInstallStatus(`Error: ${progress.error}`)
      }
    })

    return cleanup
  }, [])

  const handleInstall = async (): Promise<void> => {
    setIsInstalling(true)
    setInstallStatus('Starting installation...')

    try {
      await window.api.binary.install()
    } catch (error) {
      setIsInstalling(false)
      setInstallStatus(
        `Installation failed: ${error instanceof Error ? error.message : 'Unknown error'}`
      )
    }
  }

  const getStatusDisplay = (): { text: string; color: string } => {
    if (!binaryInfo) return { text: 'Checking...', color: '#666' }
    if (binaryInfo.installed) return { text: '✅ Installed', color: '#28a745' }
    return { text: '❌ Not Installed', color: '#dc3545' }
  }

  const status = getStatusDisplay()

  return (
    <div className={`installer-component ${className}`}>
      <div className="installer-header">
        <h3>OpenCode Binary</h3>
      </div>

      <div className="installer-status">
        <span style={{ color: status.color }}>{status.text}</span>
      </div>

      {!binaryInfo?.installed && (
        <button onClick={handleInstall} disabled={isInstalling} className="install-button">
          {isInstalling ? 'Installing...' : 'Install OpenCode'}
        </button>
      )}

      {installStatus && <div className="install-status">{installStatus}</div>}
    </div>
  )
}
