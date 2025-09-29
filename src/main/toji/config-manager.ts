// Manages OpenCode runtime configuration (NOT app state)
// This is separate from ConfigProvider which handles app-level persistent state
import type { OpencodeClient } from '@opencode-ai/sdk'
import type { OpencodeConfig, PermissionConfig, PermissionType, PermissionLevel } from './config'
import { createFileDebugLogger } from '../utils/logger'

const log = createFileDebugLogger('toji:config-manager')

export class ConfigManager {
  constructor(
    private getClient: () => OpencodeClient | undefined,
    private getCurrentDirectory: () => string | undefined,
    private serverRestart: (config: OpencodeConfig, directory: string) => Promise<void>,
    private reconnectClient: (directory: string) => Promise<void>
  ) {}

  // Get current project's configuration from OpenCode
  async getProjectConfig(): Promise<any> {
    const client = this.getClient()
    if (!client) {
      throw new Error('Client not connected to server')
    }

    try {
      const config = await client.config.get()
      log('Retrieved project config: %o', config)
      return config
    } catch (error) {
      log('ERROR: Failed to get project config: %o', error)
      throw error
    }
  }

  // Update project configuration and restart server
  async updateProjectConfig(config: OpencodeConfig): Promise<void> {
    const currentDir = this.getCurrentDirectory()
    if (!currentDir) {
      throw new Error('No current project directory')
    }

    log('Updating project config for: %s', currentDir)
    log('New config: %o', config)

    try {
      // Restart server with new config
      await this.serverRestart(config, currentDir)
      log('Server restarted with new config')

      // Reconnect client
      await this.reconnectClient(currentDir)
      log('Client reconnected successfully')
    } catch (error) {
      log('ERROR: Failed to update project config: %o', error)
      throw error
    }
  }

  // Get current permissions from project configuration
  async getPermissions(): Promise<PermissionConfig> {
    const config = await this.getProjectConfig()
    log('Retrieved permissions from config: %o', config.permission)

    // Return permission object with defaults if not set
    return {
      edit: config.permission?.edit || 'allow',
      bash: config.permission?.bash || 'allow',
      webfetch: config.permission?.webfetch || 'allow'
    }
  }

  // Update permissions by merging with existing configuration
  async updatePermissions(permissions: Partial<PermissionConfig>): Promise<void> {
    log('Updating permissions: %o', permissions)

    try {
      // Get current full config
      const currentConfig = await this.getProjectConfig()

      // Merge permissions with existing config
      const updatedConfig: OpencodeConfig = {
        ...currentConfig,
        permission: {
          ...currentConfig.permission,
          ...permissions
        }
      }

      // Update the full config (will restart server)
      await this.updateProjectConfig(updatedConfig)
      log('Permissions updated successfully')
    } catch (error) {
      log('ERROR: Failed to update permissions: %o', error)
      throw error
    }
  }

  // Set a single permission (convenience method)
  async setPermission(type: PermissionType, level: PermissionLevel): Promise<void> {
    log('Setting permission: %s = %s', type, level)

    // For bash, we use simple string form (not complex object)
    const permissions: Partial<PermissionConfig> = {
      [type]: level
    }

    await this.updatePermissions(permissions)
  }
}