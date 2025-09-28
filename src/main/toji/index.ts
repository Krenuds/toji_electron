// Minimal Toji implementation with direct OpenCode SDK usage
import { createOpencodeClient } from '@opencode-ai/sdk'
import type { OpencodeClient, Part, Message, Project } from '@opencode-ai/sdk'
import type { OpenCodeService } from '../services/opencode-service'
import type { ConfigProvider } from '../config/ConfigProvider'
import { ProjectManager } from './project'
import { ServerManager } from './server'
import { SessionManager } from './sessions'
import type { ServerStatus } from './types'
import type { OpencodeConfig } from './config'
import { createFileDebugLogger } from '../utils/logger'
import { BrowserWindow } from 'electron'

const log = createFileDebugLogger('toji:core')
const logClient = createFileDebugLogger('toji:client')
const logChat = createFileDebugLogger('toji:chat')

export class Toji {
  private client?: OpencodeClient
  private currentProjectDirectory?: string
  private _config?: ConfigProvider
  // private globalConfig: OpencodeConfig = defaultOpencodeConfig // Reserved for future use

  // Public modules
  public readonly project: ProjectManager
  public readonly server: ServerManager
  public readonly sessions: SessionManager

  constructor(opencodeService: OpenCodeService, config?: ConfigProvider) {
    log('Initializing Toji with OpenCode service')
    this._config = config
    // Initialize modules
    this.server = new ServerManager(opencodeService)
    this.sessions = new SessionManager()
    this.project = new ProjectManager(() => this.client)
    log('Toji initialized successfully')
  }

  async getServerStatus(): Promise<ServerStatus> {
    return this.server.getStatus()
  }

  // Connect the client to the server
  async connectClient(): Promise<void> {
    logClient('Connecting client to OpenCode server')
    const serverUrl = this.server.getUrl()
    if (!serverUrl) {
      const error = new Error('Server not started')
      logClient('ERROR: %s', error.message)
      throw error
    }

    logClient('Connecting to server URL: %s', serverUrl)
    this.client = createOpencodeClient({
      baseUrl: serverUrl,
      responseStyle: 'data' // Get data directly without wrapper
    })
    logClient('Client connected successfully to %s', serverUrl)

    // Set current directory as default
    this.currentProjectDirectory = process.cwd()
    logClient('Working directory set to: %s', this.currentProjectDirectory)
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

    // Change process working directory
    process.chdir(directory)
    this.currentProjectDirectory = directory
    logClient('Working directory changed to: %s', directory)

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
    return Boolean(this.server.isRunning() && this.client)
  }

  // Chat with the AI using session management
  async chat(message: string, sessionId?: string): Promise<string> {
    logChat('Chat request: message="%s", sessionId=%s', message, sessionId || 'auto')

    if (!this.client) {
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
          this.client,
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
      const response = await this.client.session.prompt({
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
        this.sessions.invalidateMessageCache(activeSessionId)
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

    if (!this.client) {
      throw new Error('Client not connected to server')
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
  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  setGlobalConfig(_config: OpencodeConfig): void {
    // TODO: Implement global config if needed
    log('setGlobalConfig called but not implemented in simplified version')
  }

  // Get available projects (from OpenCode SDK)
  async getAvailableProjects(): Promise<Array<Project>> {
    if (!this.client) {
      log('Client not connected, returning empty project list')
      return []
    }
    return this.project.list()
  }

  // Switch to a project (just changes working directory)
  async switchToProject(projectPath: string): Promise<{ success: boolean; projectPath: string }> {
    log('Switching to project: %s', projectPath)

    try {
      await this.changeWorkingDirectory(projectPath)

      // Check if project is properly discovered by OpenCode
      if (this.client) {
        const normalizedPath = projectPath.replace(/\\/g, '/')
        log('Checking project discovery for: %s', normalizedPath)

        // Try to get current project with the directory parameter
        try {
          const response = await fetch(
            `${this.server.getUrl()}/project/current?directory=${encodeURIComponent(normalizedPath)}`
          )
          const current = await response.json()

          // If project is assigned to "global", it wasn't properly discovered
          if (current?.id === 'global') {
            log('Project not discovered, attempting to trigger discovery...')

            // Create a session to trigger project discovery
            await this.client.session.create({
              body: { title: 'Initialize Project' },
              query: { directory: normalizedPath }
            })

            log('Created session to trigger project discovery')
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

    if (!this.client) {
      throw new Error('Client not connected to server')
    }

    try {
      // Normalize path to forward slashes for OpenCode API
      const normalizedPath = this.currentProjectDirectory?.replace(/\\/g, '/')

      const response = await this.client.session.get({
        path: { id: activeSessionId },
        query: normalizedPath
          ? { directory: normalizedPath }
          : undefined
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

  // Session management methods for IPC
  async listSessions(): Promise<Array<{ id: string; title?: string; projectPath?: string }>> {
    if (!this.client) {
      throw new Error('Client not connected to server')
    }

    const sessions = await this.sessions.listSessions(this.client, this.currentProjectDirectory)
    return sessions
  }

  async createSession(
    title?: string
  ): Promise<{ id: string; title?: string; projectPath?: string }> {
    if (!this.client) {
      throw new Error('Client not connected to server')
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
      throw new Error('Client not connected to server')
    }

    await this.sessions.deleteSession(this.client, sessionId, this.currentProjectDirectory)
  }

  async switchSession(sessionId: string): Promise<void> {
    if (!this.currentProjectDirectory) {
      throw new Error('No current project directory')
    }

    // Verify session exists by trying to get it
    if (!this.client) {
      throw new Error('Client not connected to server')
    }

    // Normalize path to forward slashes for OpenCode API
    const normalizedPath = this.currentProjectDirectory?.replace(/\\/g, '/')

    const response = await this.client.session.get({
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
    if (!this.client || !this.currentProjectDirectory) {
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

          const response = await this.client.session.get({
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
}

export default Toji
