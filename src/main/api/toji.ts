// ============================================
// Toji - Main API Orchestrator Class
// ============================================

import type {
  TojiConfig,
  TojiStatus,
  WorkspaceCollection,
  EnrichedProject,
  DiscoveredProject,
  WorkspaceSettings
} from './types'
import type { OpenCodeService } from '../services/opencode-service'
import type { ConfigProvider } from '../config/ConfigProvider'
import { ServerManager } from './server'
import { ClientManager } from './client'
import { WorkspaceManager } from './workspace'
import { SessionManager } from './session'
import { ProjectManager } from './opencode-project'
import { exec } from 'child_process'
import { promisify } from 'util'
import * as path from 'path'

const execAsync = promisify(exec)

/**
 * Toji - The main API orchestrator class that provides a unified interface
 * to all OpenCode functionality plus custom enhancements.
 *
 * This is THE API that all interfaces (Electron, Discord, Slack, etc.)
 * will interact with. It orchestrates all managers and provides high-level
 * business logic operations.
 */
export class Toji {
  // Core OpenCode managers
  public readonly server: ServerManager
  public readonly client: ClientManager
  public readonly workspace: WorkspaceManager
  public readonly session: SessionManager
  public readonly project: ProjectManager

  constructor(
    // Services are injected - Toji orchestrates, doesn't implement
    private opencodeService: OpenCodeService,
    // Optional config provider for persistent settings
    private config?: ConfigProvider
  ) {
    // Initialize all managers with proper dependencies
    this.server = new ServerManager(this.opencodeService)
    this.client = new ClientManager()
    this.workspace = new WorkspaceManager(this.client)
    this.session = new SessionManager(this.client)
    this.project = new ProjectManager(this.client)

    console.log('Toji: Main API orchestrator initialized')
  }

  /**
   * Initialize Toji with a workspace and configuration
   * This is the main entry point for setting up OpenCode
   */
  async initialize(directory: string, config: TojiConfig = {}): Promise<void> {
    console.log(`Toji: Initializing OpenCode in ${directory}`)

    try {
      // 1. Prepare workspace
      await this.workspace.prepare(directory)

      // 2. Start server with configuration
      const serverOptions = {
        hostname: config.server?.hostname,
        port: config.server?.port,
        timeout: config.server?.timeout,
        config: {
          // Add any model configuration here
        }
      }
      await this.server.start(directory, serverOptions)

      // 3. Connect client to the started server
      const serverUrl = this.server.getUrl()
      if (!serverUrl) {
        throw new Error('Server started but URL not available')
      }
      await this.client.connect(serverUrl)

      // 4. Log project info
      await this.project.logInfo()

      console.log('Toji: Initialization complete!')
    } catch (error) {
      console.error('Toji: Initialization failed:', error)
      await this.shutdown() // Clean up on failure
      throw error
    }
  }

  /**
   * Shutdown Toji cleanly
   */
  async shutdown(): Promise<void> {
    console.log('Toji: Shutting down OpenCode')

    try {
      // 1. Disconnect client
      await this.client.disconnect()

      // 2. Stop server
      await this.server.stop()

      // 3. Return to original directory
      await this.workspace.returnToOriginal()

      console.log('Toji: Shutdown complete')
    } catch (error) {
      console.error('Toji: Error during shutdown:', error)
      throw error
    }
  }

  /**
   * Get overall Toji status
   */
  getStatus(): TojiStatus {
    return {
      server: this.server.getStatus(),
      client: this.client.getConnectionInfo(),
      workspace: this.workspace.getStatus()
    }
  }

  /**
   * Quick start method for common workflow
   */
  async quickStart(directory: string): Promise<void> {
    console.log(`Toji: Quick starting OpenCode in ${directory}`)

    // Initialize with sensible defaults
    await this.initialize(directory, {
      server: {
        hostname: '127.0.0.1',
        port: 4096,
        timeout: 5000
      },
      workspace: {
        autoInit: true,
        gitInit: true
      }
    })

    console.log('Toji: Quick start complete - ready for interaction!')
  }

