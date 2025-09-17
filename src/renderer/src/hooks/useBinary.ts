import { useState, useEffect, useCallback } from 'react'

export interface BinaryInfo {
  path: string
  lastChecked: Date
  installed: boolean
}

export interface BinaryProgress {
  stage: 'downloading' | 'installing' | 'complete' | 'error'
  message?: string
  error?: string
}

export interface BinaryState {
  info: BinaryInfo | null
  isInstalling: boolean
  installStatus: string
  error: string | null
}

export function useBinary(): {
  info: BinaryInfo | null
  isInstalling: boolean
  installStatus: string
  error: string | null
  installBinary: () => Promise<void>
  refresh: () => Promise<void>
  statusDisplay: { text: string; color: string; status: 'checking' | 'installed' | 'not-installed' }
} {
  const [state, setState] = useState<BinaryState>({
    info: null,
    isInstalling: false,
    installStatus: '',
    error: null
  })

  // Load binary info
  const loadBinaryInfo = useCallback(async () => {
    try {
      const info = await window.api.binary.getInfo()
      setState((prev) => ({ ...prev, info, error: null }))
    } catch (error) {
      setState((prev) => ({
        ...prev,
        error: error instanceof Error ? error.message : 'Failed to load binary status'
      }))
    }
  }, [])

  // Install binary
  const installBinary = useCallback(async () => {
    setState((prev) => ({
      ...prev,
      isInstalling: true,
      installStatus: 'Starting installation...',
      error: null
    }))

    try {
      await window.api.binary.install()
    } catch (error) {
      setState((prev) => ({
        ...prev,
        isInstalling: false,
        installStatus: `Installation failed: ${error instanceof Error ? error.message : 'Unknown error'}`,
        error: error instanceof Error ? error.message : 'Installation failed'
      }))
    }
  }, [])

  // Listen for installation progress
  useEffect(() => {
    const cleanup = window.api.binary.onStatusUpdate((progress: BinaryProgress) => {
      setState((prev) => ({
        ...prev,
        installStatus: progress.message || ''
      }))

      if (progress.stage === 'complete') {
        setState((prev) => ({ ...prev, isInstalling: false }))
        // Refresh binary info
        loadBinaryInfo()
      } else if (progress.stage === 'error') {
        setState((prev) => ({
          ...prev,
          isInstalling: false,
          installStatus: `Error: ${progress.error}`,
          error: progress.error || 'Installation failed'
        }))
      }
    })

    return cleanup
  }, [loadBinaryInfo])

  // Load info on mount
  useEffect(() => {
    loadBinaryInfo()
  }, [loadBinaryInfo])

  // Helper to get status display
  const getStatusDisplay = useCallback(() => {
    if (!state.info) return { text: 'Checking...', color: '#666', status: 'checking' as const }
    if (state.info.installed)
      return { text: '✅ Installed', color: '#28a745', status: 'installed' as const }
    return { text: '❌ Not Installed', color: '#dc3545', status: 'not-installed' as const }
  }, [state.info])

  return {
    ...state,
    installBinary,
    refresh: loadBinaryInfo,
    statusDisplay: getStatusDisplay()
  }
}
