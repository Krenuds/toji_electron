import type { Toji } from '../../../main/toji'
import type { Client, TextChannel } from 'discord.js'
import type { DiscordPlugin, DiscordModule } from '../DiscordPlugin'
import { CategoryManager } from './CategoryManager'
import { createFileDebugLogger } from '../../../main/utils/logger'
import { loadState, saveState } from '../utils/state'
import type { DiscordBotState } from '../utils/state'

const log = createFileDebugLogger('discord:project-manager')

export interface ProjectChannel {
  channelId: string
  projectPath: string
  projectName: string
  isActive: boolean
}

/**
 * Discord Project Manager - Manages project-to-channel mapping
 * This is a thin wrapper around Toji's existing project functionality
 */
export class DiscordProjectManager implements DiscordModule {
  private activeChannelId?: string
  private projectChannels: Map<string, ProjectChannel> = new Map()
  private categoryManager: CategoryManager
  private client?: Client

  constructor(private toji: Toji) {
    this.categoryManager = new CategoryManager()
  }

  /**
   * Initialize the project manager with Discord plugin
   */
  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  async initialize(_plugin: DiscordPlugin): Promise<void> {
    // We'll get the client from the plugin later when ready
    log('DiscordProjectManager initialized with plugin')
  }

  /**
   * Initialize with Discord client (called from onReady)
   */
  async initializeWithClient(client: Client): Promise<void> {
    this.client = client
    await this.categoryManager.initialize(client)
    log('DiscordProjectManager initialized with Discord client')

    // Load saved state and sync with Discord
    await this.loadAndSyncState()
  }

  /**
   * Load saved state and sync with Discord channels
   */
  async loadAndSyncState(): Promise<void> {
    log('Loading and syncing state with Discord')

    const state = await loadState()

    // Load project mappings
    for (const [channelId, info] of Object.entries(state.projects)) {
      this.projectChannels.set(channelId, {
        channelId,
        projectPath: info.path,
        projectName: info.name,
        isActive: channelId === state.activeProjectChannelId
      })
    }

    // If state is empty, auto-import all Toji projects
    if (this.projectChannels.size === 0) {
      log('No projects in state, auto-importing from Toji')
      await this.autoImportTojiProjects()
    } else {
      // Sync with Discord channels
      await this.syncWithDiscord()
    }

    // Restore active project if it exists
    if (state.activeProjectChannelId && this.projectChannels.has(state.activeProjectChannelId)) {
      this.activeChannelId = state.activeProjectChannelId
      // No visual indicators needed - we auto-switch based on channel context
    }

    log('State loaded and synced: %d projects', this.projectChannels.size)
  }

  /**
   * Sync saved state with actual Discord channels
   */
  async syncWithDiscord(): Promise<void> {
    if (!this.client) {
      log('Cannot sync - no Discord client')
      return
    }

    log('Syncing with Discord channels')

    // Ensure category exists
    const category = await this.categoryManager.getOrCreateCategory()

    // Get all channels in the category
    const existingChannels = await this.categoryManager.getProjectChannels(category.guild)
    const existingChannelIds = new Set(existingChannels.map((ch) => ch.id))

    // Check for missing channels (in state but not in Discord)
    const toRemove: string[] = []
    for (const [channelId, project] of this.projectChannels) {
      if (!existingChannelIds.has(channelId)) {
        // Skip invalid project names that would cause issues
        if (!project.projectName || project.projectName === '/' || project.projectName.length < 2) {
          log('Removing invalid project from state: %s', project.projectName)
          toRemove.push(channelId)
          continue
        }

        log(
          'Channel %s missing in Discord for project %s, removing from state',
          channelId,
          project.projectName
        )
        toRemove.push(channelId)
      }
    }

    // Remove invalid/missing channels from state
    for (const channelId of toRemove) {
      this.projectChannels.delete(channelId)
    }

    // Check for orphaned channels (in Discord but not in state)
    for (const channel of existingChannels) {
      if (!this.projectChannels.has(channel.id)) {
        log('Orphaned channel found: %s (%s)', channel.name, channel.id)
        // We'll keep orphaned channels but log them
        // User can manually remove with /refresh --clean
      }
    }

    // No visual indicators needed - we auto-switch based on channel context

    // Save updated state
    await this.persistState()
  }