  /**
   * Check if Toji is ready for operations
   */
  isReady(): boolean {
    return this.server.isRunning() && this.client.isConnected()
  }

  /**
   * Ensure the environment is ready for chat operations
   * This is a compound operation that handles all initialization
   * Auto-starts server and creates session if needed
   */
  async ensureReadyForChat(
    directory?: string
  ): Promise<{ sessionId: string; serverStatus: string }> {
    console.log('Toji: Ensuring ready for chat operations')

    // Use provided directory, or config default, or current working directory
    const targetDir = directory || this.config?.getOpencodeWorkingDirectory() || process.cwd()

    try {
      // Check if already ready
      if (!this.isReady()) {
        console.log('Toji: Not ready, initializing...')
        await this.quickStart(targetDir)
        // Track this workspace when we start in a new one
        if (this.config) {
          this.config.addRecentWorkspace(targetDir)
        }
      }

      // Get or create a session
      let sessionId: string
      const currentSession = this.session.getCurrentSession()

      if (currentSession) {
        sessionId = currentSession.id
        console.log(`Toji: Using existing session ${sessionId}`)
      } else {
        console.log('Toji: Creating new chat session')
        const newSession = await this.session.create('General Chat')
        sessionId = newSession.id
        console.log(`Toji: Created session ${sessionId}`)
      }

      return {
        sessionId,
        serverStatus: 'online'
      }
    } catch (error) {
      console.error('Toji: Failed to ensure ready for chat:', error)
      return {
        sessionId: '',
        serverStatus: 'error'
      }
    }
  }

  /**
   * Change to a different workspace directory
   * This will shutdown current server, switch directories, and restart
   */
  async changeWorkspace(directory: string): Promise<{
    isNew: boolean
    hasGit: boolean
    hasOpenCodeConfig: boolean
    sessionId: string
    workspacePath: string
  }> {
    console.log(`Toji: Changing workspace to ${directory}`)

    try {
      // Inspect the target workspace
      const workspaceInfo = await this.workspace.inspect(directory)
      console.log('Toji: Workspace info:', workspaceInfo)

      // If we're running, shutdown cleanly
      if (this.isReady()) {
        console.log('Toji: Shutting down current workspace')
        await this.shutdown()
      }

      // Switch to new workspace (this handles directory change)
      console.log('Toji: Switching to new workspace')
      await this.workspace.switch(directory)

      // Reinitialize in new workspace
      console.log('Toji: Initializing in new workspace')
      await this.initialize(directory, {
        server: {
          hostname: '127.0.0.1',
          port: 4096,
          timeout: 5000
        }
      })

      // Update config if provided
      if (this.config) {
        console.log('Toji: Updating config with new directory')
        this.config.setOpencodeWorkingDirectory(directory)
        // Track this workspace in recent workspaces
        console.log('Toji: Adding workspace to recent list')
        this.config.addRecentWorkspace(directory)
      }

      // Create a fresh session for the new workspace
      console.log('Toji: Creating new session')
      const session = await this.session.create(
        workspaceInfo.hasGit ? 'Existing Project' : 'New Project'
      )

      return {
        isNew: !workspaceInfo.exists || !workspaceInfo.hasGit,
        hasGit: workspaceInfo.hasGit,
        hasOpenCodeConfig: workspaceInfo.hasOpenCodeConfig,
        sessionId: session.id,
        workspacePath: directory
      }
    } catch (error) {
      console.error('Toji: Failed to change workspace:', error)
      throw new Error(
        `Failed to change workspace: ${error instanceof Error ? error.message : 'Unknown error'}`
      )
    }
  }

