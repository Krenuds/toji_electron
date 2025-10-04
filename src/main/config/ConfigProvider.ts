import Store from 'electron-store'
import path from 'path'
import type { PermissionConfig, ModelConfig } from '../toji/config'
import { defaultOpencodeConfig } from '../toji/config'

interface AppConfig {
  discord?: {
    token?: string
  }
  projects: {
    recent: string[] // Recently used project paths
    current?: string // Currently active project path
    activeSessions: Record<string, string> // Active session ID per project path
  }
  opencode?: {
    defaults?: {
      permissions?: PermissionConfig
      model?: ModelConfig
    }
    apiKeys?: {
      // Provider ID mapped to API key (e.g., 'anthropic', 'openai', 'zen')
      [providerId: string]: string
    }
  }
}

const DEFAULT_PERMISSION_TEMPLATE: PermissionConfig = {
  edit: 'ask',
  bash: 'ask',
  webfetch: 'ask'
}

const DEFAULT_MODEL_SELECTION: ModelConfig = {
  model: defaultOpencodeConfig.model ?? 'opencode/grok-code',
  ...(defaultOpencodeConfig.small_model ? { small_model: defaultOpencodeConfig.small_model } : {})
}

export class ConfigProvider {
  private store: Store<AppConfig>

  constructor() {
    this.store = new Store<AppConfig>({
      defaults: {
        projects: {
          recent: [],
          activeSessions: {}
        },
        opencode: {
          defaults: {
            permissions: DEFAULT_PERMISSION_TEMPLATE,
            model: DEFAULT_MODEL_SELECTION
          }
        }
      },
      // Enable encryption for sensitive data like Discord token
      encryptionKey: 'toji3-discord-secure'
    })
  }

  /**
   * Get default working directory for OpenCode
   * Used as fallback when no project is selected
   */
  getOpencodeWorkingDirectory(): string {
    // Use current working directory as default
    // This provides a sensible fallback that always exists
    return process.cwd()
  }

  // ==========================================
  // OpenCode Default Permissions Management
  // ==========================================

  getDefaultOpencodePermissions(): PermissionConfig {
    const permissions = this.store.get('opencode.defaults.permissions')
    if (!permissions) {
      this.store.set('opencode.defaults.permissions', DEFAULT_PERMISSION_TEMPLATE)
      return DEFAULT_PERMISSION_TEMPLATE
    }
    return {
      edit: permissions.edit ?? 'ask',
      bash: permissions.bash ?? 'ask',
      webfetch: permissions.webfetch ?? 'ask'
    }
  }

  setDefaultOpencodePermissions(permissions: Partial<PermissionConfig>): PermissionConfig {
    const current = this.getDefaultOpencodePermissions()
    const updated: PermissionConfig = {
      edit: permissions.edit ?? current.edit,
      bash: permissions.bash ?? current.bash,
      webfetch: permissions.webfetch ?? current.webfetch
    }
    this.store.set('opencode.defaults.permissions', updated)
    return updated
  }

  // ==========================================
  // OpenCode Default Model Management
  // ==========================================

  getDefaultOpencodeModel(): ModelConfig {
    const model = this.store.get('opencode.defaults.model')
    if (!model) {
      this.store.set('opencode.defaults.model', DEFAULT_MODEL_SELECTION)
      return DEFAULT_MODEL_SELECTION
    }

    return {
      model: model.model ?? DEFAULT_MODEL_SELECTION.model,
      ...(model.small_model ? { small_model: model.small_model } : {})
    }
  }

  setDefaultOpencodeModel(selection: Partial<ModelConfig>): ModelConfig {
    const current = this.getDefaultOpencodeModel()
    const updated: ModelConfig = {
      model: selection.model ?? current.model
    }

    if (selection.small_model !== undefined) {
      if (selection.small_model) {
        updated.small_model = selection.small_model
      }
    } else if (current.small_model) {
      updated.small_model = current.small_model
    }

    this.store.set('opencode.defaults.model', updated)
    return updated
  }

  /**
   * Normalize project path for consistent storage
   * Handles cross-platform path differences
   */
  private normalizeProjectPath(projectPath: string): string {
    // Normalize path separators and resolve to absolute path
    return path.resolve(projectPath).toLowerCase()
  }

  // ==========================================
  // Discord Token Management
  // ==========================================

