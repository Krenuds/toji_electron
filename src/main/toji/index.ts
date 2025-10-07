// Minimal Toji implementation with multi-server OpenCode SDK usage
import { EventEmitter } from 'events'
import type {
  OpencodeClient,
  Part,
  Message,
  Project,
  Provider,
  Event,
  TextPartInput,
  FilePartInput
} from '@opencode-ai/sdk'
import type { OpenCodeService } from '../services/opencode-service'
import type { ConfigProvider } from '../config/ConfigProvider'
import { ProjectManager } from './project'
import { ServerManager } from './server'
import { SessionManager } from './sessions'
import { ProjectInitializer } from './project-initializer'
import { ConfigManager } from './config-manager'
import { ClientManager } from './client-manager'
import { McpManager } from './mcp'
import type { ProjectStatus, InitializationResult } from './project-initializer'
import type {
  ServerStatus,
  Session,
  StreamCallbacks,
  ToolEvent,
  ToolState,
  ImageAttachment
} from './types'
import type {
  OpencodeConfig,
  PermissionConfig,
  PermissionType,
  PermissionLevel,
  ModelConfig
} from './config'
import { createLogger } from '../utils/logger'
import { imageToFilePart } from './image-utils'
import { parseFileAttachments } from './attachment-parser'

const logger = createLogger('toji:core')
const loggerClient = createLogger('toji:client')
const loggerChat = createLogger('toji:chat')

const DEFAULT_PERMISSION_TEMPLATE: PermissionConfig = {
  edit: 'ask',
  bash: 'ask',
  webfetch: 'ask'
}

type ConfigProvidersResponse = {
  providers: Provider[]
  default: Record<string, string>
}

// Define typed events emitted by Toji
interface TojiEvents {
  'project:opened': { path: string; name: string }
  'project:closed': { path: string }
}

export class Toji extends EventEmitter {
  // Type-safe emit method
  emit<K extends keyof TojiEvents>(event: K, data: TojiEvents[K]): boolean {
    return super.emit(event, data)
  }

  // Type-safe on method
  on<K extends keyof TojiEvents>(event: K, listener: (data: TojiEvents[K]) => void): this {
    return super.on(event, listener)
  }

  // Type-safe once method
  once<K extends keyof TojiEvents>(event: K, listener: (data: TojiEvents[K]) => void): this {
    return super.once(event, listener)
  }

  // Type-safe off method
  off<K extends keyof TojiEvents>(event: K, listener: (data: TojiEvents[K]) => void): this {
    return super.off(event, listener)
  }
  private currentProjectDirectory?: string
  private currentProjectId?: string
  private _config?: ConfigProvider
  // private globalConfig: OpencodeConfig = defaultOpencodeConfig // Reserved for future use

  // Public modules
  public project: ProjectManager
  public readonly server: ServerManager
  public readonly sessions: SessionManager
  public readonly projectInitializer: ProjectInitializer
  public readonly configManager: ConfigManager
  public readonly clientManager: ClientManager
  public readonly mcp: McpManager

  constructor(opencodeService: OpenCodeService, config?: ConfigProvider) {
    super() // Initialize EventEmitter
    logger.info('Initializing Toji with OpenCode service')
    this._config = config
    // Initialize modules
    this.server = new ServerManager(opencodeService)
    this.sessions = new SessionManager()
    this.clientManager = new ClientManager(this.server)
    this.mcp = new McpManager()
    this.project = new ProjectManager(() => this.getClient())
    this.projectInitializer = new ProjectInitializer()
    this.configManager = new ConfigManager(
      () => this.getClient(),
      () => this.currentProjectDirectory,
      async (config, dir) => {
        await this.server.restart(config, dir)
      },
      (dir) => this.connectClient(dir)
    )

    // Configure MCP with session dependencies for tools like clear_and_start_session
    this.mcp.setSessionDependencies(
      () => this.getClient() || null,
      () => this.currentProjectDirectory,
      this.sessions
    )

    // Configure MCP with Toji instance for project initialization tool
    this.mcp.setTojiInstance(() => this)

    logger.info('Toji initialized successfully')
  }