  /**
   * Get or create a session by identifier
   * This provides a unified way for all interfaces to manage sessions
   * @param identifier - Unique identifier for the session (e.g., Discord channel ID, user ID)
   * @param title - Optional title for the session if creating new
   * @returns The session (existing or newly created)
   */
  async getOrCreateSession(
    identifier: string,
    title?: string
  ): Promise<{
    session: import('./session').Session
    isNew: boolean
  }> {
    console.log(`Toji: Getting or creating session for identifier: ${identifier}`)

    try {
      // First, check if a session with this identifier exists
      const existingSession = await this.session.getByIdentifier(identifier)

      if (existingSession) {
        console.log(
          `Toji: Found existing session ${existingSession.id} for identifier ${identifier}`
        )
        return {
          session: existingSession,
          isNew: false
        }
      }

      // Create a new session with the identifier
      console.log(`Toji: Creating new session for identifier ${identifier}`)
      const sessionTitle = title || `Session for ${identifier}`
      const newSession = await this.session.create(sessionTitle)

      // Store the identifier mapping
      await this.session.setSessionIdentifier(newSession.id, identifier)

      return {
        session: newSession,
        isNew: true
      }
    } catch (error) {
      console.error('Toji: Failed to get or create session:', error)
      throw new Error(
        `Failed to get or create session: ${error instanceof Error ? error.message : 'Unknown error'}`
      )
    }
  }

  /**
   * Send a prompt with automatic session management
   * Creates a session if none exists, otherwise uses the current session
   * This consolidates the IPC handler logic into the API layer
   */
  async promptWithAutoSession(text: string): Promise<string> {
    console.log('Toji: Processing prompt with auto session')

    const currentSession = this.session.getCurrentSession()

    if (!currentSession) {
      // Create a new session if none exists
      console.log('Toji: No current session, creating default session')
      const newSession = await this.session.create('Default Session')
      return await this.session.prompt(text, newSession.id)
    }

    return await this.session.prompt(text, currentSession.id)
  }

  /**
   * Send a chat message to the current session
   * High-level abstraction for all interfaces to use
   */
  async chat(message: string): Promise<string> {
    console.log('Toji: Processing chat message')

    try {
      // Ensure we're ready (this is idempotent)
      const { sessionId, serverStatus } = await this.ensureReadyForChat()

      if (serverStatus !== 'online' || !sessionId) {
        throw new Error('Failed to initialize chat environment')
      }

      // Send the message through the session manager
      const response = await this.session.prompt(message, sessionId)

      // console.log('Toji: Chat response received:', response ? `"${response.substring(0, 100)}..."` : 'EMPTY')
      return response || 'I apologize, but I received an empty response. Please try again.'
    } catch (error) {
      console.error('Toji: Chat error:', error)
      throw new Error(`Chat failed: ${error instanceof Error ? error.message : 'Unknown error'}`)
    }
  }

  // ============================================
  // Workspace Collection Methods
  // ============================================

  /**
   * Get all workspace collections from OpenCode data
   * Groups projects by base directories
   */
  async getWorkspaceCollections(): Promise<WorkspaceCollection[]> {
    console.log('Toji: Getting workspace collections')

    try {
      // Ensure client is ready
      if (!this.isReady()) {
        console.log('Toji: Client not ready, returning empty collections')
        return []
      }

      return await this.workspace.getWorkspaceCollections()
    } catch (error) {
      console.error('Toji: Error getting workspace collections:', error)
      return []
    }
  }

  /**
   * Get all enriched projects across all workspaces
   */
  async getAllProjects(): Promise<EnrichedProject[]> {
    console.log('Toji: Getting all projects')

    const collections = await this.getWorkspaceCollections()
    const allProjects: EnrichedProject[] = []

    collections.forEach((collection) => {
      allProjects.push(...collection.projects)
    })

    return allProjects
  }

  /**
   * Discover new projects in a directory
   * Finds projects that might not be tracked by OpenCode yet
   */
  async discoverProjects(baseDir?: string): Promise<DiscoveredProject[]> {
    console.log('Toji: Discovering projects')

    const searchDir = baseDir || this.config?.getOpencodeWorkingDirectory() || process.cwd()

    try {
      return await this.workspace.discoverProjects(searchDir)
    } catch (error) {
      console.error('Toji: Error discovering projects:', error)
      return []
    }
  }

