// Discord service IPC handlers
import { ipcMain } from 'electron'
import type { DiscordService } from '../services/discord-service'
import type { ConfigProvider } from '../config/ConfigProvider'

export function registerDiscordHandlers(
  discordService: DiscordService | null,
  config: ConfigProvider | null
): void {
  if (!discordService || !config) {
    console.error('Discord service or config not initialized')
    return
  }

  // Connect Discord bot
  ipcMain.handle('discord:connect', async () => {
    if (!discordService) {
      throw new Error('Discord service not initialized')
    }
    return await discordService.connect()
  })

  // Disconnect Discord bot
  ipcMain.handle('discord:disconnect', async () => {
    if (!discordService) {
      throw new Error('Discord service not initialized')
    }
    return await discordService.disconnect()
  })

  // Get Discord status
  ipcMain.handle('discord:get-status', async () => {
    if (!discordService) {
      throw new Error('Discord service not initialized')
    }
    return discordService.getStatus()
  })

  // Set Discord token
  ipcMain.handle('discord:set-token', async (_, token: string) => {
    if (!config) {
      throw new Error('Config not initialized')
    }
    config.setDiscordToken(token)
    return { success: true }
  })

  // Check if token exists
  ipcMain.handle('discord:has-token', async () => {
    if (!config) {
      throw new Error('Config not initialized')
    }
    return config.hasDiscordToken()
  })

  // Clear Discord token
  ipcMain.handle('discord:clear-token', async () => {
    if (!config) {
      throw new Error('Config not initialized')
    }
    config.clearDiscordToken()
    return { success: true }
  })

  // Get debug info
  ipcMain.handle('discord:get-debug-info', async () => {
    if (!discordService) {
      throw new Error('Discord service not initialized')
    }
    return discordService.getDebugInfo()
  })
}
