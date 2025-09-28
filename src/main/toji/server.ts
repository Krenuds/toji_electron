import { createOpencodeServerWithCwd } from './opencode-server-patch'
import type { Config } from '@opencode-ai/sdk'
import type { ServerOptions } from './opencode-server-patch'
import type { OpenCodeService } from '../services/opencode-service'
import type { ServerStatus } from './types'
import { createFileDebugLogger } from '../utils/logger'

const log = createFileDebugLogger('toji:server')

interface ServerInstance {
  server: { close: () => void; url: string }
  port: number
  startTime: Date
  isHealthy: boolean
  lastHealthCheck?: Date
  healthCheckInterval?: NodeJS.Timeout
}

export class ServerManager {
  private instance?: ServerInstance
  private readonly DEFAULT_PORT = 4096

  constructor(private opencodeService: OpenCodeService) {}

  /**
   * Start the OpenCode server (single instance)
   * First tries to connect to existing server, then creates new if needed
   */
  async start(config?: Config, cwd?: string): Promise<number> {
    log('Starting OpenCode server')

    // Stop any existing managed instance first
    if (this.instance) {
      log('Existing managed instance found, stopping first')
      await this.stop()
    }

    // Check if server is already running (external process)
    const serverUrl = `http://127.0.0.1:${this.DEFAULT_PORT}`
    if (await this.canConnect(serverUrl)) {
      log('Found existing OpenCode server at %s, connecting to it', serverUrl)

      // Create a lightweight instance to track the external server
      this.instance = {
        server: {
          url: serverUrl,
          close: () => {
            log('External server - close() called but not stopping')
          }
        },
        port: this.DEFAULT_PORT,
        startTime: new Date(),
        isHealthy: true,
        healthCheckInterval: undefined
      }

      // Start health monitoring
      this.startHealthMonitoring()
      log('Connected to existing server on port %d', this.DEFAULT_PORT)

      return this.DEFAULT_PORT
    }

    // No existing server, create new one
    log('No existing server found, creating new one')

    // Ensure binary is available
    const binaryInfo = this.opencodeService.getBinaryInfo()
    log('Binary info: %o', binaryInfo)
    if (!binaryInfo.installed) {
      const error = new Error('OpenCode binary not installed')
      log('ERROR: %s', error.message)
      throw error
    }

    const serverOptions: ServerOptions = {
      hostname: '127.0.0.1',
      port: this.DEFAULT_PORT,
      timeout: 10000, // Increased timeout
      config,
      cwd: cwd || process.cwd() // Pass the working directory!
    }
    log('Server options: %o', serverOptions)

    try {
      log('Creating OpenCode server from directory: %s', serverOptions.cwd)
      const server = await createOpencodeServerWithCwd(serverOptions)
      log('OpenCode server created successfully, URL: %s', server.url)

      this.instance = {
        server,
        port: this.DEFAULT_PORT,
        startTime: new Date(),
        isHealthy: true,
        healthCheckInterval: undefined
      }

      // Start health monitoring
      this.startHealthMonitoring()
      log('Server started successfully on port %d', this.DEFAULT_PORT)

      return this.DEFAULT_PORT
    } catch (error) {
      log('ERROR: Failed to create OpenCode server: %o', error)
      throw error
    }
  }

  /**
   * Stop the OpenCode server
   */
  async stop(): Promise<void> {
    if (!this.instance) {
      log('No server to stop')
      return
    }

    log('Stopping OpenCode server')

    // Stop health monitoring
    this.stopHealthMonitoring()

    // Close the server
    try {
      this.instance.server.close()
      log('Server closed successfully')
    } catch (error) {
      log('ERROR: Failed to close server: %o', error)
    }

    this.instance = undefined
  }

  /**
   * Restart the server with new config
   */
  async restart(config?: Config): Promise<number> {
    log('Restarting OpenCode server')
    await this.stop()
    return this.start(config)
  }

  /**
   * Check if server is running
   */
  isRunning(): boolean {
    return Boolean(this.instance)
  }

  /**
   * Get server URL
   */
  getUrl(): string | undefined {
    return this.instance?.server.url
  }

  /**
   * Get server status
   */
  async getStatus(): Promise<ServerStatus> {
    if (!this.instance) {
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
      port: this.instance.port,
      pid: undefined, // TODO: Get actual PID if needed
      startTime: this.instance.startTime,
      uptime: Date.now() - this.instance.startTime.getTime(),
      isHealthy: this.instance.isHealthy,
      lastHealthCheck: this.instance.lastHealthCheck
    }
  }

  private startHealthMonitoring(): void {
    if (!this.instance) return

    // Clear any existing interval
    this.stopHealthMonitoring()

    // Check health every 30 seconds
    this.instance.healthCheckInterval = setInterval(async () => {
      if (!this.instance) return

      const wasHealthy = this.instance.isHealthy
      this.instance.isHealthy = await this.checkHealth()
      this.instance.lastHealthCheck = new Date()

      if (wasHealthy !== this.instance.isHealthy) {
        log('Health status changed: %s -> %s', wasHealthy, this.instance.isHealthy)
      }
    }, 30000)

    // Check immediately
    this.checkHealth().then((isHealthy) => {
      if (this.instance) {
        this.instance.isHealthy = isHealthy
        this.instance.lastHealthCheck = new Date()
      }
    })
  }

  private stopHealthMonitoring(): void {
    if (this.instance?.healthCheckInterval) {
      clearInterval(this.instance.healthCheckInterval)
      if (this.instance) {
        this.instance.healthCheckInterval = undefined
      }
    }
  }

  /**
   * Check if we can connect to a server at the given URL
   */
  private async canConnect(url: string): Promise<boolean> {
    try {
      const response = await fetch(url, {
        method: 'GET',
        signal: AbortSignal.timeout(2000) // 2 second timeout
      })
      // Any response (even 404) means server is alive
      log('Server responded with status %d', response.status)
      return true
    } catch (error) {
      log('Cannot connect to %s: %o', url, error)
      return false
    }
  }

  private async checkHealth(): Promise<boolean> {
    if (!this.instance) return false

    try {
      // Simple health check - can the server respond?
      await fetch(this.instance.server.url)
      // Any response (even 404) means server is alive
      return true
    } catch (error) {
      // Server not responding
      log('Health check failed: %o', error)
      return false
    }
  }
}