  /**
   * Get enriched version of Workspaces
   * Combines OpenCode data with our metadata
   */
  async getEnrichedProjects(): Promise<EnrichedProject[]> {
    console.log('Toji: Getting enriched projects')

    try {
      // Get Workspaces
      const projectsResponse = await this.project.list()
      const projects = projectsResponse.data || []

      // Get all sessions for enrichment
      const sessionsResponse = await this.session.list()
      const sessions = sessionsResponse.data || []

      // Enrich each project
      const enrichedProjects: EnrichedProject[] = []

      for (const project of projects) {
        // Find sessions for this project
        const projectSessions = sessions.filter((s) => s.projectID === project.id)

        const enriched: EnrichedProject = {
          id: project.id,
          worktree: project.worktree,
          vcs: project.vcs,
          projectID: project.id,
          sessionCount: projectSessions.length,
          name: project.worktree.split(/[\\/]/).pop() || 'Unknown',
          lastSessionDate:
            projectSessions.length > 0
              ? new Date(
                  Math.max(...projectSessions.map((s) => s.time?.updated || s.time?.created || 0))
                )
              : undefined
        }

        enrichedProjects.push(enriched)
      }

      return enrichedProjects
    } catch (error) {
      // Check if it's just an uninitialized client (expected when no workspace is open)
      if (error instanceof Error && error.message.includes('Client not initialized')) {
        console.log('Toji: Client not initialized, returning empty project list')
      } else {
        console.error('Toji: Error getting enriched projects:', error)
      }
      return []
    }
  }

  /**
   * Get workspaces derived from sessions
   * Extracts unique workspace paths from recent sessions
   * Returns simplified workspace objects with session counts
   */
  async getWorkspacesFromSessions(limit = 100): Promise<
    Array<{
      path: string
      name: string
      sessionCount: number
      lastActivity: Date | null
    }>
  > {
    console.log(`Toji: Getting workspaces from last ${limit} sessions`)

    try {
      // Ensure client is ready
      if (!this.isReady()) {
        console.log('Toji: Client not ready, returning empty workspace list')
        return []
      }

      // Get sessions (up to limit)
      const sessionsResponse = await this.session.list()
      const allSessions = sessionsResponse.data || []

      // Take only the most recent sessions (they're usually ordered by last activity)
      const sessions = allSessions.slice(0, limit)

      // Group sessions by directory
      const workspaceMap = new Map<
        string,
        {
          sessions: typeof sessions
          lastActivity: Date | null
        }
      >()

      sessions.forEach((session) => {
        if (!session.directory) return

        const existing = workspaceMap.get(session.directory)
        const sessionTime = session.time?.updated || session.time?.created
        const sessionDate = sessionTime ? new Date(sessionTime) : null

        if (!existing) {
          workspaceMap.set(session.directory, {
            sessions: [session],
            lastActivity: sessionDate
          })
        } else {
          existing.sessions.push(session)
          // Update last activity if this session is more recent
          if (sessionDate && (!existing.lastActivity || sessionDate > existing.lastActivity)) {
            existing.lastActivity = sessionDate
          }
        }
      })

      // Convert to array of workspace objects
      const workspaces = Array.from(workspaceMap.entries()).map(([path, data]) => {
        // Extract folder name from path (cross-platform)
        const name = path.split(/[\\/]/).pop() || path

        return {
          path,
          name,
          sessionCount: data.sessions.length,
          lastActivity: data.lastActivity
        }
      })

      // Sort by last activity (most recent first)
      workspaces.sort((a, b) => {
        if (!a.lastActivity) return 1
        if (!b.lastActivity) return -1
        return b.lastActivity.getTime() - a.lastActivity.getTime()
      })

      console.log(
        `Toji: Found ${workspaces.length} unique workspaces from ${sessions.length} sessions`
      )
      return workspaces
    } catch (error) {
      console.error('Toji: Error getting workspaces from sessions:', error)
      return []
    }
  }