  // ========================================================================================
  // Service Registry (replaces old setters)
  // ========================================================================================

  private mcpServices = new Map<string, unknown>()

  /**
   * Register an MCP service for tool access
   */
  registerMCPService<T>(name: string, service: T): void {
    this.mcpServices.set(name, service)
    this.mcp.registerService(name, service)
    logger.debug(`Registered MCP service: ${name}`)
  }

  /**
   * Get registered MCP service
   */
  getMCPService<T>(name: string): T | undefined {
    return this.mcpServices.get(name) as T | undefined
  }

  /**
   * Check if MCP service is registered
   */
  hasMCPService(name: string): boolean {
    return this.mcpServices.has(name)
  }

  async getServerStatus(): Promise<ServerStatus> {
    return this.server.getStatus()
  }

  // Connect a client to a specific server
  async connectClient(directory?: string): Promise<void> {
    const targetDirectory = directory || process.cwd()
    loggerClient.debug('Connecting client for directory: %s', targetDirectory)

    // Create MCP server and register it via ConfigManager
    try {
      const mcpInstance = await this.mcp.createServerForProject({
        projectDirectory: targetDirectory
      })
      logger.debug(
        'MCP server created on port %d for project: %s',
        mcpInstance.port,
        targetDirectory
      )

      // Register MCP in opencode.json via ConfigManager (single source of truth)
      await this.configManager.registerMcpServer(targetDirectory, mcpInstance.port)
      logger.debug('MCP server registered in opencode.json for: %s', targetDirectory)
    } catch (error) {
      logger.warn('Failed to create/register MCP server: %o', error)
      // Don't throw - MCP is optional functionality
    }

    // Connect client through ClientManager (this starts OpenCode server)
    await this.clientManager.connectClient(targetDirectory)

    // Set current directory
    this.currentProjectDirectory = targetDirectory
    loggerClient.info('Current project directory set to: %s', this.currentProjectDirectory)

    // Sync API keys with OpenCode server after connection
    try {
      await this.syncApiKeys()
      logger.debug('API keys synced with OpenCode server')
    } catch (error) {
      logger.warn('Failed to sync API keys: %o', error)
      // Don't throw - API key sync failure shouldn't prevent connection
    }

    // Note: ProjectManager already uses getClient() callback, no need to recreate it
  }

  // Get client for current or specific directory
  private getClient(directory?: string): OpencodeClient | undefined {
    const targetDir = directory || this.currentProjectDirectory || process.cwd()
    return this.clientManager.getClient(targetDir)
  }

  // Change working directory (for project context)
  async changeWorkingDirectory(directory: string): Promise<void> {
    loggerClient.debug('Changing working directory to: %s', directory)

    // Validate directory exists
    const fs = await import('fs')
    try {
      await fs.promises.access(directory, fs.constants.R_OK)
    } catch {
      throw new Error(`Cannot access directory: ${directory}`)
    }

    // CRITICAL: Change Node.js process working directory
    process.chdir(directory)
    loggerClient.debug('Changed process.cwd() to: %s', process.cwd())

    // Update the current project directory
    this.currentProjectDirectory = directory
    loggerClient.info('Project directory set to: %s', directory)

    // Note: MCP server is created in connectClient(), not here
    // This method just changes the working directory and updates config

    // Save as current project in config
    const config = this._config
    if (config) {
      config.setCurrentProjectPath(directory)
      config.addRecentProject(directory)
      loggerClient.debug('Saved current project to config')
    }

    // Emit project opened event
    const projectName = directory.split(/[\\/]/).pop() || directory
    this.emit('project:opened', {
      path: directory,
      name: projectName
    })
    loggerClient.info('Emitted project:opened event for: %s', projectName)
  }

  // Check if ready
  isReady(): boolean {
    const client = this.getClient()
    return Boolean(this.server.isRunning() && client)
  }

