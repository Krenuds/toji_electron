// Minimal Toji implementation with multi-server OpenCode SDK usage
import { createOpencodeClient } from '@opencode-ai/sdk'
import type { OpencodeClient, Part, Message, Project } from '@opencode-ai/sdk'
import type { OpenCodeService } from '../services/opencode-service'
import type { ConfigProvider } from '../config/ConfigProvider'
import { ProjectManager } from './project'
import { ServerManager } from './server'
import { SessionManager } from './sessions'
import { ProjectInitializer } from './project-initializer'
import type { ProjectStatus, InitializationResult } from './project-initializer'
import type { ServerStatus } from './types'
import type { OpencodeConfig } from './config'
import { createFileDebugLogger } from '../utils/logger'
import { BrowserWindow } from 'electron'
import { normalizePath } from '../utils/path'

const log = createFileDebugLogger('toji:core')
const logClient = createFileDebugLogger('toji:client')
const logChat = createFileDebugLogger('toji:chat')

export class Toji {
  private clients: Map<string, OpencodeClient> = new Map()
  private currentProjectDirectory?: string
  private currentProjectId?: string
  private _config?: ConfigProvider
  // private globalConfig: OpencodeConfig = defaultOpencodeConfig // Reserved for future use

  // Public modules
  public project: ProjectManager
  public readonly server: ServerManager
  public readonly sessions: SessionManager
  public readonly projectInitializer: ProjectInitializer

  constructor(opencodeService: OpenCodeService, config?: ConfigProvider) {
    log('Initializing Toji with OpenCode service')
    this._config = config
    // Initialize modules
    this.server = new ServerManager(opencodeService)
    this.sessions = new SessionManager()
    this.project = new ProjectManager(() => this.getClient())
    this.projectInitializer = new ProjectInitializer()
    log('Toji initialized successfully')
  }

  async getServerStatus(): Promise<ServerStatus> {
    return this.server.getStatus()
  }

  // Connect a client to a specific server
  async connectClient(directory?: string): Promise<void> {
    const targetDirectory = directory || process.cwd()
    logClient('Connecting client for directory: %s', targetDirectory)

    // Get or create server for this directory
    const serverInstance = await this.server.getOrCreateServer(targetDirectory)
    const serverUrl = serverInstance.server.url

    logClient('Connecting to server URL: %s for directory: %s', serverUrl, targetDirectory)

    // Create client for this directory if not exists
    const normalized = normalizePath(targetDirectory)
    if (!this.clients.has(normalized)) {
      const client = createOpencodeClient({
        baseUrl: serverUrl,
        responseStyle: 'data' // Get data directly without wrapper
      })
      this.clients.set(normalized, client)
      logClient('Client created and connected for %s', normalized)
    } else {
      logClient('Reusing existing client for %s', normalized)
    }

    // Set current directory
    this.currentProjectDirectory = targetDirectory
    logClient('Current project directory set to: %s', this.currentProjectDirectory)

    // Update project manager with new client
    this.project = new ProjectManager(() => this.getClient())
  }

  // Get client for current or specific directory
  private getClient(directory?: string): OpencodeClient | undefined {
    const targetDir = directory || this.currentProjectDirectory || process.cwd()
    const normalized = normalizePath(targetDir)
    return this.clients.get(normalized)
  }

  // Change working directory (for project context)
  async changeWorkingDirectory(directory: string): Promise<void> {
    logClient('Changing working directory to: %s', directory)

    // Validate directory exists
    const fs = await import('fs')
    try {
      await fs.promises.access(directory, fs.constants.R_OK)
    } catch {
      throw new Error(`Cannot access directory: ${directory}`)
    }

    // CRITICAL: Change Node.js process working directory
    process.chdir(directory)
    logClient('Changed process.cwd() to: %s', process.cwd())

    // Update the current project directory
    this.currentProjectDirectory = directory
    logClient('Project directory set to: %s', directory)

    // Save as current project in config
    const config = this._config
    if (config) {
      config.setCurrentProjectPath(directory)
      config.addRecentProject(directory)
      logClient('Saved current project to config')
    }

    // Emit project opened event to notify frontend
    const mainWindow = BrowserWindow.getAllWindows()[0]
    if (mainWindow) {
      const projectName = directory.split(/[\\/]/).pop() || directory
      mainWindow.webContents.send('project:opened', {
        path: directory,
        name: projectName
      })
      logClient('Emitted project:opened event for: %s', projectName)
    }
  }

  // Check if ready
  isReady(): boolean {
    const client = this.getClient()
    return Boolean(this.server.isRunning() && client)
  }