  /**
   * Get all workspaces combining sessions and recent history
   * Merges session-derived workspaces with recent workspaces from config
   * Returns unified list with consistent structure for UI consumption
   */
  async getAllWorkspaces(limit = 100): Promise<
    Array<{
      path: string
      name: string
      sessionCount: number
      lastActivity: Date | null
      source: 'session' | 'recent' | 'both'
    }>
  > {
    console.log('Toji: Getting all workspaces (sessions + recent)')

    try {
      // 1. Get session-derived workspaces
      const sessionWorkspaces = await this.getWorkspacesFromSessions(limit)

      // 2. Get recent workspace paths from config
      const recentPaths = this.getRecentWorkspaces()

      // 3. Create a Map for deduplication and merging
      const workspaceMap = new Map<
        string,
        {
          path: string
          name: string
          sessionCount: number
          lastActivity: Date | null
          source: 'session' | 'recent' | 'both'
        }
      >()

      // 4. Add session workspaces first
      sessionWorkspaces.forEach((ws) => {
        const isRecent = recentPaths.includes(ws.path)
        workspaceMap.set(ws.path, {
          ...ws,
          source: isRecent ? 'both' : 'session'
        })
      })

      // 5. Add recent workspaces not in sessions
      recentPaths.forEach((path) => {
        if (!workspaceMap.has(path)) {
          // Extract folder name from path (cross-platform)
          const name = path.split(/[\\/]/).pop() || path

          workspaceMap.set(path, {
            path,
            name,
            sessionCount: 0,
            lastActivity: null,
            source: 'recent'
          })
        }
      })

      // 6. Convert to array and sort
      const allWorkspaces = Array.from(workspaceMap.values())

      // Sort with priority:
      // 1. Recent/active workspaces (source='both' or 'recent') come first
      // 2. Within each category, sort by last activity
      allWorkspaces.sort((a, b) => {
        // Prioritize recent/active workspaces
        const aIsRecent = a.source === 'both' || a.source === 'recent'
        const bIsRecent = b.source === 'both' || b.source === 'recent'

        if (aIsRecent && !bIsRecent) return -1
        if (!aIsRecent && bIsRecent) return 1

        // Within same category, sort by last activity
        if (!a.lastActivity && !b.lastActivity) return 0
        if (!a.lastActivity) return 1
        if (!b.lastActivity) return -1
        return b.lastActivity.getTime() - a.lastActivity.getTime()
      })

      console.log(
        `Toji: Found ${allWorkspaces.length} total workspaces ` +
          `(${sessionWorkspaces.length} from sessions, ${recentPaths.length} recent)`
      )

      return allWorkspaces
    } catch (error) {
      console.error('Toji: Error getting all workspaces:', error)
      return []
    }
  }

  /**
   * Get sessions for a specific workspace
   * Filters all sessions by workspace directory (cross-platform)
   * @param workspacePath - The workspace path to filter by
   * @returns Array of sessions belonging to this workspace
   */
  async getSessionsForWorkspace(
    workspacePath: string
  ): Promise<import('@opencode-ai/sdk').Session[]> {
    console.log(`Toji: Getting sessions for workspace: ${workspacePath}`)

    try {
      // Ensure client is ready
      if (!this.isReady()) {
        console.log('Toji: Client not ready, returning empty session list')
        return []
      }

      // Get all sessions
      const sessionsResponse = await this.session.list()
      const allSessions = sessionsResponse.data || []

      // Normalize the input path for cross-platform comparison
      const normalizedWorkspacePath = path.normalize(path.resolve(workspacePath))

      // Filter sessions by normalized directory path
      const workspaceSessions = allSessions.filter((session) => {
        if (!session.directory) return false

        // Normalize the session directory for comparison
        const normalizedSessionDir = path.normalize(path.resolve(session.directory))

        // Compare normalized paths
        return normalizedSessionDir === normalizedWorkspacePath
      })

      console.log(`Toji: Found ${workspaceSessions.length} sessions for workspace ${workspacePath}`)

      return workspaceSessions
    } catch (error) {
      console.error('Toji: Error getting sessions for workspace:', error)
      return []
    }
  }

