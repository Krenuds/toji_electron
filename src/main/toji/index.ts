// Minimal Toji implementation with direct OpenCode SDK usage
import { createOpencodeServer, createOpencodeClient } from '@opencode-ai/sdk'
import type { OpencodeClient, ServerOptions } from '@opencode-ai/sdk'
import type { OpenCodeService } from '../services/opencode-service'
import type { ConfigProvider } from '../config/ConfigProvider'
import { ProjectManager } from './project'
import type { ServerStatus } from './types'

export class Toji {
  private server?: { close: () => void; url?: string }
  private client?: OpencodeClient
  private serverUrl?: string
  private healthCheckInterval?: NodeJS.Timeout
  private serverStartTime?: Date
  private isHealthy: boolean = false
  private lastHealthCheck?: Date
  private serverPid?: number

  // Public modules
  public readonly project: ProjectManager

  constructor(
    private opencodeService: OpenCodeService,
    private config?: ConfigProvider // Will be used for workspace settings
  ) {
    // Initialize modules with getter for client
    this.project = new ProjectManager(() => this.client)
  }

  // Start the OpenCode server
  async startServer(): Promise<void> {
    // Stop any existing server
    if (this.server) {
      await this.stopServer()
    }

    // Ensure binary is available
    const binaryInfo = this.opencodeService.getBinaryInfo()
    if (!binaryInfo.installed) {
      throw new Error('OpenCode binary not installed')
    }

    // Get the configured working directory for future use
    const workingDir = this.config?.getOpencodeWorkingDirectory() || process.cwd()
    // TODO: The OpenCode SDK server doesn't support setting a working directory yet
    // For now, log the intended directory
    console.log('Starting OpenCode server (intended directory:', workingDir, ')')

    const serverOptions: ServerOptions = {
      hostname: '127.0.0.1',
      port: 4096,
      timeout: 5000
    }

    this.server = await createOpencodeServer(serverOptions)
    this.serverUrl = `http://${serverOptions.hostname}:${serverOptions.port}`
    this.serverStartTime = new Date()
    this.isHealthy = true // Assume healthy on start

    // Start health monitoring
    this.startHealthCheck()
  }

  // Stop the OpenCode server
  async stopServer(): Promise<void> {
    // Stop health monitoring
    this.stopHealthCheck()

    // Close the server
    if (this.server) {
      this.server.close()
      this.server = undefined
    }

    // Clear state
    this.client = undefined
    this.serverUrl = undefined
    this.serverStartTime = undefined
    this.isHealthy = false
    this.lastHealthCheck = undefined
    this.serverPid = undefined
  }

  // Get current server status
  async getServerStatus(): Promise<ServerStatus> {
    const isRunning = Boolean(this.server && this.serverUrl)

    return {
      isRunning,
      port: isRunning ? 4096 : undefined,
      pid: this.serverPid,
      startTime: this.serverStartTime,
      uptime: this.serverStartTime ? Date.now() - this.serverStartTime.getTime() : undefined,
      isHealthy: isRunning ? this.isHealthy : undefined,
      lastHealthCheck: this.lastHealthCheck
    }
  }

  // Start health check monitoring
  private startHealthCheck(): void {
    // Clear any existing interval
    this.stopHealthCheck()

    // Check health every 10 seconds
    this.healthCheckInterval = setInterval(async () => {
      this.isHealthy = await this.checkServerHealth()
      this.lastHealthCheck = new Date()
    }, 10000)

    // Do immediate health check
    this.checkServerHealth().then((healthy) => {
      this.isHealthy = healthy
      this.lastHealthCheck = new Date()
    })
  }

  // Stop health check monitoring
  private stopHealthCheck(): void {
    if (this.healthCheckInterval) {
      clearInterval(this.healthCheckInterval)
      this.healthCheckInterval = undefined
    }
  }

  // Check if server is healthy
  private async checkServerHealth(): Promise<boolean> {
    if (!this.serverUrl) return false

    try {
      // Try to fetch from the server - OpenCode SDK servers respond to /health
      const response = await fetch(`${this.serverUrl}/health`)
      return response.ok
    } catch {
      // Server not responding
      return false
    }
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
    await this.stopServer()
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