  // Chat with the AI using session management
  async chat(message: string, sessionId?: string): Promise<string> {
    logChat('Chat request: message="%s", sessionId=%s', message, sessionId || 'auto')

    const client = this.getClient()
    if (!client) {
      const error = new Error('Client not connected to server')
      logChat('ERROR: %s', error.message)
      throw error
    }

    try {
      // Get or create session using SessionManager
      let activeSessionId = sessionId
      if (!activeSessionId && this.currentProjectDirectory) {
        activeSessionId = this.sessions.getActiveSession(this.currentProjectDirectory)
      }

      if (!activeSessionId) {
        logChat('Creating new session for project: %s', this.currentProjectDirectory || 'unknown')
        const sessionInfo = await this.sessions.createSession(
          client,
          undefined, // title
          this.currentProjectDirectory
        )
        activeSessionId = sessionInfo.id
        if (this.currentProjectDirectory) {
          this.sessions.setActiveSession(activeSessionId, this.currentProjectDirectory)
        }
        logChat('Created session: %s', activeSessionId)
      }

      // Send message to session
      logChat('Sending message to session %s', activeSessionId)
      const response = await client.session.prompt({
        path: { id: activeSessionId },
        body: {
          parts: [{ type: 'text', text: message }]
        },
        query: this.currentProjectDirectory
          ? { directory: this.currentProjectDirectory }
          : undefined
      })

      // Extract text from response parts
      let responseText = ''
      if (response && 'parts' in response) {
        const parts = (response as { parts: Part[] }).parts
        responseText = parts
          .filter((part: Part) => part.type === 'text')
          .map((part: Part) => (part as { text: string }).text)
          .join('')
      }

      logChat('Chat response received: %d characters', responseText.length)
      return responseText
    } catch (error) {
      logChat('ERROR: Chat failed: %o', error)
      throw error
    }
  }

  // Clear current session (start fresh conversation)
  clearSession(): void {
    if (this.currentProjectDirectory) {
      const activeSessionId = this.sessions.getActiveSession(this.currentProjectDirectory)
      logChat('Clearing current session: %s', activeSessionId || 'none')
      if (activeSessionId) {
        this.sessions.invalidateMessageCache(activeSessionId, this.currentProjectDirectory)
      }
      // Remove the active session reference
      this.sessions.setActiveSession('', this.currentProjectDirectory)
    }
  }

  // Get message history for a session
  async getSessionMessages(
    sessionId?: string,
    useCache = true
  ): Promise<Array<{ info: Message; parts: Part[] }>> {
    let activeSessionId = sessionId
    if (!activeSessionId && this.currentProjectDirectory) {
      activeSessionId = this.sessions.getActiveSession(this.currentProjectDirectory)
    }

    if (!activeSessionId) {
      logChat('No session ID provided or current session available')
      return []
    }

    const client = this.getClient()
    if (!client) {
      throw new Error('Client not connected to server')
    }

    try {
      return await this.sessions.getSessionMessages(
        client,
        activeSessionId,
        this.currentProjectDirectory,
        useCache
      )
    } catch (error) {
      logChat('ERROR: Failed to get session messages: %o', error)
      throw error
    }
  }

  // Get current session ID
  getCurrentSessionId(): string | undefined {
    if (!this.currentProjectDirectory) {
      return undefined
    }
    return this.sessions.getActiveSession(this.currentProjectDirectory)
  }

  // Get current project directory
  getCurrentProjectDirectory(): string | undefined {
    return this.currentProjectDirectory
  }

  // Get the actual Node.js working directory
  getCurrentWorkingDirectory(): string {
    return process.cwd()
  }

  // Set global configuration
  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  setGlobalConfig(_config: OpencodeConfig): void {
    // TODO: Implement global config if needed
    log('setGlobalConfig called but not implemented in simplified version')
  }

  // Get available projects (from OpenCode SDK)
  async getAvailableProjects(): Promise<Array<Project>> {
    const client = this.getClient()
    if (!client) {
      log('Client not connected, returning empty project list')
      return []
    }
    // Update project manager to use current client
    this.project = new ProjectManager(() => client)
    return this.project.list()
  }

