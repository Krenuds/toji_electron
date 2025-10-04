// Manages OpenCode runtime configuration (NOT app state)
// This is separate from ConfigProvider which handles app-level persistent state
import type { OpencodeClient } from '@opencode-ai/sdk'
import type {
  OpencodeConfig,
  PermissionConfig,
  PermissionType,
  PermissionLevel,
  ModelConfig
} from './config'
import { DEFAULT_AGENTS_TEMPLATE } from './agents-template'
import { createFileDebugLogger } from '../utils/logger'
import { writeFile, readFile } from 'fs/promises'
import { join } from 'path'
import { existsSync } from 'fs'

const log = createFileDebugLogger('toji:config-manager')

export class ConfigManager {
  constructor(
    private getClient: () => OpencodeClient | undefined,
    private getCurrentDirectory: () => string | undefined,
    private serverRestart: (config: OpencodeConfig, directory: string) => Promise<void>,
    private reconnectClient: (directory: string) => Promise<void>
  ) {}

  // Get current project's configuration from OpenCode
  async getProjectConfig(): Promise<OpencodeConfig> {
    const client = this.getClient()
    if (!client) {
      throw new Error('Client not connected to server')
    }

    try {
      const response = await client.config.get()
      // SDK returns response wrapper, extract data
      const config = 'data' in response ? response.data : response
      log('Retrieved project config: %o', config)
      return config as OpencodeConfig
    } catch (error) {
      log('ERROR: Failed to get project config: %o', error)
      throw error
    }
  }

  // Ensure project has opencode.json file for persistence
  private async ensureConfigFile(directory: string): Promise<void> {
    const configPath = join(directory, 'opencode.json')
    if (!existsSync(configPath)) {
      log('No opencode.json found, creating default config file')

      // Get current runtime config to preserve it
      try {
        const currentConfig = await this.getProjectConfig()
        await writeFile(configPath, JSON.stringify(currentConfig, null, 2), 'utf-8')
        log('Created opencode.json with current runtime config')
      } catch (error) {
        log('WARNING: Could not get current config, creating minimal file: %o', error)
        await writeFile(configPath, JSON.stringify({}, null, 2), 'utf-8')
        log('Created minimal opencode.json file')
      }
    }

    // Also ensure AGENTS.md exists whenever we touch config
    await this.ensureAgentsFile(directory)
  }

  /**
   * Create AGENTS.md file with Toji default prompt if it doesn't exist
   */
  private async ensureAgentsFile(directory: string): Promise<void> {
    const agentsPath = join(directory, 'AGENTS.md')

    // Check if AGENTS.md already exists
    if (existsSync(agentsPath)) {
      log('AGENTS.md already exists, skipping creation')
      return
    }

    try {
      // Write AGENTS.md to project directory using centralized template
      await writeFile(agentsPath, DEFAULT_AGENTS_TEMPLATE, 'utf-8')
      log('Created AGENTS.md at: %s', agentsPath)
    } catch (error) {
      log('WARNING: Failed to create AGENTS.md: %o', error)
      // Don't throw - AGENTS.md creation is optional
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
      // Ensure the project has an opencode.json file
      await this.ensureConfigFile(currentDir)

      // CRITICAL: Persist configuration to opencode.json file for app restart persistence
      await this.persistConfigToFile(currentDir, config)
      log('Configuration persisted to opencode.json')

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

  // Persist configuration to opencode.json file for permanent storage
  private async persistConfigToFile(directory: string, config: OpencodeConfig): Promise<void> {
    const configPath = join(directory, 'opencode.json')
    log('========== PERSIST CONFIG TO FILE ==========')
    log('Persisting config to file: %s', configPath)
    log('Config to persist: %o', config)

    try {
      // Read existing config if it exists
      let existingConfig: Partial<OpencodeConfig> = {}
      if (existsSync(configPath)) {
        try {
          const existingContent = await readFile(configPath, 'utf-8')
          existingConfig = JSON.parse(existingContent)
          log('Loaded existing config from file: %o', existingConfig)
        } catch (error) {
          log('WARNING: Could not parse existing config file, creating new: %o', error)
        }
      } else {
        log('No existing opencode.json file found, will create new')
      }

      // Merge with existing configuration to preserve other settings
      const mergedConfig = {
        ...existingConfig,
        ...config
      }

      log('Merged config to write: %o', mergedConfig)

      // Write updated configuration to file
      await writeFile(configPath, JSON.stringify(mergedConfig, null, 2), 'utf-8')
      log('Configuration successfully written to: %s', configPath)
      log('File content: %s', JSON.stringify(mergedConfig, null, 2))
    } catch (error) {
      log('ERROR: Failed to persist config to file: %o', error)
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

  // Get current model selection from project configuration
  async getModelConfig(): Promise<ModelConfig> {
    log('Getting model config from project configuration')
    try {
      const config = await this.getProjectConfig()
      const modelConfig = {
        model: config.model,
        ...(config.small_model ? { small_model: config.small_model } : {})
      }
      log('Retrieved model config: %o', modelConfig)
      return modelConfig
    } catch (error) {
      log('ERROR: Failed to get model config: %o', error)
      throw error
    }
  }

  // Update model selection and restart server
  async updateModelConfig(selection: Partial<ModelConfig>): Promise<void> {
    log('Updating model selection: %o', selection)

    try {
      const currentConfig = await this.getProjectConfig()
      const updatedConfig: OpencodeConfig = {
        ...currentConfig,
        ...(selection.model ? { model: selection.model } : {})
      }

      if (selection.small_model !== undefined) {
        if (selection.small_model) {
          updatedConfig.small_model = selection.small_model
        } else {
          delete updatedConfig.small_model
        }
      }

      await this.updateProjectConfig(updatedConfig)
      log('Model selection updated successfully')
    } catch (error) {
      log('ERROR: Failed to update model selection: %o', error)
      throw error
    }
  }
}
