import Store from 'electron-store'

interface AppConfig {
  opencode: {
    workingDirectory: string
    autoStart: boolean
  }
  workspaces: {
    recent: string[]
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

  // Get the entire config for debugging
  getConfig(): AppConfig {
    return this.store.store
  }
}