  // Switch to a project (uses multi-server architecture)
  async switchToProject(projectPath: string): Promise<{ success: boolean; projectPath: string }> {
    log('Switching to project: %s', projectPath)

    try {
      // Get or create server for this project directory
      log('Getting or creating server for project: %s', projectPath)
      const serverInstance = await this.server.getOrCreateServer(projectPath)
      log('Server ready on port %d for %s', serverInstance.port, projectPath)

      // Update the project directory and process.chdir()
      await this.changeWorkingDirectory(projectPath)

      // Connect client to the appropriate server
      await this.connectClient(projectPath)

      // Check if project is properly discovered by OpenCode
      const client = this.getClient(projectPath)
      if (client) {
        const normalizedPath = projectPath.replace(/\\/g, '/')
        log('Checking project discovery for: %s', normalizedPath)

        // Try to get current project with the directory parameter
        try {
          const response = await fetch(
            `${serverInstance.server.url}/project/current?directory=${encodeURIComponent(normalizedPath)}`
          )
          const current = await response.json()

          // Store the current project ID
          this.currentProjectId = current?.id

          // If project is assigned to "global", it wasn't properly discovered
          if (current?.id === 'global') {
            log('Project not discovered (global project), limited functionality available')
            // Don't try to trigger discovery automatically - let user decide
          } else {
            log('Project already discovered: %s', current?.worktree)
          }
        } catch (error) {
          log('WARNING: Could not check project discovery: %o', error)
        }
      }

      return {
        success: true,
        projectPath
      }
    } catch (error) {
      log('ERROR: Failed to switch to project %s: %o', projectPath, error)
      throw error
    }
  }

  // Get current session info
  async getCurrentSession(): Promise<{ id: string; directory?: string } | null> {
    if (!this.currentProjectDirectory) {
      return null
    }

    const activeSessionId = this.sessions.getActiveSession(this.currentProjectDirectory)
    if (!activeSessionId) {
      return null
    }

    const client = this.getClient()
    if (!client) {
      throw new Error('Client not connected to server')
    }

    try {
      // Normalize path to forward slashes for OpenCode API
      const normalizedPath = this.currentProjectDirectory?.replace(/\\/g, '/')

      const response = await client.session.get({
        path: { id: activeSessionId },
        query: normalizedPath ? { directory: normalizedPath } : undefined
      })

      // Check if we got a valid session
      if (!response) {
        logChat('Session %s not found', activeSessionId)
        return null
      }

      return {
        id: activeSessionId,
        directory: this.currentProjectDirectory
      }
    } catch (error) {
      logChat('ERROR: Failed to get current session: %o', error)
      return null
    }
  }

  // Close the current project (stop server, clear client, reset state)
  async closeCurrentProject(): Promise<void> {
    log('Closing current project: %s', this.currentProjectDirectory || 'none')

    if (!this.currentProjectDirectory) {
      log('No current project to close')
      return
    }

    const projectToClose = this.currentProjectDirectory

    // Clear active session
    this.sessions.setActiveSession('', projectToClose)

    // Remove client from map
    const normalized = normalizePath(projectToClose)
    this.clients.delete(normalized)
    log('Removed client for %s', normalized)

    // Stop the server for this directory
    await this.server.stopServerForDirectory(projectToClose)
    log('Stopped server for %s', projectToClose)

    // Clear current project directory
    this.currentProjectDirectory = undefined
    this.currentProjectId = undefined

    // Clear from config
    if (this._config) {
      this._config.setCurrentProjectPath('')
      log('Cleared current project from config')
    }

    // CRITICAL: Reconnect to a default global server
    // This ensures the project list remains accessible
    try {
      // Use the app's install directory as the default global location
      // This ensures we have a consistent "global" server for project discovery
      const { app } = await import('electron')
      const globalDirectory = app.getPath('userData') // AppData/Roaming/toji3

      log('Reconnecting to global server at: %s', globalDirectory)

      // Connect to global server (this will create one if needed)
      await this.connectClient(globalDirectory)

      // Set the currentProjectId to 'global' to indicate we're in global mode
      this.currentProjectId = 'global'

      log('Successfully connected to global server')
    } catch (error) {
      log('ERROR: Failed to connect to global server: %o', error)
      // Don't throw here - we've at least closed the project
    }

    // Emit project closed event to notify frontend
    const mainWindow = BrowserWindow.getAllWindows()[0]
    if (mainWindow) {
      mainWindow.webContents.send('project:closed', {
        path: projectToClose
      })
      log('Emitted project:closed event for: %s', projectToClose)
    }
  }

  // Session management methods for IPC
  async listSessions(): Promise<Array<{ id: string; title?: string; projectPath?: string }>> {
    const client = this.getClient()
    if (!client) {
      throw new Error('Client not connected to server')
    }

    const sessions = await this.sessions.listSessions(client, this.currentProjectDirectory)
    return sessions
  }

  async createSession(
    title?: string
  ): Promise<{ id: string; title?: string; projectPath?: string }> {
    const client = this.getClient()
    if (!client) {
      throw new Error('Client not connected to server')
    }

    const sessionInfo = await this.sessions.createSession(
      client,
      title,
      this.currentProjectDirectory
    )

    // Set as active session
    if (this.currentProjectDirectory) {
      this.sessions.setActiveSession(sessionInfo.id, this.currentProjectDirectory)
    }

    return sessionInfo
  }

  async deleteSession(sessionId: string): Promise<void> {
    const client = this.getClient()
    if (!client) {
      throw new Error('Client not connected to server')
    }

    await this.sessions.deleteSession(client, sessionId, this.currentProjectDirectory)
  }