  /**
   * Get recent workspaces from config
   */
  getRecentWorkspaces(): string[] {
    if (!this.config) {
      return []
    }
    return this.config.getRecentWorkspaces()
  }

  /**
   * Remove a workspace from recent list
   */
  removeRecentWorkspace(path: string): void {
    if (this.config) {
      this.config.removeRecentWorkspace(path)
    }
  }

  /**
   * Clear all recent workspaces
   */
  clearRecentWorkspaces(): void {
    if (this.config) {
      this.config.clearRecentWorkspaces()
    }
  }

  /**
   * Get workspace-specific settings
   */
  async getWorkspaceSettings(workspacePath: string): Promise<WorkspaceSettings> {
    if (!this.config) {
      console.warn('Toji: Config provider not initialized')
      return {}
    }
    return this.config.getWorkspaceSettings(workspacePath)
  }

  /**
   * Set workspace-specific settings
   */
  async setWorkspaceSettings(workspacePath: string, settings: WorkspaceSettings): Promise<void> {
    if (!this.config) {
      console.warn('Toji: Config provider not initialized')
      return
    }
    this.config.setWorkspaceSettings(workspacePath, settings)
    console.log(`Toji: Updated settings for workspace: ${workspacePath}`)
  }

  /**
   * Clear workspace-specific settings
   */
  async clearWorkspaceSettings(workspacePath: string): Promise<void> {
    if (!this.config) {
      console.warn('Toji: Config provider not initialized')
      return
    }
    this.config.clearWorkspaceSettings(workspacePath)
    console.log(`Toji: Cleared settings for workspace: ${workspacePath}`)
  }

  /**
   * Get all workspace settings (for debugging)
   */
  async getAllWorkspaceSettings(): Promise<Record<string, WorkspaceSettings>> {
    if (!this.config) {
      console.warn('Toji: Config provider not initialized')
      return {}
    }
    return this.config.getAllWorkspaceSettings()
  }

  // ===========================================
  // Development Tools
  // ===========================================

  /**
   * Run linting on the codebase
   * @returns Linting result with success status and output
   */
  async runLint(): Promise<{ success: boolean; output: string; hasWarnings: boolean }> {
    try {
      const { stdout, stderr } = await execAsync('npm run lint')

      const hasWarnings = stdout.includes('warning')
      const hasErrors = stdout.includes('error')

      if (stderr && !stderr.includes('warning')) {
        throw new Error(stderr)
      }

      return {
        success: !hasErrors,
        output: stdout || 'No output',
        hasWarnings
      }
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Unknown error'
      return {
        success: false,
        output: message,
        hasWarnings: false
      }
    }
  }

  /**
   * Run TypeScript type checking
   * @returns Type check result with success status and output
   */
  async runTypeCheck(): Promise<{ success: boolean; output: string; hasErrors: boolean }> {
    try {
      const { stdout, stderr } = await execAsync('npm run typecheck')

      const hasErrors = stdout.includes('error')

      if (stderr && !stderr.includes('warning')) {
        throw new Error(stderr)
      }

      return {
        success: !hasErrors,
        output: stdout || 'No output',
        hasErrors
      }
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Unknown error'
      return {
        success: false,
        output: message,
        hasErrors: true
      }
    }
  }

  /**
   * Build the application
   * @returns Build result with success status and output
   */
  async runBuild(): Promise<{ success: boolean; output: string }> {
    try {
      const { stdout, stderr } = await execAsync('npm run build')

      if (stderr && !stderr.includes('warning')) {
        throw new Error(stderr)
      }

      return {
        success: true,
        output: stdout || 'Build completed'
      }
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Unknown error'
      return {
        success: false,
        output: message
      }
    }
  }
}
