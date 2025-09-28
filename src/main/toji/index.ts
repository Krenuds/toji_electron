// Minimal Toji implementation with direct OpenCode SDK usage
import { createOpencodeClient } from '@opencode-ai/sdk'
import type { OpencodeClient, Part, Message } from '@opencode-ai/sdk'
import type { OpenCodeService } from '../services/opencode-service'
import type { ConfigProvider } from '../config/ConfigProvider'
import { ProjectManager } from './project'
import { ServerManager } from './server'
import { SessionManager } from './sessions'
import type { ServerStatus } from './types'
import { defaultOpencodeConfig } from './config'
import type { OpencodeConfig } from './config'
import { createFileDebugLogger } from '../utils/logger'
import { BrowserWindow } from 'electron'

const log = createFileDebugLogger('toji:core')
const logClient = createFileDebugLogger('toji:client')
const logChat = createFileDebugLogger('toji:chat')

export class Toji {
  private client?: OpencodeClient
  private currentProjectDirectory?: string
  private globalConfig: OpencodeConfig = defaultOpencodeConfig
  private originalCwd: string = process.cwd()

  // Public modules
  public readonly project: ProjectManager
  public readonly server: ServerManager
  public readonly sessions: SessionManager

  constructor(opencodeService: OpenCodeService, config?: ConfigProvider) {
    log('Initializing Toji with OpenCode service and config')
    // Initialize modules
    this.server = new ServerManager(opencodeService, config)
    this.sessions = new SessionManager()
    this.project = new ProjectManager(() => this.client)
    log('Toji initialized successfully')
  }

  async getServerStatus(): Promise<ServerStatus> {
    return this.server.getStatus()
  }

  // Connect the client to the server
  async connectClient(): Promise<void> {
    logClient('Attempting to connect client to default server')
    const serverUrl = this.server.getUrl()
    if (!serverUrl) {
      const error = new Error('Server not started')
      logClient('ERROR: %s', error.message)
      throw error
    }

    // Set default project directory to cwd if not already set
    if (!this.currentProjectDirectory) {
      this.currentProjectDirectory = process.cwd()
      logClient('Setting initial project directory to cwd: %s', this.currentProjectDirectory)
    }

    logClient('Connecting to server URL: %s', serverUrl)
    this.client = createOpencodeClient({
      baseUrl: serverUrl
    })
    logClient('Client connected successfully to %s', serverUrl)
  }

