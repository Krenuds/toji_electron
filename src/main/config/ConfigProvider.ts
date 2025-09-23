import Store from 'electron-store'
import path from 'path'

import type { WorkspaceSettings } from '../toji/types'
import type { Config } from '@opencode-ai/sdk'

interface AppConfig {
  opencode: {
    workingDirectory: string
    autoStart: boolean
  }
  workspaces: {
    recent: string[]
    settings?: Record<string, WorkspaceSettings> // Map of path -> settings
  }
  projects: {
    recent: string[] // Recently used project paths
    configs: Record<string, Partial<Config>> // Saved OpenCode configs per project
    states: Record<
      string,
      {
        // Project runtime states
        isOpen: boolean
        port?: number
        lastOpened?: string
      }
    >
    current?: string // Currently active project
  }
  discord?: {
    token?: string
  }
}

export class ConfigProvider {
  private store: Store<AppConfig>

  constructor() {
    this.store = new Store<AppConfig>({
      defaults: {
        opencode: {
          // Use the current project directory as default
          workingDirectory: 'C:\\Users\\donth\\toji3',
          autoStart: true
        },
        workspaces: {
          recent: []
        },
        projects: {
          recent: [],
          configs: {},
          states: {}
        }
      },
      // Enable encryption for sensitive data like Discord token
      encryptionKey: 'toji3-discord-secure'
    })
  }

  getOpencodeWorkingDirectory(): string {
    // Always use the project directory as default for now
    // TODO: Allow user to change this via settings UI
    return 'C:\\Users\\donth\\toji3'
  }

  setOpencodeWorkingDirectory(path: string): void {
    this.store.set('opencode.workingDirectory', path)
  }

  // Discord token management
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

  // Auto-start management
  getOpencodeAutoStart(): boolean {
    return this.store.get('opencode.autoStart', true)
  }

  setOpencodeAutoStart(enabled: boolean): void {
    this.store.set('opencode.autoStart', enabled)
  }

  // Recent workspaces management
  getRecentWorkspaces(): string[] {
    return this.store.get('workspaces.recent', [])
  }

  addRecentWorkspace(path: string): void {
    const recent = this.store.get('workspaces.recent', [])

    // Remove if already exists (to move to front)
    const filtered = recent.filter((p) => p !== path)

    // Add to front
    const updated = [path, ...filtered]

    // Keep only 10 most recent
    const limited = updated.slice(0, 10)

    this.store.set('workspaces.recent', limited)
  }

  removeRecentWorkspace(path: string): void {
    const recent = this.store.get('workspaces.recent', [])
    const filtered = recent.filter((p) => p !== path)
    this.store.set('workspaces.recent', filtered)
  }

  clearRecentWorkspaces(): void {
    this.store.set('workspaces.recent', [])
  }

  // Workspace-specific settings management

  /**
   * Normalize workspace path for consistent storage
   * Handles cross-platform path differences
   */
  private normalizeWorkspacePath(workspacePath: string): string {
    // Normalize path separators and resolve to absolute path
    return path.resolve(workspacePath).toLowerCase()
  }

  /**
   * Get settings for a specific workspace
   * Returns empty object if no settings exist for the workspace
   */
  getWorkspaceSettings(workspacePath: string): WorkspaceSettings {
    const normalizedPath = this.normalizeWorkspacePath(workspacePath)
    const allSettings = this.store.get('workspaces.settings', {})
    return allSettings[normalizedPath] || {}
  }

  /**
   * Set settings for a specific workspace
   * Merges with existing settings
   */
  setWorkspaceSettings(workspacePath: string, settings: WorkspaceSettings): void {
    const normalizedPath = this.normalizeWorkspacePath(workspacePath)
    const allSettings = this.store.get('workspaces.settings', {})

    // Merge with existing settings for this workspace
    const existingSettings = allSettings[normalizedPath] || {}
    const mergedSettings = {
      ...existingSettings,
      ...settings,
      // Deep merge nested objects
      opencodeConfig: {
        ...(existingSettings.opencodeConfig || {}),
        ...(settings.opencodeConfig || {})
      },
      ui: {
        ...(existingSettings.ui || {}),
        ...(settings.ui || {})
      },
      session: {
        ...(existingSettings.session || {}),
        ...(settings.session || {})
      }
    }

    allSettings[normalizedPath] = mergedSettings
    this.store.set('workspaces.settings', allSettings)
  }

  /**
   * Clear settings for a specific workspace
   */
  clearWorkspaceSettings(workspacePath: string): void {
    const normalizedPath = this.normalizeWorkspacePath(workspacePath)
    const allSettings = this.store.get('workspaces.settings', {})
    delete allSettings[normalizedPath]
    this.store.set('workspaces.settings', allSettings)
  }

  /**
   * Get all workspace settings
   * Useful for debugging and migration
   */
  getAllWorkspaceSettings(): Record<string, WorkspaceSettings> {
    return this.store.get('workspaces.settings', {})
  }

  // Get the entire config for debugging
  getConfig(): AppConfig {
    return this.store.store
  }

  // Project Management Methods

  /**
   * Get project configuration
   */
  getProjectConfig(projectPath: string): Partial<Config> {
    const normalizedPath = this.normalizeWorkspacePath(projectPath)
    const allConfigs = this.store.get('projects.configs', {})
    return allConfigs[normalizedPath] || {}
  }

  /**
   * Set project configuration
   */
  setProjectConfig(projectPath: string, config: Partial<Config>): void {
    const normalizedPath = this.normalizeWorkspacePath(projectPath)
    const allConfigs = this.store.get('projects.configs', {})
    allConfigs[normalizedPath] = config
    this.store.set('projects.configs', allConfigs)
  }

  /**
   * Get recent projects list
   */
  getRecentProjects(): string[] {
    return this.store.get('projects.recent', [])
  }

  /**
   * Add project to recent list
   */
  addRecentProject(projectPath: string): void {
    const recent = this.store.get('projects.recent', [])
    const normalizedPath = this.normalizeWorkspacePath(projectPath)

    // Remove if already exists (to move to front)
    const filtered = recent.filter((p) => this.normalizeWorkspacePath(p) !== normalizedPath)

    // Add to front
    const updated = [projectPath, ...filtered]

    // Keep only 10 most recent
    const limited = updated.slice(0, 10)

    this.store.set('projects.recent', limited)
  }

  /**
   * Set project open state
   */
  setProjectOpen(projectPath: string, isOpen: boolean, port?: number): void {
    const normalizedPath = this.normalizeWorkspacePath(projectPath)
    const allStates = this.store.get('projects.states', {})

    allStates[normalizedPath] = {
      isOpen,
      port,
      lastOpened: isOpen ? new Date().toISOString() : allStates[normalizedPath]?.lastOpened
    }

    this.store.set('projects.states', allStates)
  }

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

  /**
   * Get default project configuration
   */
  getDefaultProjectConfig(): Partial<Config> {
    return {
      model: 'anthropic/claude-3-5-sonnet-20241022'
    }
  }
}
