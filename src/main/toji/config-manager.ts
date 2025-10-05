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
import { createLogger } from '../utils/logger'
import { deepMerge, mergeMcpConfig } from '../utils/deep-merge'
import { writeFile, readFile } from 'fs/promises'
import { join } from 'path'
import { existsSync } from 'fs'

const logger = createLogger('toji:config-manager')

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
      logger.debug('Retrieved project config: %o', config)
      return config as OpencodeConfig
    } catch (error) {
      logger.debug('ERROR: Failed to get project config: %o', error)
      throw error
    }
  }

  // Ensure project has opencode.json file for persistence
  private async ensureConfigFile(directory: string): Promise<void> {
    const configPath = join(directory, 'opencode.json')
    if (!existsSync(configPath)) {
      logger.debug('No opencode.json found, creating default config file')

      // Get current runtime config to preserve it
      try {
        const currentConfig = await this.getProjectConfig()
        await writeFile(configPath, JSON.stringify(currentConfig, null, 2), 'utf-8')
        logger.debug('Created opencode.json with current runtime config')
      } catch (error) {
        logger.debug('WARNING: Could not get current config, creating minimal file: %o', error)
        await writeFile(configPath, JSON.stringify({}, null, 2), 'utf-8')
        logger.debug('Created minimal opencode.json file')
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
      logger.debug('AGENTS.md already exists, skipping creation')
      return
    }

    try {
      // Write AGENTS.md to project directory using centralized template
      await writeFile(agentsPath, DEFAULT_AGENTS_TEMPLATE, 'utf-8')
      logger.debug('Created AGENTS.md at: %s', agentsPath)
    } catch (error) {
      logger.debug('WARNING: Failed to create AGENTS.md: %o', error)
      // Don't throw - AGENTS.md creation is optional
    }
  }

  // Update project configuration and restart server
  async updateProjectConfig(config: OpencodeConfig): Promise<void> {
    const currentDir = this.getCurrentDirectory()
    if (!currentDir) {
      throw new Error('No current project directory')
    }

    logger.debug('Updating project config for: %s', currentDir)
    logger.debug('New config: %o', config)

    try {
      // Ensure the project has an opencode.json file
      await this.ensureConfigFile(currentDir)

      // CRITICAL: Persist configuration to opencode.json file for app restart persistence
      await this.persistConfigToFile(currentDir, config)
      logger.debug('Configuration persisted to opencode.json')

      // Restart server with new config
      await this.serverRestart(config, currentDir)
      logger.debug('Server restarted with new config')

      // Reconnect client
      await this.reconnectClient(currentDir)
      logger.debug('Client reconnected successfully')
    } catch (error) {
      logger.debug('ERROR: Failed to update project config: %o', error)
      throw error
    }
  }

  // Persist configuration to opencode.json file for permanent storage
  private async persistConfigToFile(directory: string, config: OpencodeConfig): Promise<void> {
    const configPath = join(directory, 'opencode.json')
    logger.debug('========== PERSIST CONFIG TO FILE ==========')
    logger.debug('Persisting config to file: %s', configPath)
    logger.debug('Config to persist: %o', config)

    try {
      // Read existing config if it exists
      let existingConfig: Partial<OpencodeConfig> = {}
      if (existsSync(configPath)) {
        try {
          const existingContent = await readFile(configPath, 'utf-8')
          existingConfig = JSON.parse(existingContent)
          logger.debug('Loaded existing config from file: %o', existingConfig)
        } catch (error) {
          logger.debug('WARNING: Could not parse existing config file, creating new: %o', error)
        }
      } else {
        logger.debug('No existing opencode.json file found, will create new')
      }

      // Deep merge with existing configuration to preserve nested user settings
      // This is critical for preserving user's MCP servers, nested permissions, etc.
      const mergedConfig = deepMerge(existingConfig, config)

      logger.debug('Merged config to write: %o', mergedConfig)

      // Write updated configuration to file
      await writeFile(configPath, JSON.stringify(mergedConfig, null, 2), 'utf-8')
      logger.debug('Configuration successfully written to: %s', configPath)
      logger.debug('File content: %s', JSON.stringify(mergedConfig, null, 2))
    } catch (error) {
      logger.debug('ERROR: Failed to persist config to file: %o', error)
      throw error
    }
  }

  // Get current permissions from project configuration
  async getPermissions(): Promise<PermissionConfig> {
    const config = await this.getProjectConfig()
    logger.debug('Retrieved permissions from config: %o', config.permission)

    // Return permission object with defaults if not set
    return {
      edit: config.permission?.edit || 'allow',
      bash: config.permission?.bash || 'allow',
      webfetch: config.permission?.webfetch || 'allow'
    }
  }

  // Update permissions by merging with existing configuration
  async updatePermissions(permissions: Partial<PermissionConfig>): Promise<void> {
    logger.debug('Updating permissions: %o', permissions)

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
      logger.debug('Permissions updated successfully')
    } catch (error) {
      logger.debug('ERROR: Failed to update permissions: %o', error)
      throw error
    }
  }

  // Set a single permission (convenience method)
  async setPermission(type: PermissionType, level: PermissionLevel): Promise<void> {
    logger.debug('Setting permission: %s = %s', type, level)

    // For bash, we use simple string form (not complex object)
    const permissions: Partial<PermissionConfig> = {
      [type]: level
    }

    await this.updatePermissions(permissions)
  }

  // Get current model selection from project configuration
  async getModelConfig(): Promise<ModelConfig> {
    logger.debug('Getting model config from project configuration')
    try {
      const config = await this.getProjectConfig()
      const modelConfig = {
        model: config.model,
        ...(config.small_model ? { small_model: config.small_model } : {})
      }
      logger.debug('Retrieved model config: %o', modelConfig)
      return modelConfig
    } catch (error) {
      logger.debug('ERROR: Failed to get model config: %o', error)
      throw error
    }
  }

  // Update model selection and restart server
  async updateModelConfig(selection: Partial<ModelConfig>): Promise<void> {
    logger.debug('Updating model selection: %o', selection)

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
      logger.debug('Model selection updated successfully')
    } catch (error) {
      logger.debug('ERROR: Failed to update model selection: %o', error)
      throw error
    }
  }

  /**
   * Register MCP server in project's opencode.json
   * This is the ONLY place that writes MCP configuration to opencode.json
   * Called by Toji after MCP server is created
   */
  async registerMcpServer(directory: string, port: number): Promise<void> {
    const configPath = join(directory, 'opencode.json')
    logger.debug('Registering MCP server for %s on port %d', directory, port)

    try {
      // Read existing config
      let existingConfig: Record<string, unknown> = {}
      if (existsSync(configPath)) {
        try {
          const existingContent = await readFile(configPath, 'utf-8')
          existingConfig = JSON.parse(existingContent)
          logger.debug('Loaded existing config for MCP merge')
        } catch (error) {
          logger.debug('Warning: Could not parse existing config: %o', error)
        }
      }

      // Merge Toji's MCP server config
      const tojiMcpConfig = {
        type: 'remote',
        url: `http://localhost:${port}/mcp`,
        enabled: true
      }

      const mergedConfig = {
        $schema: 'https://opencode.ai/config.json',
        ...mergeMcpConfig(existingConfig, 'toji', tojiMcpConfig)
      }

      // Write merged config
      await writeFile(configPath, JSON.stringify(mergedConfig, null, 2), 'utf-8')
      logger.debug('Successfully registered MCP server in opencode.json')
    } catch (error) {
      logger.debug('ERROR: Failed to register MCP server: %o', error)
      throw error
    }
  }
}
