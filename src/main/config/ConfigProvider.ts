import Store from 'electron-store'
import path from 'path'

import type { WorkspaceSettings } from '../toji/types'

interface AppConfig {
  opencode: {
    workingDirectory: string
    autoStart: boolean
  }
  workspaces: {
    recent: string[]
    settings?: Record<string, WorkspaceSettings> // Map of path -> settings
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
        }
      },
      // Enable encryption for sensitive data like Discord token
      encryptionKey: 'toji3-discord-secure'
    })
  }

  getOpencodeWorkingDirectory(): string {
    return this.store.get('opencode.workingDirectory')
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
}
