import Store from 'electron-store'
import path from 'path'

interface AppConfig {
  discord?: {
    token?: string
  }
  projects: {
    recent: string[] // Recently used project paths
    current?: string // Currently active project path
    activeSessions: Record<string, string> // Active session ID per project path
  }
}

export class ConfigProvider {
  private store: Store<AppConfig>

  constructor() {
    this.store = new Store<AppConfig>({
      defaults: {
        projects: {
          recent: [],
          activeSessions: {}
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
