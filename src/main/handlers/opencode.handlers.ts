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
    console.log(`[opencode.handlers] set-api-key: Received request for provider '${providerId}'`)
    if (!config || !toji) {
      console.error('[opencode.handlers] set-api-key: Config or Toji not initialized')
      throw new Error('Config or Toji not initialized')
    }

    // Store in encrypted electron-store
    console.log(`[opencode.handlers] set-api-key: Storing API key for '${providerId}'`)
    config.setOpencodeApiKey(providerId, apiKey)

    // Register with OpenCode server
    try {
      console.log(`[opencode.handlers] set-api-key: Registering API key with OpenCode server`)
      await toji.registerApiKey(providerId, apiKey)
      console.log(
        `[opencode.handlers] set-api-key: ✓ Successfully registered API key for '${providerId}'`
      )
      return { success: true }
    } catch (error) {
      // Rollback on failure
      console.error(
        `[opencode.handlers] set-api-key: ✗ Registration failed, rolling back storage for '${providerId}'`
      )
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
    console.log('[opencode.handlers] get-configured-providers: Fetching provider list')
    if (!config) {
      console.error('[opencode.handlers] get-configured-providers: Config not initialized')
      throw new Error('Config not initialized')
    }
    const providers = config.getConfiguredProviders()
    console.log(
      `[opencode.handlers] get-configured-providers: Returning ${providers.length} providers`
    )
    return providers
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
    console.log('[opencode.handlers] sync-api-keys: Received sync request')
    if (!config || !toji) {
      console.error('[opencode.handlers] sync-api-keys: Config or Toji not initialized')
      throw new Error('Config or Toji not initialized')
    }

    const providers = config.getConfiguredProviders()
    console.log(`[opencode.handlers] sync-api-keys: Syncing ${providers.length} providers`)
    const results: { providerId: string; success: boolean; error?: string }[] = []

    for (const providerId of providers) {
      const apiKey = config.getOpencodeApiKey(providerId)
      if (apiKey) {
        try {
          console.log(`[opencode.handlers] sync-api-keys: Syncing '${providerId}'`)
          await toji.registerApiKey(providerId, apiKey)
          results.push({ providerId, success: true })
          console.log(`[opencode.handlers] sync-api-keys: ✓ '${providerId}' synced`)
        } catch (error) {
          console.error(`[opencode.handlers] sync-api-keys: ✗ '${providerId}' failed:`, error)
          results.push({
            providerId,
            success: false,
            error: error instanceof Error ? error.message : 'Unknown error'
          })
        }
      }
    }

    console.log(
      `[opencode.handlers] sync-api-keys: Complete. ${results.filter((r) => r.success).length}/${results.length} succeeded`
    )
    return results
  })
}