  /**
   * Parse @filename attachments from message if enabled
   * @private
   */
  private parseMessageAttachments(
    message: string,
    parseAttachments: boolean,
    images?: ImageAttachment[]
  ): { message: string; images?: ImageAttachment[] } {
    if (parseAttachments && !images) {
      const parsed = parseFileAttachments(message, this.currentProjectDirectory)
      loggerChat.debug('Parsed %d attachments from message', parsed.images.length)
      return { message: parsed.cleanMessage, images: parsed.images }
    }
    return { message, images }
  }

  // Chat with the AI using session management
  async chat(
    message: string,
    sessionId?: string,
    images?: ImageAttachment[],
    parseAttachments = true
  ): Promise<string> {
    const client = this.getClient()
    if (!client) {
      const error = new Error('Client not connected to server')
      loggerChat.error('Chat failed - no client connected: %s', error.message)
      throw error
    }

    // Parse @filename attachments if enabled
    const parsed = this.parseMessageAttachments(message, parseAttachments, images)
    message = parsed.message
    images = parsed.images

    loggerChat.debug(
      'Chat request: message="%s", sessionId=%s, images=%d, parseAttachments=%s',
      message,
      sessionId || 'auto',
      images?.length || 0,
      parseAttachments
    )

    try {
      // Get or create session using SessionManager
      let activeSessionId = sessionId
      if (!activeSessionId && this.currentProjectDirectory) {
        activeSessionId = this.sessions.getActiveSession(this.currentProjectDirectory)
      }

      if (!activeSessionId) {
        loggerChat.debug(
          'Creating new session for project: %s',
          this.currentProjectDirectory || 'unknown'
        )
        const sessionInfo = await this.sessions.createSession(
          client,
          undefined, // title
          this.currentProjectDirectory
        )
        activeSessionId = sessionInfo.id
        if (this.currentProjectDirectory) {
          this.sessions.setActiveSession(activeSessionId, this.currentProjectDirectory)
        }
        loggerChat.debug('Created session: %s', activeSessionId)
      }

      // Build parts array with text and optional images
      const parts: Array<TextPartInput | FilePartInput> = []

      // Add image parts first if provided
      if (images && images.length > 0) {
        loggerChat.debug('Converting %d images to FileParts', images.length)
        for (const image of images) {
          const filePart = await imageToFilePart(image.path, image.mimeType)
          parts.push(filePart as FilePartInput)
        }
      }

      // Add text message
      parts.push({ type: 'text', text: message } as TextPartInput)

      // Send message to session
      loggerChat.debug('Sending message to session %s with %d parts', activeSessionId, parts.length)
      const response = await client.session.prompt({
        path: { id: activeSessionId },
        body: {
          parts
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

      loggerChat.debug(
        'Chat response received: %d characters - %s',
        responseText.length,
        responseText.substring(0, 200) + (responseText.length > 200 ? '...' : '')
      )
      return responseText
    } catch (error) {
      loggerChat.error('Chat failed: %o', error)
      throw error
    }
  }

  // Chat with streaming responses (event-driven)
  async chatStreaming(
    message: string,
    callbacks: StreamCallbacks,
    sessionId?: string,
    images?: ImageAttachment[],
    parseAttachments = true
  ): Promise<void> {
    const client = this.getClient()
    if (!client) {
      const error = new Error('Client not connected to server')
      loggerChat.error('Streaming chat failed - no client connected: %s', error.message)
      if (callbacks.onError) {
        await callbacks.onError(error)
      }
      throw error
    }

    // Parse @filename attachments if enabled
    const parsed = this.parseMessageAttachments(message, parseAttachments, images)
    message = parsed.message
    images = parsed.images

    loggerChat.debug(
      'Streaming chat request: sessionId=%s, images=%d, parseAttachments=%s',
      sessionId || 'auto',
      images?.length || 0,
      parseAttachments
    )

    try {
      // Get or create session using SessionManager
      let activeSessionId = sessionId
      if (!activeSessionId && this.currentProjectDirectory) {
        activeSessionId = this.sessions.getActiveSession(this.currentProjectDirectory)
      }

      if (!activeSessionId) {
        loggerChat.debug(
          'Creating new session for project: %s',
          this.currentProjectDirectory || 'unknown'
        )
        const sessionInfo = await this.sessions.createSession(
          client,
          undefined, // title
          this.currentProjectDirectory
        )
        activeSessionId = sessionInfo.id
        if (this.currentProjectDirectory) {
          this.sessions.setActiveSession(activeSessionId, this.currentProjectDirectory)
        }
        loggerChat.info('Created session: %s', activeSessionId)
      }

      // Subscribe to events FIRST
      const eventPromise = this.subscribeToSessionEvents(activeSessionId, callbacks)

      // Build parts array with text and optional images
      const parts: Array<TextPartInput | FilePartInput> = []

      // Add image parts first if provided
      if (images && images.length > 0) {
        loggerChat.debug('Converting %d images to FileParts', images.length)
        for (const image of images) {
          const filePart = await imageToFilePart(image.path, image.mimeType)
          parts.push(filePart as FilePartInput)
        }
      }

      // Add text message
      parts.push({ type: 'text', text: message } as TextPartInput)

      // Send message to session (this will trigger events)
      loggerChat.debug('Sending message to session %s with %d parts', activeSessionId, parts.length)
      await client.session.prompt({
        path: { id: activeSessionId },
        body: {
          parts
        },
        query: this.currentProjectDirectory
          ? { directory: this.currentProjectDirectory }
          : undefined
      })

      // Wait for events to complete
      await eventPromise
    } catch (error) {
      loggerChat.debug('ERROR: Streaming chat failed: %o', error)
      if (callbacks.onError) {
        await callbacks.onError(error instanceof Error ? error : new Error(String(error)))
      }
      throw error
    }
  }

  // Subscribe to OpenCode events for a specific session
  private async subscribeToSessionEvents(
    sessionId: string,
    callbacks: StreamCallbacks
  ): Promise<void> {
    const client = this.getClient()
    if (!client) {
      throw new Error('Client not connected to server')
    }

    loggerChat.debug('Subscribing to events for session: %s', sessionId)

    try {
      const events = await client.event.subscribe({
        query: this.currentProjectDirectory
          ? { directory: this.currentProjectDirectory }
          : undefined
      })

      let fullText = ''
      let isComplete = false

      for await (const event of events.stream) {
        // Type assertion for the event
        const typedEvent = event as Event

        // Only process events for our session
        if ('sessionID' in typedEvent.properties && typedEvent.properties.sessionID !== sessionId) {
          continue
        }

        switch (typedEvent.type) {
          case 'message.part.updated': {
            // Extract part from event
            const partEvent = typedEvent as {
              type: 'message.part.updated'
              properties: { part: Part }
            }
            const part = partEvent.properties.part

            if (part.type === 'text') {
              const textPart = part as { type: 'text'; text: string; id: string }
              // IMPORTANT: part.text is CUMULATIVE, not a delta!
              // We just store it, don't append
              fullText = textPart.text

              if (callbacks.onChunk) {
                await callbacks.onChunk(textPart.text, textPart.id)
              }
            } else if (part.type === 'tool') {
              // Handle tool usage events
              const toolPart = part as {
                type: 'tool'
                id: string
                callID: string
                tool: string
                state: ToolState
                sessionID: string
                messageID: string
              }
              loggerChat.debug(
                'Tool event: %s - %s (status: %s)',
                toolPart.tool,
                toolPart.callID,
                toolPart.state.status
              )

              if (callbacks.onTool) {
                const toolEvent: ToolEvent = {
                  id: toolPart.id,
                  callID: toolPart.callID,
                  tool: toolPart.tool,
                  state: toolPart.state,
                  sessionID: toolPart.sessionID,
                  messageID: toolPart.messageID
                }
                if (callbacks.onTool) {
                  await callbacks.onTool(toolEvent)
                }
              }
            }
            break
          }

          case 'message.updated': {
            // Message complete
            break
          }

          case 'session.idle': {
            // Session is idle - response complete
            const idleEvent = typedEvent as {
              type: 'session.idle'
              properties: { sessionID: string }
            }
            if (idleEvent.properties.sessionID === sessionId) {
              loggerChat.debug(
                'Session idle - response complete: %d chars - %s',
                fullText.length,
                fullText.substring(0, 200) + (fullText.length > 200 ? '...' : '')
              )
              isComplete = true

              if (callbacks.onComplete) {
                await callbacks.onComplete(fullText)
              }

              // Exit the event loop
              return
            }
            break
          }

          case 'session.error': {
            // Handle errors
            const errorEvent = typedEvent as {
              type: 'session.error'
              properties: { sessionID?: string; error?: unknown }
            }
            if (errorEvent.properties.sessionID === sessionId) {
              loggerChat.debug('Session error event: %o', errorEvent.properties.error)
              const error = new Error(
                'Session error: ' + JSON.stringify(errorEvent.properties.error)
              )
              if (callbacks.onError) {
                await callbacks.onError(error)
              }
              throw error
            }
            break
          }

          default:
            // Unknown event type
            break
        }
      }

      // If we exit the loop without seeing session.idle, still call onComplete
      if (!isComplete && callbacks.onComplete && fullText) {
        await callbacks.onComplete(fullText)
      }
    } catch (error) {
      loggerChat.error('Event subscription failed: %o', error)
      throw error
    }
  }

  // Clear current session (start fresh conversation)
  clearSession(): void {
    if (this.currentProjectDirectory) {
      const activeSessionId = this.sessions.getActiveSession(this.currentProjectDirectory)
      loggerChat.debug('Clearing current session: %s', activeSessionId || 'none')
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
      loggerChat.debug('ERROR: Failed to get session messages: %o', error)
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
  setGlobalConfig(): void {
    // TODO: Implement global config if needed
  }

  // Get available projects (from OpenCode SDK)
  async getAvailableProjects(): Promise<Array<Project>> {
    const client = this.getClient()
    if (!client) {
      logger.debug('Client not connected, returning empty project list')
      return []
    }
    // Update project manager to use current client
    this.project = new ProjectManager(() => client)
    return this.project.list()
  }

  // Switch to a project (uses multi-server architecture)
  async switchToProject(projectPath: string): Promise<{ success: boolean; projectPath: string }> {
    logger.debug('Switching to project: %s', projectPath)

    // CRITICAL: Check if projectPath ends with .git and fix it
    if (projectPath.endsWith('/.git') || projectPath.endsWith('\\.git')) {
      const originalPath = projectPath
      projectPath = projectPath.replace(/[/\\]\.git$/, '')
      logger.debug(
        'WARNING: Project path had .git suffix, corrected from %s to %s',
        originalPath,
        projectPath
      )
    }

    try {
      // Get or create server for this project directory
      logger.debug('Getting or creating server for project: %s', projectPath)
      const serverInstance = await this.server.getOrCreateServer(projectPath)
      logger.info('Server ready on port %d for %s', serverInstance.port, projectPath)

      // Update the project directory and process.chdir()
      await this.changeWorkingDirectory(projectPath)

      // Connect client to the appropriate server
      await this.connectClient(projectPath)

      // Check if project is properly discovered by OpenCode
      const client = this.getClient(projectPath)
      if (client) {
        const normalizedPath = projectPath.replace(/\\/g, '/')
        logger.debug('Checking project discovery for: %s', normalizedPath)

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
            logger.warn('Project not discovered (global project), limited functionality available')
            // Don't try to trigger discovery automatically - let user decide
          } else {
            logger.debug('Project already discovered: %s', current?.worktree)
          }
        } catch (error) {
          logger.warn('Could not check project discovery: %o', error)
        }
      }

      return {
        success: true,
        projectPath
      }
    } catch (error) {
      logger.error('Failed to switch to project %s: %o', projectPath, error)
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
        loggerChat.debug('Session %s not found', activeSessionId)
        return null
      }

      return {
        id: activeSessionId,
        directory: this.currentProjectDirectory
      }
    } catch (error) {
      loggerChat.debug('ERROR: Failed to get current session: %o', error)
      return null
    }
  }

  // Close the current project (stop server, clear client, reset state)
  async closeCurrentProject(): Promise<void> {
    logger.debug('Closing current project: %s', this.currentProjectDirectory || 'none')

    if (!this.currentProjectDirectory) {
      logger.warn('No current project to close')
      return
    }

    const projectToClose = this.currentProjectDirectory

    // Clear active session
    this.sessions.setActiveSession('', projectToClose)

    // Remove client through ClientManager
    this.clientManager.removeClient(projectToClose)

    // Close MCP server for this project
    try {
      await this.mcp.closeServer(projectToClose)
      logger.debug('Closed MCP server for %s', projectToClose)
    } catch (error) {
      logger.debug('Warning: Failed to close MCP server: %o', error)
    }

    // Stop the server for this directory
    await this.server.stopServerForDirectory(projectToClose)
    logger.debug('Stopped server for %s', projectToClose)

    // Clear current project directory
    this.currentProjectDirectory = undefined
    this.currentProjectId = undefined

    // Clear from config
    if (this._config) {
      this._config.setCurrentProjectPath('')
      logger.debug('Cleared current project from config')
    }

    // CRITICAL: Reconnect to a default global server
    // This ensures the project list remains accessible
    try {
      // Use the app's install directory as the default global location
      // This ensures we have a consistent "global" server for project discovery
      const { app } = await import('electron')
      const globalDirectory = app.getPath('userData') // AppData/Roaming/toji3

      logger.debug('Reconnecting to global server at: %s', globalDirectory)

      // Connect to global server (this will create one if needed)
      await this.connectClient(globalDirectory)

      // Set the currentProjectId to 'global' to indicate we're in global mode
      this.currentProjectId = 'global'

      logger.debug('Successfully connected to global server')
    } catch (error) {
      logger.debug('ERROR: Failed to connect to global server: %o', error)
      // Don't throw here - we've at least closed the project
    }

    // Emit project closed event
    this.emit('project:closed', {
      path: projectToClose
    })
    logger.info('Emitted project:closed event for: %s', projectToClose)
  }

  // Session management methods for IPC
  async listSessions(): Promise<Session[]> {
    const client = this.getClient()
    if (!client) {
      throw new Error('Client not connected to server')
    }

    const sessions = await this.sessions.listSessions(client, this.currentProjectDirectory)
    return sessions
  }

  async createSession(title?: string): Promise<Session> {
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

    loggerChat.debug(
      'Switched to session: %s for project: %s',
      sessionId,
      this.currentProjectDirectory
    )
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
        logger.debug('Found saved active session: %s', savedSessionId)
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
            logger.debug('Loaded saved session: %s', savedSessionId)
            return
          }
        } catch {
          // Saved session no longer exists, will load most recent
          logger.warn('Saved session no longer exists: %s', savedSessionId)
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

        logger.info('Loaded most recent session: %s', mostRecent.id)
      } else {
        logger.debug('No sessions found for project')
      }
    } catch (error) {
      logger.error('Failed to load most recent session: %o', error)
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

    logger.debug('Initializing project at: %s', this.currentProjectDirectory)
    const result = await this.projectInitializer.initializeProject(
      this.currentProjectDirectory,
      config
    )

    if (result.success) {
      logger.info('Project initialized successfully, restarting server...')

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
        logger.debug('Project now recognized as: %s', current?.id)
      } catch (error) {
        logger.warn('Could not verify project after initialization: %o', error)
      }
    }

