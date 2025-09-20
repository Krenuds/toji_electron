// Minimal Toji implementation with direct OpenCode SDK usage
import { createOpencodeServer, createOpencodeClient } from '@opencode-ai/sdk'
import type { OpencodeClient, ServerOptions } from '@opencode-ai/sdk'
import type { OpenCodeService } from '../services/opencode-service'
import type { ConfigProvider } from '../config/ConfigProvider'

export class Toji {
  private server?: { close: () => void }
  private client?: OpencodeClient
  private serverUrl?: string

  constructor(
    private opencodeService: OpenCodeService,
    private config?: ConfigProvider  // Will be used for workspace settings later
  ) {}

  // Start the OpenCode server
  async startServer(directory: string, options: ServerOptions = {}): Promise<void> {
    // Stop any existing server
    if (this.server) {
      this.server.close()
      this.server = undefined
    }

    // Ensure binary is available
    const binaryInfo = this.opencodeService.getBinaryInfo()
    if (!binaryInfo.installed) {
      throw new Error('OpenCode binary not installed')
    }

    const defaultOptions: ServerOptions = {
      hostname: '127.0.0.1',
      port: 4096,
      timeout: 5000
    }

    const finalOptions = { ...defaultOptions, ...options }

    this.server = await createOpencodeServer(finalOptions)
    this.serverUrl = `http://${finalOptions.hostname}:${finalOptions.port}`
  }

  // Connect the client to the server
  async connectClient(): Promise<void> {
    if (!this.serverUrl) {
      throw new Error('Server not started')
    }

    this.client = createOpencodeClient({
      baseUrl: this.serverUrl
    })
  }

  // Stop everything
  async shutdown(): Promise<void> {
    if (this.client) {
      this.client = undefined
    }

    if (this.server) {
      this.server.close()
      this.server = undefined
    }

    this.serverUrl = undefined
  }

  // Check if ready
  isReady(): boolean {
    return Boolean(this.server && this.client)
  }

  // Get the client for direct SDK usage
  getClient(): OpencodeClient | undefined {
    return this.client
  }
}

export default Toji