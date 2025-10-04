// OpenCode API key management IPC handlers
import { ipcMain } from 'electron'
import type { Toji } from '../toji'
import type { ConfigProvider } from '../config/ConfigProvider'

export function registerOpencodeHandlers(toji: Toji | null, config: ConfigProvider | null): void {
  if (!toji || !config) {
    console.error('Toji or config not initialized')
    return
  }

  // Set API key for a provider and register with OpenCode
  ipcMain.handle('opencode:set-api-key', async (_, providerId: string, apiKey: string) => {
    if (!config || !toji) {
      throw new Error('Config or Toji not initialized')
    }

    // Store in encrypted electron-store
    config.setOpencodeApiKey(providerId, apiKey)

    // Register with OpenCode server
    try {
      await toji.registerApiKey(providerId, apiKey)
      return { success: true }
    } catch (error) {
      // Rollback on failure
      config.clearOpencodeApiKey(providerId)
      throw error
    }
  })

  // Get API key for a provider (returns only existence check for security)
  ipcMain.handle('opencode:has-api-key', async (_, providerId: string) => {
    if (!config) {
      throw new Error('Config not initialized')
    }
    return config.hasOpencodeApiKey(providerId)
  })

  // Clear API key for a provider
  ipcMain.handle('opencode:clear-api-key', async (_, providerId: string) => {
    if (!config) {
      throw new Error('Config not initialized')
    }
    config.clearOpencodeApiKey(providerId)
    return { success: true }
  })

  // Get all configured provider IDs
  ipcMain.handle('opencode:get-configured-providers', async () => {
    if (!config) {
      throw new Error('Config not initialized')
    }
    return config.getConfiguredProviders()
  })

  // Clear all API keys
  ipcMain.handle('opencode:clear-all-api-keys', async () => {
    if (!config) {
      throw new Error('Config not initialized')
    }
    config.clearAllOpencodeApiKeys()
    return { success: true }
  })

  // Re-register all stored API keys with OpenCode (useful after server restart)
  ipcMain.handle('opencode:sync-api-keys', async () => {
    if (!config || !toji) {
      throw new Error('Config or Toji not initialized')
    }

    const providers = config.getConfiguredProviders()
    const results: { providerId: string; success: boolean; error?: string }[] = []

    for (const providerId of providers) {
      const apiKey = config.getOpencodeApiKey(providerId)
      if (apiKey) {
        try {
          await toji.registerApiKey(providerId, apiKey)
          results.push({ providerId, success: true })
        } catch (error) {
          results.push({
            providerId,
            success: false,
            error: error instanceof Error ? error.message : 'Unknown error'
          })
        }
      }
    }

    return results
  })
}