  /**
   * Initialize Discord channels from scratch
   */
  async initializeChannels(): Promise<void> {
    if (!this.client) {
      log('Cannot initialize - no Discord client')
      return
    }

    log('Initializing Discord channels from current state')

    // Ensure category exists
    const category = await this.categoryManager.getOrCreateCategory()

    // Clear all existing project channels
    const existingChannels = await this.categoryManager.getProjectChannels(category.guild)
    for (const channel of existingChannels) {
      log('Removing existing channel: %s', channel.name)
      await channel.delete('Reinitializing project channels')
    }

    // Create channels for all projects in state
    for (const project of this.projectChannels.values()) {
      log('Creating channel for project: %s', project.projectName)
      const channel = await this.categoryManager.createProjectChannel(project.projectName)

      // Update channel ID in our mapping
      project.channelId = channel.id
    }

    // No visual indicators needed - we auto-switch based on channel context

    // Save state
    await this.persistState()

    log('Initialization complete')
  }

  /**
   * Persist current state to disk
   */
  private async persistState(): Promise<void> {
    const state: DiscordBotState = {
      activeProjectChannelId: this.activeChannelId,
      projects: {}
    }

    for (const [channelId, project] of this.projectChannels) {
      state.projects[channelId] = {
        name: project.projectName,
        path: project.projectPath
      }
    }

    await saveState(state)
  }

  /**
   * Switch to a project by channel ID
   */
  async switchToProject(channelId: string): Promise<void> {
    const project = this.projectChannels.get(channelId)
    if (!project) {
      throw new Error(`No project mapped to channel ${channelId}`)
    }

    log('Switching to project: %s (path: %s)', project.projectName, project.projectPath)

    try {
      // Use Toji's existing switchToProject method!
      await this.toji.switchToProject(project.projectPath)

      // Update active channel
      const previousActive = this.activeChannelId
      this.activeChannelId = channelId

      // No need for visual indicators - we auto-switch based on channel context

      log('Successfully switched to project: %s', project.projectName)
    } catch (error) {
      log('ERROR: Failed to switch project: %o', error)
      throw error
    }
  }

  /**
   * Add a new project and create its channel
   */
  async addProject(projectPath: string, projectName?: string): Promise<TextChannel> {
    // Generate a clean channel name
    const name = projectName || projectPath.split(/[\\/]/).pop() || 'unnamed-project'
    const channelName = name.toLowerCase().replace(/[^a-z0-9-]/g, '-')

    log('Adding project: %s at path: %s', channelName, projectPath)

    // Create Discord channel in the Toji Desktop category
    const channel = await this.categoryManager.createProjectChannel(channelName)

    // Store mapping
    const projectInfo: ProjectChannel = {
      channelId: channel.id,
      projectPath,
      projectName: name,
      isActive: false
    }
    this.projectChannels.set(channel.id, projectInfo)

    // Switch to the new project
    await this.switchToProject(channel.id)

    // Save state
    await this.persistState()

    log('Project added successfully: %s', name)
    return channel
  }

  /**
   * Remove a project and its channel
   */
  async removeProject(channelId: string): Promise<void> {
    const project = this.projectChannels.get(channelId)
    if (!project) {
      throw new Error(`No project mapped to channel ${channelId}`)
    }

    log('Removing project: %s', project.projectName)

    // Delete the Discord channel
    const channel = this.client?.channels.cache.get(channelId)
    if (channel && 'delete' in channel && typeof channel.delete === 'function') {
      await channel.delete(`Project ${project.projectName} removed`)
    }

    // Remove from mapping
    this.projectChannels.delete(channelId)

    // If this was the active project, close it in Toji
    if (this.activeChannelId === channelId) {
      await this.toji.closeCurrentProject()
      this.activeChannelId = undefined
    }

    // Save state
    await this.persistState()

    log('Project removed: %s', project.projectName)
  }

