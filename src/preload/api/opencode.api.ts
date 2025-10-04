// OpenCode API key management API
import { ipcRenderer } from 'electron'

export interface ApiKeySyncResult {
  providerId: string
  success: boolean
  error?: string
}

export const opencodeAPI = {
  /**
   * Set API key for a provider (e.g., 'anthropic', 'openai', 'zen')
   * This stores the key encrypted and registers it with OpenCode
   */
  setApiKey: (providerId: string, apiKey: string): Promise<{ success: boolean }> =>
    ipcRenderer.invoke('opencode:set-api-key', providerId, apiKey),

  /**
   * Check if API key exists for a provider
   */
  hasApiKey: (providerId: string): Promise<boolean> =>
    ipcRenderer.invoke('opencode:has-api-key', providerId),

  /**
   * Clear API key for a provider
   */
  clearApiKey: (providerId: string): Promise<{ success: boolean }> =>
    ipcRenderer.invoke('opencode:clear-api-key', providerId),

  /**
   * Get list of all configured provider IDs
   */
  getConfiguredProviders: (): Promise<string[]> =>
    ipcRenderer.invoke('opencode:get-configured-providers'),

  /**
   * Clear all API keys
   */
  clearAllApiKeys: (): Promise<{ success: boolean }> =>
    ipcRenderer.invoke('opencode:clear-all-api-keys'),

  /**
   * Re-sync all stored API keys with OpenCode
   * Useful after server restart
   */
  syncApiKeys: (): Promise<ApiKeySyncResult[]> => ipcRenderer.invoke('opencode:sync-api-keys')
}