  getDiscordToken(): string | undefined {
    return this.store.get('discord.token')
  }

  setDiscordToken(token: string): void {
    this.store.set('discord.token', token)
  }

  hasDiscordToken(): boolean {
    return !!this.store.get('discord.token')
  }

  clearDiscordToken(): void {
    this.store.delete('discord.token')
  }

  // ==========================================
  // OpenCode API Keys Management
  // ==========================================

  /**
   * Get API key for a specific provider
   */
  getOpencodeApiKey(providerId: string): string | undefined {
    const apiKeys = this.store.get('opencode.apiKeys', {})
    const hasKey = !!apiKeys[providerId]
    console.log(
      `[ConfigProvider] getOpencodeApiKey('${providerId}'): ${hasKey ? 'FOUND' : 'NOT FOUND'}`
    )
    if (hasKey) {
      console.log(
        `[ConfigProvider] API key for '${providerId}' length: ${apiKeys[providerId].length}`
      )
    }
    return apiKeys[providerId]
  }

  /**
   * Set API key for a specific provider
   */
  setOpencodeApiKey(providerId: string, apiKey: string): void {
    console.log(
      `[ConfigProvider] setOpencodeApiKey('${providerId}'): Storing key (length: ${apiKey.length})`
    )
    const apiKeys = this.store.get('opencode.apiKeys', {})
    apiKeys[providerId] = apiKey
    this.store.set('opencode.apiKeys', apiKeys)
    console.log(`[ConfigProvider] API key stored successfully for '${providerId}'`)
    console.log(`[ConfigProvider] Total configured providers: ${Object.keys(apiKeys).length}`)
  }

  /**
   * Check if API key exists for a provider
   */
  hasOpencodeApiKey(providerId: string): boolean {
    const apiKeys = this.store.get('opencode.apiKeys', {})
    return !!apiKeys[providerId]
  }

  /**
   * Clear API key for a specific provider
   */
  clearOpencodeApiKey(providerId: string): void {
    const apiKeys = this.store.get('opencode.apiKeys', {})
    delete apiKeys[providerId]
    this.store.set('opencode.apiKeys', apiKeys)
  }

  /**
   * Get all configured provider IDs
   */
  getConfiguredProviders(): string[] {
    const apiKeys = this.store.get('opencode.apiKeys', {})
    const providers = Object.keys(apiKeys)
    console.log(
      `[ConfigProvider] getConfiguredProviders(): Found ${providers.length} providers: [${providers.join(', ')}]`
    )
    return providers
  }

  /**
   * Clear all API keys
   */
  clearAllOpencodeApiKeys(): void {
    this.store.set('opencode.apiKeys', {})
  }

  // ==========================================
  // Current Project Management
  // ==========================================

  /**
   * Get current active project path
   */
  getCurrentProjectPath(): string | undefined {
    return this.store.get('projects.current')
  }

  /**
   * Set current active project path
   */
  setCurrentProjectPath(projectPath: string): void {
    this.store.set('projects.current', projectPath)
  }

  // ==========================================
  // Recent Projects Management
  // ==========================================

  /**
   * Add project to recent list
   * Keeps only the 10 most recent projects
   */
  addRecentProject(projectPath: string): void {
    const recent = this.store.get('projects.recent', [])
    const normalizedPath = this.normalizeProjectPath(projectPath)

    // Remove if already exists (to move to front)
    const filtered = recent.filter((p) => this.normalizeProjectPath(p) !== normalizedPath)

    // Add to front
    const updated = [projectPath, ...filtered]

    // Keep only 10 most recent
    const limited = updated.slice(0, 10)

    this.store.set('projects.recent', limited)
  }

  // ==========================================
  // Session Management
  // ==========================================

  /**
   * Get active session ID for a project
   */
  getProjectActiveSession(projectPath: string): string | undefined {
    const normalizedPath = this.normalizeProjectPath(projectPath)
    const activeSessions = this.store.get('projects.activeSessions', {})
    return activeSessions[normalizedPath]
  }

  /**
   * Set active session ID for a project
   */
  setProjectActiveSession(projectPath: string, sessionId: string): void {
    const normalizedPath = this.normalizeProjectPath(projectPath)
    const activeSessions = this.store.get('projects.activeSessions', {})
    activeSessions[normalizedPath] = sessionId
    this.store.set('projects.activeSessions', activeSessions)
  }
}
