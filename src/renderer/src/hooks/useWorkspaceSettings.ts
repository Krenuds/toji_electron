import { useState, useCallback } from 'react'
import type { WorkspaceSettings } from '../../../main/api'

interface UseWorkspaceSettingsReturn {
  settings: WorkspaceSettings | null
  isLoading: boolean
  error: string | null
  updateSettings: (settings: Partial<WorkspaceSettings>) => Promise<void>
  refreshSettings: () => Promise<void>
}

/**
 * Hook for managing workspace-specific settings
 * Currently a stub implementation for future development
 * @param workspacePath - The workspace path to get/set settings for
 * @returns Object with settings data and methods
 */
export function useWorkspaceSettings(workspacePath: string): UseWorkspaceSettingsReturn {
  const [settings, setSettings] = useState<WorkspaceSettings | null>(null)
  const [isLoading, setIsLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const refreshSettings = useCallback(async () => {
    setIsLoading(true)
    setError(null)
    try {
      // TODO: In the future, this will call the actual API
      // const workspaceSettings = await window.api.core.getWorkspaceSettings(workspacePath)
      // setSettings(workspaceSettings)

      // For now, just log and return empty settings
      console.log(`[useWorkspaceSettings] Would fetch settings for: ${workspacePath}`)
      setSettings({
        opencodeConfig: {
          theme: 'default'
        },
        ui: {
          sidebarWidth: 300,
          sidebarCollapsed: false
        },
        session: {
          autoCreate: false,
          preserveOnRestart: true
        }
      })
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load workspace settings')
      console.error('[useWorkspaceSettings] Error:', err)
    } finally {
      setIsLoading(false)
    }
  }, [workspacePath])

  const updateSettings = useCallback(
    async (newSettings: Partial<WorkspaceSettings>) => {
      setError(null)
      try {
        // TODO: In the future, this will call the actual API
        // await window.api.core.setWorkspaceSettings(workspacePath, { ...settings, ...newSettings })

        // For now, just log the settings that would be saved
        console.log('[useWorkspaceSettings] Would update settings for:', workspacePath)
        console.log('[useWorkspaceSettings] New settings:', newSettings)

        // Update local state to simulate the change
        setSettings((prev) => ({ ...prev, ...newSettings }) as WorkspaceSettings)
      } catch (err) {
        setError(err instanceof Error ? err.message : 'Failed to update workspace settings')
        console.error('[useWorkspaceSettings] Error updating:', err)
      }
    },
    [workspacePath]
  )

  return {
    settings,
    isLoading,
    error,
    updateSettings,
    refreshSettings
  }
}
