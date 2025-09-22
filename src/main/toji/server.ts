import { createOpencodeServer } from '@opencode-ai/sdk'
import type { ServerOptions } from '@opencode-ai/sdk'
import type { OpenCodeService } from '../services/opencode-service'
import type { ConfigProvider } from '../config/ConfigProvider'
import type { ServerStatus } from './types'

export class ServerManager {
  private server?: { close: () => void; url?: string }
  private serverUrl?: string
  private healthCheckInterval?: NodeJS.Timeout
  private serverStartTime?: Date
  private isHealthy: boolean = false
  private lastHealthCheck?: Date

  constructor(
    private opencodeService: OpenCodeService,
    private config?: ConfigProvider
  ) {}

  async start(): Promise<void> {
    // Stop any existing server
    if (this.server) {
      await this.stop()
    }

    // Ensure binary is available
    const binaryInfo = this.opencodeService.getBinaryInfo()
    if (!binaryInfo.installed) {
      throw new Error('OpenCode binary not installed')
    }

    // Get the configured working directory
    const workingDir = this.config?.getOpencodeWorkingDirectory() || process.cwd()
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
    this.startHealthMonitoring()
  }

  async stop(): Promise<void> {
    // Stop health monitoring
    this.stopHealthMonitoring()

    // Close the server
    if (this.server) {
      this.server.close()
      this.server = undefined
    }

    // Clear state
    this.serverUrl = undefined
    this.serverStartTime = undefined
    this.isHealthy = false
    this.lastHealthCheck = undefined
  }

  async getStatus(): Promise<ServerStatus> {
    const isRunning = Boolean(this.server && this.serverUrl)

    return {
      isRunning,
      port: isRunning ? 4096 : undefined,
      pid: undefined, // TODO: Get actual PID if needed
      startTime: this.serverStartTime,
      uptime: this.serverStartTime ? Date.now() - this.serverStartTime.getTime() : undefined,
      isHealthy: isRunning ? this.isHealthy : undefined,
      lastHealthCheck: this.lastHealthCheck
    }
  }

  isRunning(): boolean {
    return Boolean(this.server && this.serverUrl)
  }

  getUrl(): string | undefined {
    return this.serverUrl
  }

  private startHealthMonitoring(): void {
    // Clear any existing interval
    this.stopHealthMonitoring()

    // Single function to perform health check
    const performHealthCheck = async (): Promise<void> => {
      this.isHealthy = await this.checkHealth()
      this.lastHealthCheck = new Date()
    }

    // Check immediately
    performHealthCheck()

    // Then check every 10 seconds
    this.healthCheckInterval = setInterval(performHealthCheck, 10000)
  }

  private stopHealthMonitoring(): void {
    if (this.healthCheckInterval) {
      clearInterval(this.healthCheckInterval)
      this.healthCheckInterval = undefined
    }
  }

  private async checkHealth(): Promise<boolean> {
    if (!this.serverUrl) return false

    try {
      // Just ping the server - any response means it's alive
      // Even a 404 means the server is running (connection refused would throw)
      await fetch(this.serverUrl)
      return true
    } catch {
      // Server not responding (connection refused, timeout, etc)
      return false
    }
  }
}