  // Connect the client to a specific project's server
  async connectClientToProject(directory: string): Promise<void> {
    logClient('Attempting to connect client to project: %s', directory)
    const serverUrl = this.server.getUrlForProject(directory)
    if (!serverUrl) {
      const error = new Error(`No server running for project: ${directory}`)
      logClient('ERROR: %s', error.message)
      throw error
    }

    // Handle session state when changing projects
    if (this.currentProjectDirectory !== directory) {
      logClient(
        'Project changed from %s to %s, managing session state',
        this.currentProjectDirectory || 'none',
        directory
      )
      this.currentProjectDirectory = directory
      // SessionManager will handle session restoration for this project
    }

    logClient('Connecting to project server URL: %s', serverUrl)
    this.client = createOpencodeClient({
      baseUrl: serverUrl
    })
    logClient('Client connected successfully to project %s at %s', directory, serverUrl)

    // Verify project appears in SDK project list (projects auto-register when server starts)
    try {
      interface ProjectInfo {
        worktree: string
        // add other properties if needed
      }
      const projects = await this.client.project.list()
      const projectExists = projects.data?.some((p: ProjectInfo) => p.worktree === directory)
      if (projectExists) {
        logClient('Project confirmed in OpenCode SDK: %s', directory)
      } else {
        logClient('Project not yet visible in SDK list: %s', directory)
      }
    } catch (error) {
      logClient('Warning: Could not verify project in SDK: %o', error)
    }

    // Restore the most recent session for this project
    await this.restoreProjectSession(directory)

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

  // Restore the most recent session for a project
  private async restoreProjectSession(directory: string): Promise<void> {
    if (!this.client) {
      logClient('Cannot restore session: client not connected')
      return
    }

    try {
      logClient('Attempting to restore previous session for project: %s', directory)

      // Get existing sessions for this project
      const sessions = await this.sessions.listSessions(this.client, directory)

      if (sessions.length === 0) {
        logClient('No existing sessions found for project: %s', directory)
        return
      }

      // Find the most recent session (by lastActive date)
      const mostRecentSession = sessions.reduce((latest, current) => {
        if (!latest.lastActive) return current
        if (!current.lastActive) return latest
        return current.lastActive > latest.lastActive ? current : latest
      })

      // Set as active session
      this.sessions.setActiveSession(mostRecentSession.id, directory)

      logClient(
        'Restored session: %s (%s) for project: %s',
        mostRecentSession.id,
        mostRecentSession.title || 'untitled',
        directory
      )

      // Broadcast session restoration to all windows using existing pattern
      const mainWindow = BrowserWindow.getAllWindows()[0]
      if (mainWindow) {
        mainWindow.webContents.send('session:restored', {
          sessionId: mostRecentSession.id,
          title: mostRecentSession.title,
          projectPath: directory
        })
      }
    } catch (error) {
      logClient('Failed to restore session for project %s: %o', directory, error)
      // Don't throw - just continue without a restored session
    }
  }

  // Check if ready
  isReady(): boolean {
    return Boolean(this.server.isRunning() && this.client)
  }

  // Chat with the AI using session management
  async chat(message: string, sessionId?: string): Promise<string> {
    logChat('Chat request: message="%s", sessionId=%s', message, sessionId || 'auto')

    if (!this.client) {
      const error = new Error('Client not connected to any server')
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
          this.client,
          undefined, // title
          this.currentProjectDirectory
        )
        activeSessionId = sessionInfo.id
        if (this.currentProjectDirectory) {
          this.sessions.setActiveSession(activeSessionId, this.currentProjectDirectory)
        }
        logChat(
          'Created session: %s for project: %s',
          activeSessionId,
          this.currentProjectDirectory || 'unknown'
        )
      }

      // Send message to session
      logChat(
        'Sending message to session %s in project: %s',
        activeSessionId,
        this.currentProjectDirectory || 'unknown'
      )
      const response = await this.client.session.prompt({
        path: { id: activeSessionId },
        body: {
          parts: [{ type: 'text', text: message }]
        },
        query: this.currentProjectDirectory
          ? { directory: this.currentProjectDirectory }
          : undefined
      })

      if (response.error || !response.data) {
        throw new Error(`Failed to send message: ${response.error || 'No response data'}`)
      }

      // Extract text from response parts
      const responseText = response.data.parts
        .filter((part: Part) => part.type === 'text')
        .map((part: Part) => (part as { text: string }).text)
        .join('')

      logChat('Chat response received: %d characters', responseText.length)

      // Update session activity tracking
      if (this.currentProjectDirectory) {
        this.sessions.setActiveSession(activeSessionId, this.currentProjectDirectory)
      }

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
      logChat(
        'Clearing current session: %s for project: %s',
        activeSessionId || 'none',
        this.currentProjectDirectory
      )
      if (activeSessionId) {
        this.sessions.invalidateMessageCache(activeSessionId)
      }
      // Remove the active session reference (user will get a new session on next message)
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

    if (!this.client) {
      throw new Error('Client not connected to any server')
    }

    try {
      return await this.sessions.getSessionMessages(
        this.client,
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

  // Set global configuration
  setGlobalConfig(config: OpencodeConfig): void {
    this.globalConfig = config
    log('Updated global config: %o', config)
  }

  // Get available projects (from OpenCode SDK)
  async getAvailableProjects(): Promise<Array<Record<string, unknown>>> {
    if (!this.client) {
      log('Client not connected, returning empty project list')
      return []
    }
    return this.project.list()
  }

  // Switch to a project (changing CWD and starting server)
  async switchToProject(
    projectPath: string,
    configOverride?: Partial<OpencodeConfig>
  ): Promise<{ success: boolean; projectPath: string; port: number }> {
    log('Switching to project: %s with config override: %o', projectPath, configOverride)

    // Validate project directory exists and is accessible
    const fs = await import('fs')
    const path = await import('path')

    try {
      const absolutePath = path.resolve(projectPath)

      // Check if directory exists
      const stats = await fs.promises.stat(absolutePath)
      if (!stats.isDirectory()) {
        throw new Error(`Path is not a directory: ${absolutePath}`)
      }

      // Check read permission
      await fs.promises.access(absolutePath, fs.constants.R_OK)

      log('Validated project directory: %s', absolutePath)
    } catch (error) {
      log('ERROR: Invalid project directory: %o', error)
      throw new Error(
        `Invalid project directory: ${error instanceof Error ? error.message : String(error)}`
      )
    }

    try {
      // 1. Save current CWD (in case we need to restore)
      const previousCwd = process.cwd()
      log('Current CWD: %s', previousCwd)

      // 2. Change to project directory (critical for OpenCode discovery!)
      log('Changing CWD to: %s', projectPath)
      process.chdir(projectPath)

      // 3. Merge configs
      const config = { ...this.globalConfig, ...configOverride }
      log('Merged config for project: %o', config)

      // 4. Start server for this project (keeps others running)
      const port = await this.server.start(projectPath, config)
      log('Server started on port %d for project: %s', port, projectPath)

      // 5. Connect client to this project's server
      await this.connectClientToProject(projectPath)
      log('Client connected to project: %s', projectPath)

      // 6. Project will now appear in project.list() automatically!
      // OpenCode discovers it when the server starts in that directory

      return {
        success: true,
        projectPath,
        port
      }
    } catch (error) {
      log('ERROR: Failed to switch to project %s: %o', projectPath, error)
      // Restore CWD on error
      process.chdir(this.originalCwd)
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

    if (!this.client) {
      throw new Error('Client not connected to any server')
    }

    try {
      const response = await this.client.session.get({
        path: { id: activeSessionId },
        query: this.currentProjectDirectory
          ? { directory: this.currentProjectDirectory }
          : undefined
      })

      if (response.error || !response.data) {
        logChat('Session %s not found or error: %s', activeSessionId, response.error)
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

  // Session management methods for IPC
  async listSessions(): Promise<Array<{ id: string; title?: string; projectPath?: string }>> {
    if (!this.client) {
      throw new Error('Client not connected to any server')
    }

    const sessions = await this.sessions.listSessions(this.client, this.currentProjectDirectory)
    return sessions
  }

  async createSession(
    title?: string
  ): Promise<{ id: string; title?: string; projectPath?: string }> {
    if (!this.client) {
      throw new Error('Client not connected to any server')
    }

    const sessionInfo = await this.sessions.createSession(
      this.client,
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
    if (!this.client) {
      throw new Error('Client not connected to any server')
    }

    await this.sessions.deleteSession(this.client, sessionId, this.currentProjectDirectory)
  }

  async switchSession(sessionId: string): Promise<void> {
    if (!this.currentProjectDirectory) {
      throw new Error('No current project directory')
    }

    // Verify session exists by trying to get it
    if (!this.client) {
      throw new Error('Client not connected to any server')
    }

    const response = await this.client.session.get({
      path: { id: sessionId },
      query: { directory: this.currentProjectDirectory }
    })

    if (response.error) {
      throw new Error(`Session ${sessionId} not found: ${response.error}`)
    }

    // Set as active session
    this.sessions.setActiveSession(sessionId, this.currentProjectDirectory)
    logChat('Switched to session: %s for project: %s', sessionId, this.currentProjectDirectory)
  }
}

export default Toji