  async switchSession(sessionId: string): Promise<void> {
    if (!this.currentProjectDirectory) {
      throw new Error('No current project directory')
    }

    // Verify session exists by trying to get it
    const client = this.getClient()
    if (!client) {
      throw new Error('Client not connected to server')
    }

    // Normalize path to forward slashes for OpenCode API
    const normalizedPath = this.currentProjectDirectory?.replace(/\\/g, '/')

    const response = await client.session.get({
      path: { id: sessionId },
      query: normalizedPath ? { directory: normalizedPath } : undefined
    })

    // Check if we got a valid session
    if (!response) {
      throw new Error(`Session ${sessionId} not found`)
    }

    // Set as active session
    this.sessions.setActiveSession(sessionId, this.currentProjectDirectory)

    // Save to config
    if (this._config) {
      this._config.setProjectActiveSession(this.currentProjectDirectory, sessionId)
    }

    logChat('Switched to session: %s for project: %s', sessionId, this.currentProjectDirectory)
  }

  /**
   * Load the most recent session for the current project
   */
  async loadMostRecentSession(): Promise<void> {
    const client = this.getClient()
    if (!client || !this.currentProjectDirectory) {
      throw new Error('Cannot load session: client not connected or no project directory')
    }

    try {
      // First check if we have a saved active session for this project
      const savedSessionId = this._config?.getProjectActiveSession(this.currentProjectDirectory)

      if (savedSessionId) {
        log('Found saved active session: %s', savedSessionId)
        // Verify it still exists
        try {
          // Normalize path to forward slashes for OpenCode API
          const normalizedPath = this.currentProjectDirectory?.replace(/\\/g, '/')

          const response = await client.session.get({
            path: { id: savedSessionId },
            query: normalizedPath ? { directory: normalizedPath } : undefined
          })

          if (response) {
            this.sessions.setActiveSession(savedSessionId, this.currentProjectDirectory)
            log('Loaded saved session: %s', savedSessionId)
            return
          }
        } catch {
          // Saved session no longer exists, will load most recent
          log('Saved session no longer exists: %s', savedSessionId)
        }
      }

      // No saved session or it doesn't exist, list all sessions
      const sessions = await this.listSessions()

      if (sessions.length > 0) {
        // Use the first session (they're already ordered by the backend)
        // In the future we could sort by lastActive if we add that to the return type
        const mostRecent = sessions[0]
        this.sessions.setActiveSession(mostRecent.id, this.currentProjectDirectory)

        // Save to config
        if (this._config) {
          this._config.setProjectActiveSession(this.currentProjectDirectory, mostRecent.id)
        }

        log('Loaded most recent session: %s', mostRecent.id)
      } else {
        log('No sessions found for project')
      }
    } catch (error) {
      log('ERROR: Failed to load most recent session: %o', error)
      throw error
    }
  }

  // Get the current project status (global vs proper project)
  async getProjectStatus(): Promise<ProjectStatus | null> {
    if (!this.currentProjectDirectory) {
      return null
    }

    return this.projectInitializer.getProjectStatus(
      this.currentProjectDirectory,
      this.currentProjectId
    )
  }

  // Initialize a project with git and opencode.json
  async initializeProject(config?: OpencodeConfig): Promise<InitializationResult> {
    if (!this.currentProjectDirectory) {
      return {
        success: false,
        error: 'No project directory selected'
      }
    }

    log('Initializing project at: %s', this.currentProjectDirectory)
    const result = await this.projectInitializer.initializeProject(
      this.currentProjectDirectory,
      config
    )

    if (result.success) {
      log('Project initialized successfully, restarting server...')

      // Restart the server to pick up the new git repository
      await this.server.stopServerForDirectory(this.currentProjectDirectory)

      // Small delay for cleanup
      await new Promise((resolve) => setTimeout(resolve, 1000))

      // Start new server (will now recognize the project)
      const serverInstance = await this.server.getOrCreateServer(this.currentProjectDirectory)

      // Reconnect client
      await this.connectClient(this.currentProjectDirectory)

      // Check project status again
      try {
        const normalizedPath = this.currentProjectDirectory.replace(/\\/g, '/')
        const response = await fetch(
          `${serverInstance.server.url}/project/current?directory=${encodeURIComponent(normalizedPath)}`
        )
        const current = await response.json()
        this.currentProjectId = current?.id
        log('Project now recognized as: %s', current?.id)
      } catch (error) {
        log('WARNING: Could not verify project after initialization: %o', error)
      }
    }

    return result
  }

  // Get all running servers info
  getAllServers(): Array<{ directory: string; port: number; url: string; isHealthy: boolean }> {
    return this.server.getAllServers()
  }
}

export default Toji
