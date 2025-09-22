// Discord service API for preload
import { ipcRenderer } from 'electron'

export const discordAPI = {
  // Connection management
  connect: (): Promise<void> => ipcRenderer.invoke('discord:connect'),
  disconnect: (): Promise<void> => ipcRenderer.invoke('discord:disconnect'),

  // Status
  getStatus: (): Promise<{
    connected: boolean
    username?: string
    botId?: string
    guilds?: number
  }> => ipcRenderer.invoke('discord:get-status'),

  // Token management
  setToken: (token: string): Promise<{ success: boolean }> =>
    ipcRenderer.invoke('discord:set-token', token),
  hasToken: (): Promise<boolean> => ipcRenderer.invoke('discord:has-token'),
  clearToken: (): Promise<{ success: boolean }> => ipcRenderer.invoke('discord:clear-token'),

  // Debug
  getDebugInfo: (): Promise<{
    connectionState: string
    isConnected: boolean
    hasClient: boolean
    hasToken: boolean
    lastError: string | null
    connectionAttemptTime: number | null
    clientUser: string | null
    guildsCount: number
  }> => ipcRenderer.invoke('discord:get-debug-info')
}