    return result
  }

  // Get all running servers info
  getAllServers(): Array<{ directory: string; port: number; url: string; isHealthy: boolean }> {
    return this.server.getAllServers()
  }

  // Get current project's configuration from OpenCode
  async getProjectConfig(): Promise<OpencodeConfig> {
    return this.configManager.getProjectConfig()
  }

  // Update project configuration and restart server
  async updateProjectConfig(config: OpencodeConfig): Promise<void> {
    return this.configManager.updateProjectConfig(config)
  }

  // Get current permissions from project configuration
  async getPermissions(): Promise<PermissionConfig> {
    return this.configManager.getPermissions()
  }

  // Update permissions by merging with existing configuration
  async updatePermissions(permissions: Partial<PermissionConfig>): Promise<void> {
    return this.configManager.updatePermissions(permissions)
  }

  // Set a single permission (convenience method)
  async setPermission(type: PermissionType, level: PermissionLevel): Promise<void> {
    return this.configManager.setPermission(type, level)
  }

  // Get available model providers from OpenCode
  async getModelProviders(): Promise<ConfigProvidersResponse> {
    const client = this.getClient()
    if (!client) {
      logger.error('No client connected to server')
      throw new Error('Client not connected to server')
    }

    const raw = await client.config.providers()
    const response =
      raw && typeof raw === 'object' && 'data' in raw
        ? (raw as { data: ConfigProvidersResponse }).data
        : (raw as ConfigProvidersResponse)

    const providerCount = response?.providers?.length ?? 0
    const totalModels =
      response?.providers?.reduce((sum, p) => sum + Object.keys(p.models || {}).length, 0) ?? 0
    logger.debug(
      'Retrieved %d providers with %d models: [%s]',
      providerCount,
      totalModels,
      response?.providers?.map((p) => p.id).join(', ') || 'none'
    )

    return {
      providers: Array.isArray(response?.providers) ? response.providers : [],
      default: response?.default ?? {}
    }
  }

  // Get current project model selection (primary + optional small model)
  async getModelConfig(): Promise<ModelConfig> {
    logger.debug('Getting current project model configuration')
    try {
      const config = await this.configManager.getModelConfig()
      logger.debug('Retrieved project model config: %o', config)
      return config
    } catch (error) {
      logger.error('Failed to get project model config: %o', error)
      throw error
    }
  }

  // Update project model selection and restart server
  async updateModelConfig(selection: Partial<ModelConfig>): Promise<void> {
    logger.debug('Updating project model configuration: %o', selection)
    try {
      await this.configManager.updateModelConfig(selection)
      logger.info('Project model configuration updated successfully')
    } catch (error) {
      logger.error('Failed to update project model config: %o', error)
      throw error
    }
  }

  // Get default permissions template used for new projects
  async getDefaultPermissions(): Promise<PermissionConfig> {
    const config = this._config
    if (!config) {
      return DEFAULT_PERMISSION_TEMPLATE
    }
    return config.getDefaultOpencodePermissions()
  }

  // Update default permissions template and return the result
  async updateDefaultPermissions(
    permissions: Partial<PermissionConfig>
  ): Promise<PermissionConfig> {
    const config = this._config
    if (!config) {
      throw new Error('Config provider not initialized')
    }
    return config.setDefaultOpencodePermissions(permissions)
  }

  // ==========================================
  // OpenCode API Key Management
  // ==========================================

  /**
   * Register API key with OpenCode server
   * This makes the provider available for model selection
   */
  async registerApiKey(providerId: string, apiKey: string): Promise<void> {
    const client = this.getClient()
    if (!client) {
      logger.error('No client connected to server')
      throw new Error('Client not connected to server')
    }

    try {
      await client.auth.set({
        path: { id: providerId },
        body: {
          type: 'api',
          key: apiKey
        }
      })
      logger.info('Successfully registered API key for provider: %s', providerId)
    } catch (error) {
      logger.error('Failed to register API key for %s: %o', providerId, error)
      throw error
    }
  }

  /**
   * Sync all stored API keys with OpenCode server
   * Useful after server restart or project change
   */
  async syncApiKeys(): Promise<void> {
    const config = this._config
    if (!config) {
      logger.warn('No config provider, skipping API key sync')
      return
    }

    const providers = config.getConfiguredProviders()
    if (providers.length === 0) {
      return
    }

    logger.debug('Syncing %d API keys: [%s]', providers.length, providers.join(', '))

    for (const providerId of providers) {
      const apiKey = config.getOpencodeApiKey(providerId)
      if (apiKey) {
        try {
          await this.registerApiKey(providerId, apiKey)
        } catch (error) {
          logger.warn('Failed to sync API key for %s: %o', providerId, error)
          // Continue with other providers even if one fails
        }
      } else {
        logger.warn('No API key found for provider: %s', providerId)
      }
    }
    logger.debug('API key synchronization complete')
  }
}

export default Toji
