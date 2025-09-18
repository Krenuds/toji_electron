import { useState, useEffect, useCallback } from 'react'
import type { BinaryInfo, BinaryProgress } from '../../../preload/index.d'

interface BinaryStatusState {
  info: BinaryInfo | null
  loading: boolean
  error: string | null
  installing: boolean
  installProgress: BinaryProgress | null
}

export function useBinaryStatus(): BinaryStatusState & {
  refresh: () => Promise<void>
  install: () => Promise<void>
} {
  const [state, setState] = useState<BinaryStatusState>({
    info: null,
    loading: true,
    error: null,
    installing: false,
    installProgress: null
  })

  const refresh = useCallback(async (): Promise<void> => {
    try {
      setState((prev) => ({ ...prev, loading: true, error: null }))
      const info = await window.api.binary.getInfo()
      setState((prev) => ({ ...prev, info, loading: false }))
    } catch (error) {
      setState((prev) => ({
        ...prev,
        loading: false,
        error: error instanceof Error ? error.message : 'Failed to get binary info'
      }))
    }
  }, [])

  const install = useCallback(async (): Promise<void> => {
    try {
      setState((prev) => ({ ...prev, installing: true, error: null, installProgress: null }))
      await window.api.binary.install()
      // Refresh info after installation
      await refresh()
      setState((prev) => ({ ...prev, installing: false }))
    } catch (error) {
      setState((prev) => ({
        ...prev,
        installing: false,
        error: error instanceof Error ? error.message : 'Installation failed'
      }))
    }
  }, [refresh])

  // Set up progress listener
  useEffect(() => {
    const unsubscribe = window.api.binary.onStatusUpdate((progress: BinaryProgress) => {
      setState((prev) => ({ ...prev, installProgress: progress }))

      // If installation is complete, refresh the binary info
      if (progress.stage === 'complete') {
        refresh()
        setState((prev) => ({ ...prev, installing: false, installProgress: null }))
      } else if (progress.stage === 'error') {
        setState((prev) => ({
          ...prev,
          installing: false,
          error: progress.error || 'Installation failed',
          installProgress: null
        }))
      }
    })

    return unsubscribe
  }, [refresh])

  // Initial load
  useEffect(() => {
    refresh()
  }, [refresh])

  return {
    ...state,
    refresh,
    install
  }
}
