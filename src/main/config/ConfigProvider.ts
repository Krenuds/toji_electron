import Store from 'electron-store'
import path from 'path'

import type { Config } from '@opencode-ai/sdk'

// Project-specific settings
interface ProjectSettings {
  [key: string]: unknown
}

interface AppConfig {
  opencode: {
    workingDirectory: string
    autoStart: boolean
  }
  projects: {
    recent: string[] // Recently used project paths
    configs: Record<string, Partial<Config>> // Saved OpenCode configs per project
    settings: Record<string, ProjectSettings> // Project-specific settings
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
        projects: {
          recent: [],
          configs: {},
          settings: {},
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

  // Project-specific settings management

  /**
   * Normalize project path for consistent storage
   * Handles cross-platform path differences
   */
  private normalizeProjectPath(projectPath: string): string {
    // Normalize path separators and resolve to absolute path
    return path.resolve(projectPath).toLowerCase()
  }

  /**
   * Get settings for a specific project
   * Returns empty object if no settings exist for the project
   */
  getProjectSettings(projectPath: string): ProjectSettings {
    const normalizedPath = this.normalizeProjectPath(projectPath)
    const allSettings = this.store.get('projects.settings', {})
    return allSettings[normalizedPath] || {}
  }

  /**
   * Set settings for a specific project
   * Merges with existing settings
   */
  setProjectSettings(projectPath: string, settings: ProjectSettings): void {
    const normalizedPath = this.normalizeProjectPath(projectPath)
    const allSettings = this.store.get('projects.settings', {})

    // Merge with existing settings for this project
    const existingSettings = allSettings[normalizedPath] || {}
    const mergedSettings = {
      ...existingSettings,
      ...settings
    }

    allSettings[normalizedPath] = mergedSettings
    this.store.set('projects.settings', allSettings)
  }

  /**
   * Clear settings for a specific project
   */
  clearProjectSettings(projectPath: string): void {
    const normalizedPath = this.normalizeProjectPath(projectPath)
    const allSettings = this.store.get('projects.settings', {})
    delete allSettings[normalizedPath]
    this.store.set('projects.settings', allSettings)
  }

  /**
   * Get all project settings
   * Useful for debugging and migration
   */
  getAllProjectSettings(): Record<string, ProjectSettings> {
    return this.store.get('projects.settings', {})
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
    const normalizedPath = this.normalizeProjectPath(projectPath)
    const allConfigs = this.store.get('projects.configs', {})
    return allConfigs[normalizedPath] || {}
  }

  /**
   * Set project configuration
   */
  setProjectConfig(projectPath: string, config: Partial<Config>): void {
    const normalizedPath = this.normalizeProjectPath(projectPath)
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
    const normalizedPath = this.normalizeProjectPath(projectPath)

    // Remove if already exists (to move to front)
    const filtered = recent.filter((p) => this.normalizeProjectPath(p) !== normalizedPath)

    // Add to front
    const updated = [projectPath, ...filtered]

    // Keep only 10 most recent
    const limited = updated.slice(0, 10)

    this.store.set('projects.recent', limited)
  }

  /**
   * Remove project from recent list
   */
  removeRecentProject(projectPath: string): void {
    const recent = this.store.get('projects.recent', [])
    const normalizedPath = this.normalizeProjectPath(projectPath)
    const filtered = recent.filter((p) => this.normalizeProjectPath(p) !== normalizedPath)
    this.store.set('projects.recent', filtered)
  }

  /**
   * Clear all recent projects
   */
  clearRecentProjects(): void {
    this.store.set('projects.recent', [])
  }

  /**
   * Set project open state
   */
  setProjectOpen(projectPath: string, isOpen: boolean, port?: number): void {
    const normalizedPath = this.normalizeProjectPath(projectPath)
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
      model: 'opencode/grok-code'
    }
  }
}
