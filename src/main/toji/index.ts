// Minimal Toji implementation with direct OpenCode SDK usage
import { createOpencodeClient } from '@opencode-ai/sdk'
import type { OpencodeClient } from '@opencode-ai/sdk'
import type { OpenCodeService } from '../services/opencode-service'
import type { ConfigProvider } from '../config/ConfigProvider'
import { ProjectManager } from './project'
import { ServerManager } from './server'
import type { ServerStatus } from './types'

export class Toji {
  private client?: OpencodeClient

  // Public modules
  public readonly project: ProjectManager
  public readonly server: ServerManager

  constructor(opencodeService: OpenCodeService, config?: ConfigProvider) {
    // Initialize modules
    this.server = new ServerManager(opencodeService, config)
    this.project = new ProjectManager(() => this.client)
  }

  async getServerStatus(): Promise<ServerStatus> {
    return this.server.getStatus()
  }

  // Connect the client to the server
  async connectClient(): Promise<void> {
    const serverUrl = this.server.getUrl()
    if (!serverUrl) {
      throw new Error('Server not started')
    }

    this.client = createOpencodeClient({
      baseUrl: serverUrl
    })
  }

  // Check if ready
  isReady(): boolean {
    return Boolean(this.server.isRunning() && this.client)
  }

  // Get the client for direct SDK usage
  getClient(): OpencodeClient | undefined {
    return this.client
  }
}

export default Toji
