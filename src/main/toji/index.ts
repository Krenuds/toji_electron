// Minimal Toji implementation with direct OpenCode SDK usage
import { createOpencodeClient } from '@opencode-ai/sdk'
import type { OpencodeClient } from '@opencode-ai/sdk'
import type { OpenCodeService } from '../services/opencode-service'
import type { ConfigProvider } from '../config/ConfigProvider'
import { ProjectManager } from './project'
import { ServerManager } from './server'
import type { ServerStatus } from './types'
import { createFileDebugLogger } from '../utils/logger'

const log = createFileDebugLogger('toji:core')
const logClient = createFileDebugLogger('toji:client')

export class Toji {
  private client?: OpencodeClient

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
}

export default Toji
