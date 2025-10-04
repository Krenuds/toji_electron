import type { Toji } from '../../../main/toji'
import type { ToolEvent } from '../../../main/toji/types'
import type { Client, TextChannel } from 'discord.js'
import type { DiscordModule } from '../DiscordPlugin'
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
  async initialize(): Promise<void> {
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
   * Load saved state from disk
   */
  async loadAndSyncState(): Promise<void> {
    log('Loading saved state')

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

    // Restore active project if it exists
    if (state.activeProjectChannelId && this.projectChannels.has(state.activeProjectChannelId)) {
      this.activeChannelId = state.activeProjectChannelId
    }

    log('State loaded: %d projects', this.projectChannels.size)

    // Note: No auto-sync or auto-import. Use /init to rebuild channels.
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
        // We'll keep orphaned channels but log them for manual cleanup
      }
    }

    // No visual indicators needed - we auto-switch based on channel context

    // Save updated state
    await this.persistState()
  }

  /**
   * Initialize Discord channels from scratch - complete rebuild
   */
  async initializeChannels(): Promise<void> {
    if (!this.client) {
      log('Cannot initialize - no Discord client')
      return
    }

    log('Rebuilding Discord channels from Toji projects')

    // Step 1: Clear all existing channels and state
    await this.categoryManager.deleteAllProjectChannels()
    this.projectChannels.clear()
    this.activeChannelId = undefined

    // Step 2: Get all available projects from Toji
    const tojiProjects = await this.toji.getAvailableProjects()
    log('Found %d projects in Toji to rebuild', tojiProjects.length)

    // Step 3: Create channels for each Toji project
    for (const project of tojiProjects) {
      try {
        const name = project.worktree.split(/[/\\\\]/).pop() || 'unnamed-project'

        // Skip invalid project names
        if (!name || name === '/' || name.length < 2) {
          log('Skipping invalid project: %s', project.worktree)
          continue
        }

        const channelName = name.toLowerCase().replace(/[^a-z0-9-]/g, '-')
        const channel = await this.categoryManager.createProjectChannel(channelName)

        // Store mapping
        const projectInfo: ProjectChannel = {
          channelId: channel.id,
          projectPath: project.worktree,
          projectName: name,
          isActive: false
        }
        this.projectChannels.set(channel.id, projectInfo)

        log('Created channel for project: %s -> %s', name, channel.id)
      } catch (error) {
        log('ERROR: Failed to create channel for project %s: %o', project.worktree, error)
      }
    }

    // Step 4: Save the new state
    await this.persistState()

    log('Channel rebuild complete: %d channels created', this.projectChannels.size)
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
   * Send a chat message with streaming responses
   */
  async chatStreaming(
    message: string,
    callbacks: {
      onChunk?: (text: string, partId: string) => void | Promise<void>
      onComplete?: (fullText: string) => void | Promise<void>
      onError?: (error: Error) => void | Promise<void>
      onTool?: (toolEvent: ToolEvent) => void | Promise<void>
    }
  ): Promise<void> {
    return this.toji.chatStreaming(message, callbacks)
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
   * Cleanup resources
   */
  cleanup(): void {
    this.projectChannels.clear()
    this.activeChannelId = undefined
    log('DiscordProjectManager cleaned up')
  }
}
