// Minimal Toji implementation with direct OpenCode SDK usage
import { createOpencodeClient } from '@opencode-ai/sdk'
import type { OpencodeClient, Part, Message } from '@opencode-ai/sdk'
import type { OpenCodeService } from '../services/opencode-service'
import type { ConfigProvider } from '../config/ConfigProvider'
import { ProjectManager } from './project'
import { ServerManager } from './server'
import type { ServerStatus } from './types'
import { createFileDebugLogger } from '../utils/logger'

const log = createFileDebugLogger('toji:core')
const logClient = createFileDebugLogger('toji:client')
const logChat = createFileDebugLogger('toji:chat')

export class Toji {
  private client?: OpencodeClient
  private currentSessionId?: string
  private currentProjectDirectory?: string

  // Public modules
  public readonly project: ProjectManager
  public readonly server: ServerManager

  constructor(opencodeService: OpenCodeService, config?: ConfigProvider) {
    log('Initializing Toji with OpenCode service and config')
    // Initialize modules
    this.server = new ServerManager(opencodeService, config)
    this.project = new ProjectManager(() => this.client, this.server, config, this)
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

    // Clear session when changing projects
    if (this.currentProjectDirectory !== directory) {
      logClient(
        'Project changed from %s to %s, clearing session',
        this.currentProjectDirectory || 'none',
        directory
      )
      this.currentSessionId = undefined
      this.currentProjectDirectory = directory
    }

    logClient('Connecting to project server URL: %s', serverUrl)
    this.client = createOpencodeClient({
      baseUrl: serverUrl
    })
    logClient('Client connected successfully to project %s at %s', directory, serverUrl)
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
      // Get or create session
      let activeSessionId = sessionId || this.currentSessionId
      if (!activeSessionId) {
        logChat('Creating new session for project: %s', this.currentProjectDirectory || 'unknown')
        const sessionResponse = await this.client.session.create({
          query: this.currentProjectDirectory
            ? { directory: this.currentProjectDirectory }
            : undefined
        })
        if (sessionResponse.error) {
          throw new Error(`Failed to create session: ${sessionResponse.error}`)
        }
        activeSessionId = sessionResponse.data.id
        this.currentSessionId = activeSessionId
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
      return responseText
    } catch (error) {
      logChat('ERROR: Chat failed: %o', error)
      throw error
    }
  }

  // Clear current session (start fresh conversation)
  clearSession(): void {
    logChat(
      'Clearing current session: %s for project: %s',
      this.currentSessionId || 'none',
      this.currentProjectDirectory || 'unknown'
    )
    this.currentSessionId = undefined
  }

  // Get message history for a session
  async getSessionMessages(sessionId?: string): Promise<Array<{ info: Message; parts: Part[] }>> {
    const activeSessionId = sessionId || this.currentSessionId
    if (!activeSessionId) {
      logChat('No session ID provided or current session available')
      return []
    }

    if (!this.client) {
      throw new Error('Client not connected to any server')
    }

    try {
      logChat(
        'Fetching message history for session: %s in project: %s',
        activeSessionId,
        this.currentProjectDirectory || 'unknown'
      )

      const response = await this.client.session.messages({
        path: { id: activeSessionId },
        query: this.currentProjectDirectory
          ? { directory: this.currentProjectDirectory }
          : undefined
      })

      if (response.error || !response.data) {
        throw new Error(`Failed to get session messages: ${response.error || 'No response data'}`)
      }

      logChat('Retrieved %d messages from session: %s', response.data.length, activeSessionId)
      return response.data
    } catch (error) {
      logChat('ERROR: Failed to get session messages: %o', error)
      throw error
    }
  }

  // Get current session ID
  getCurrentSessionId(): string | undefined {
    return this.currentSessionId
  }

  // Get current session info
  async getCurrentSession(): Promise<{ id: string; directory?: string } | null> {
    if (!this.currentSessionId) {
      return null
    }

    if (!this.client) {
      throw new Error('Client not connected to any server')
    }

    try {
      const response = await this.client.session.get({
        path: { id: this.currentSessionId },
        query: this.currentProjectDirectory
          ? { directory: this.currentProjectDirectory }
          : undefined
      })

      if (response.error || !response.data) {
        logChat('Session %s not found or error: %s', this.currentSessionId, response.error)
        return null
      }

      return {
        id: this.currentSessionId,
        directory: this.currentProjectDirectory
      }
    } catch (error) {
      logChat('ERROR: Failed to get current session: %o', error)
      return null
    }
  }
}

export default Toji
