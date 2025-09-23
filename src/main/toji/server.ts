import { createOpencodeServer } from '@opencode-ai/sdk'
import type { ServerOptions, Config } from '@opencode-ai/sdk'
import type { OpenCodeService } from '../services/opencode-service'
import type { ConfigProvider } from '../config/ConfigProvider'
import type { ServerStatus } from './types'

interface ServerInstance {
  server: { close: () => void; url: string }
  port: number
  workingDir: string
  startTime: Date
  isHealthy: boolean
  lastHealthCheck?: Date
  healthCheckInterval?: NodeJS.Timeout
}

export class ServerManager {
  private servers: Map<string, ServerInstance> = new Map() // workingDir -> ServerInstance
  private basePort = 4096

  constructor(
    private opencodeService: OpenCodeService,
    private _config?: ConfigProvider
  ) {}

  /**
   * Find the next available port starting from basePort
   */
  private async findAvailablePort(): Promise<number> {
    let port = this.basePort
    const usedPorts = [...this.servers.values()].map((s) => s.port)

    while (usedPorts.includes(port)) {
      port++
    }

    return port
  }

  /**
   * Start server for a specific project (doesn't stop others)
   */
  async start(workingDir?: string, config?: Config): Promise<number> {
    // For backward compatibility, use configured working directory if not provided
    const dir = workingDir || this._config?.getOpencodeWorkingDirectory() || process.cwd()

    // Stop any existing server for this project
    if (this.servers.has(dir)) {
      await this.stop(dir)
    }

    // Ensure binary is available
    const binaryInfo = this.opencodeService.getBinaryInfo()
    if (!binaryInfo.installed) {
      throw new Error('OpenCode binary not installed')
    }

    console.log('Starting OpenCode server for project:', dir)

    // Find available port
    const port = await this.findAvailablePort()

    const serverOptions: ServerOptions = {
      hostname: '127.0.0.1',
      port,
      timeout: 5000,
      config
    }

    const server = await createOpencodeServer(serverOptions)

    const instance: ServerInstance = {
      server,
      port,
      workingDir: dir,
      startTime: new Date(),
      isHealthy: true // Assume healthy on start
    }

    this.servers.set(dir, instance)

    // Start health monitoring for this instance
    this.startHealthMonitoring(instance)

    return port
  }

  /**
   * Stop server for specific project, or all servers if no directory specified (backward compatibility)
   */
  async stop(workingDir?: string): Promise<void> {
    if (!workingDir) {
      // Legacy behavior - stop all servers
      return this.stopAll()
    }
    const instance = this.servers.get(workingDir)
    if (!instance) {
      return // Already stopped or never started
    }

    // Stop health monitoring
    this.stopHealthMonitoring(instance)

    // Close the server
    instance.server.close()

    // Remove from tracking
    this.servers.delete(workingDir)
  }

  /**
   * Stop all servers
   */
  async stopAll(): Promise<void> {
    const workingDirs = [...this.servers.keys()]
    for (const workingDir of workingDirs) {
      await this.stop(workingDir)
    }
  }

  /**
   * Get all running servers
   */
  getRunningServers(): Map<string, ServerInstance> {
    return this.servers
  }

  /**
   * Get server instance for specific project
   */
  getServer(workingDir: string): ServerInstance | undefined {
    return this.servers.get(workingDir)
  }

  /**
   * Get status for specific project (legacy method - keeping for compatibility)
   */
  async getStatus(): Promise<ServerStatus> {
    // For legacy compatibility, return status of any running server
    const firstServer = [...this.servers.values()][0]

    if (!firstServer) {
      return {
        isRunning: false,
        port: undefined,
        pid: undefined,
        startTime: undefined,
        uptime: undefined,
        isHealthy: undefined,
        lastHealthCheck: undefined
      }
    }

    return {
      isRunning: true,
      port: firstServer.port,
      pid: undefined, // TODO: Get actual PID if needed
      startTime: firstServer.startTime,
      uptime: Date.now() - firstServer.startTime.getTime(),
      isHealthy: firstServer.isHealthy,
      lastHealthCheck: firstServer.lastHealthCheck
    }
  }

  /**
   * Check if any server is running (legacy method)
   */
  isRunning(): boolean {
    return this.servers.size > 0
  }

  /**
   * Get URL for first running server (legacy method)
   */
  getUrl(): string | undefined {
    const firstServer = [...this.servers.values()][0]
    return firstServer ? firstServer.server.url : undefined
  }

  private startHealthMonitoring(instance: ServerInstance): void {
    // Clear any existing interval for this instance
    this.stopHealthMonitoring(instance)

    // Single function to perform health check
    const performHealthCheck = async (): Promise<void> => {
      instance.isHealthy = await this.checkHealth(instance)
      instance.lastHealthCheck = new Date()
    }

    // Check immediately
    performHealthCheck()

    // Then check every 10 seconds
    instance.healthCheckInterval = setInterval(performHealthCheck, 10000)
  }

  private stopHealthMonitoring(instance: ServerInstance): void {
    if (instance.healthCheckInterval) {
      clearInterval(instance.healthCheckInterval)
      instance.healthCheckInterval = undefined
    }
  }

  private async checkHealth(instance: ServerInstance): Promise<boolean> {
    try {
      // Just ping the server - any response means it's alive
      // Even a 404 means the server is running (connection refused would throw)
      await fetch(instance.server.url)
      return true
    } catch {
      // Server not responding (connection refused, timeout, etc)
      return false
    }
  }
}