  /**
   * Get list of all projects
   */
  getProjects(): ProjectChannel[] {
    return Array.from(this.projectChannels.values())
  }

  /**
   * Get the currently active project
   */
  getActiveProject(): ProjectChannel | undefined {
    if (!this.activeChannelId) return undefined
    return this.projectChannels.get(this.activeChannelId)
  }

  /**
   * Check if a channel is a project channel
   */
  isProjectChannel(channelId: string): boolean {
    return this.projectChannels.has(channelId)
  }

  /**
   * Check if a channel is in the Toji Desktop category
   */
  async isInTojiCategory(channelId: string): Promise<boolean> {
    const channel = this.client?.channels.cache.get(channelId)
    if (!channel || !('parent' in channel)) return false

    const category = await this.categoryManager.getOrCreateCategory()
    return channel.parent?.id === category.id
  }

  /**
   * Send a chat message using the current project context
   */
  async chat(message: string): Promise<string> {
    // Use Toji's existing chat method - it already handles project context!
    return this.toji.chat(message)
  }

  /**
   * Clear the current conversation
   */
  async clearConversation(): Promise<void> {
    // Use Toji's existing clearSession method
    this.toji.clearSession()
  }

  // Visual indicators removed - we auto-switch based on channel context
  // This eliminates Discord API rate limit delays

  /**
   * Load saved project mappings from state
   */
  loadState(state: Record<string, { path: string; name: string }>): void {
    for (const [channelId, info] of Object.entries(state)) {
      this.projectChannels.set(channelId, {
        channelId,
        projectPath: info.path,
        projectName: info.name,
        isActive: false
      })
    }
    log('Loaded %d project mappings from state', this.projectChannels.size)
  }

  /**
   * Get state for persistence
   */
  getState(): Record<string, { path: string; name: string }> {
    const state: Record<string, { path: string; name: string }> = {}
    for (const [channelId, project] of this.projectChannels) {
      state[channelId] = {
        path: project.projectPath,
        name: project.projectName
      }
    }
    return state
  }

  /**
   * Auto-import all Toji projects on first startup
   */
  private async autoImportTojiProjects(): Promise<void> {
    try {
      const tojiProjects = await this.toji.getAvailableProjects()

      if (tojiProjects.length === 0) {
        log('No projects found in Toji to import')
        return
      }

      log('Auto-importing %d Toji projects', tojiProjects.length)

      for (const project of tojiProjects) {
        try {
          const name = project.worktree.split(/[/\\]/).pop() || project.worktree

          // Skip invalid project names
          if (!name || name === '/' || name.length < 2) {
            log('Skipping invalid project: %s', project.worktree)
            continue
          }

          const channel = await this.categoryManager.createProjectChannel(name)

          // Store mapping
          const projectInfo: ProjectChannel = {
            channelId: channel.id,
            projectPath: project.worktree,
            projectName: name,
            isActive: false
          }
          this.projectChannels.set(channel.id, projectInfo)

          log('Auto-imported project: %s (%s)', name, project.worktree)
        } catch (error) {
          log('ERROR: Failed to auto-import project %s: %o', project.worktree, error)
        }
      }

      // Save state after import
      await this.persistState()

      // Update visual indicators
      for (const [channelId, project] of this.projectChannels) {
        await this.updateChannelIndicator(channelId, project.isActive)
      }

      log('Auto-import complete: %d projects imported', this.projectChannels.size)
    } catch (error) {
      log('ERROR: Failed to auto-import projects: %o', error)
    }
  }

  /**
   * Cleanup resources
   */
  cleanup(): void {
    this.projectChannels.clear()
    this.activeChannelId = undefined
    log('DiscordProjectManager cleaned up')
  }
}
