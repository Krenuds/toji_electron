import { spawn } from 'child_process'
import { existsSync } from 'fs'
import type { Config } from '@opencode-ai/sdk'
import type { OpenCodeService } from '../services/opencode-service'
import type { ServerStatus } from './types'
import { createLogger } from '../utils/logger'
import { normalizePath, getOpenCodeBinaryPath } from '../utils/path'

const logger = createLogger('toji:server')

interface ServerInstance {
  server: { close: () => void; url: string }
  port: number
  directory: string
  startTime: Date
  isHealthy: boolean
  lastHealthCheck?: Date
  healthCheckInterval?: NodeJS.Timeout
}

interface ServerOptions {
  hostname?: string
  port?: number
  timeout?: number
  signal?: AbortSignal
  config?: Config
  cwd?: string // Critical: Set the working directory for the spawned server
}

export class ServerManager {
  private servers: Map<string, ServerInstance> = new Map()
  private readonly BASE_PORT = 4096
  private readonly MAX_SERVERS = 10

  constructor(private opencodeService: OpenCodeService) {}

  /**
   * Get or create a server for the specified directory
   * Reuses existing server if one is already running for that directory
   */
  async getOrCreateServer(directory: string, config?: Config): Promise<ServerInstance> {
    const targetDirectory = normalizePath(directory || process.cwd())
    logger.debug('Getting or creating server for directory: %s', targetDirectory)

    // Check if we already have a server for this directory
    const existing = this.servers.get(targetDirectory)
    if (existing) {
      logger.debug('Found existing server for %s on port %d', targetDirectory, existing.port)
      // Check if the server is still healthy
      const isHealthy = await this.checkServerHealth(existing)
      if (isHealthy) {
        return existing
      } else {
        logger.debug('Existing server is unhealthy, will create new one')
        this.stopServerForDirectory(targetDirectory)
      }
    }

    // Check if we've reached max servers
    if (this.servers.size >= this.MAX_SERVERS) {
      logger.debug('Max servers reached (%d), stopping least recently used', this.MAX_SERVERS)
      // Stop the oldest server (first in the map)
      const oldestKey = this.servers.keys().next().value
      if (oldestKey) {
        await this.stopServerForDirectory(oldestKey)
      }
    }

    // Find next available port
    const port = await this.findNextAvailablePort()
    logger.debug('Creating new server for %s on port %d', targetDirectory, port)

    // Ensure binary is available
    const binaryInfo = this.opencodeService.getBinaryInfo()
    if (!binaryInfo.installed) {
      const error = new Error('OpenCode binary not installed')
      logger.debug('ERROR: %s', error.message)
      throw error
    }

    const serverOptions: ServerOptions = {
      hostname: '127.0.0.1',
      port,
      timeout: 10000,
      config,
      cwd: targetDirectory // Spawn FROM the target directory
    }

    try {
      logger.debug('Spawning OpenCode server for %s on port %d', targetDirectory, port)
      const server = await this.spawnOpenCodeServer(serverOptions)
      logger.debug(
        'Server created successfully at %s for directory %s',
        server.url,
        targetDirectory
      )

      const instance: ServerInstance = {
        server,
        port,
        directory: targetDirectory,
        startTime: new Date(),
        isHealthy: true,
        healthCheckInterval: undefined
      }

      // Add to our map
      this.servers.set(targetDirectory, instance)

      // Start health monitoring
      this.startHealthMonitoring(instance)

      logger.debug('Server started successfully on port %d for %s', port, targetDirectory)
      return instance
    } catch (error) {
      logger.debug('ERROR: Failed to create server for %s: %o', targetDirectory, error)
      throw error
    }
  }

  /**
   * Get server for a specific directory if it exists
   */
  getServerForDirectory(directory: string): ServerInstance | undefined {
    const normalized = normalizePath(directory)
    return this.servers.get(normalized)
  }

  /**
   * Get all running servers
   */
  getAllServers(): Array<{ directory: string; port: number; url: string; isHealthy: boolean }> {
    const servers: Array<{ directory: string; port: number; url: string; isHealthy: boolean }> = []
    for (const [directory, instance] of this.servers) {
      servers.push({
        directory,
        port: instance.port,
        url: instance.server.url,
        isHealthy: instance.isHealthy
      })
    }
    return servers
  }

  /**
   * Stop server for a specific directory
   */
  async stopServerForDirectory(directory: string): Promise<void> {
    const normalized = normalizePath(directory)
    const instance = this.servers.get(normalized)

    if (!instance) {
      logger.debug('No server to stop for directory: %s', normalized)
      return
    }

    logger.debug('Stopping server for directory: %s (port %d)', normalized, instance.port)

    // Stop health monitoring
    if (instance.healthCheckInterval) {
      clearInterval(instance.healthCheckInterval)
    }

    // Close the server
    try {
      instance.server.close()
      logger.debug('Server closed successfully for %s', normalized)
    } catch (error) {
      logger.debug('ERROR: Failed to close server for %s: %o', normalized, error)
    }

    // Remove from map
    this.servers.delete(normalized)
  }

  /**
   * Stop all servers
   */
  async stopAllServers(): Promise<void> {
    logger.debug('Stopping all servers (%d total)', this.servers.size)
    const directories = Array.from(this.servers.keys())
    for (const directory of directories) {
      await this.stopServerForDirectory(directory)
    }

    // After stopping all known servers, do a forceful cleanup of any orphaned OpenCode processes
    await this.forceKillAllOpenCodeProcesses()
  }

  /**
   * Force kill all OpenCode processes on the system
   * This is a failsafe to ensure no processes are left running
   */
  private async forceKillAllOpenCodeProcesses(): Promise<void> {
    logger.debug('Force killing any remaining OpenCode processes')

    try {
      const { exec } = await import('child_process')
      const { promisify } = await import('util')
      const execAsync = promisify(exec)

      if (process.platform === 'win32') {
        // On Windows, use taskkill to force kill all opencode.exe processes
        try {
          await execAsync('taskkill /F /IM opencode.exe')
          logger.debug('Force killed all opencode.exe processes on Windows')
        } catch {
          // Error is expected if no processes are running
          logger.debug('No opencode.exe processes found to kill (this is ok)')
        }
      } else {
        // On Unix-like systems, use pkill
        try {
          await execAsync('pkill -f opencode')
          logger.debug('Force killed all opencode processes on Unix')
        } catch {
          // Error is expected if no processes are running
          logger.debug('No opencode processes found to kill (this is ok)')
        }
      }
    } catch (error) {
      logger.debug('Error during force kill (may be ok if no processes running): %o', error)
    }
  }

  /**
   * Get the primary server (for backward compatibility)
   * Returns the server for the current working directory or the first server
   */
  getPrimaryServer(): ServerInstance | undefined {
    // First try to get server for current directory
    const cwd = process.cwd()
    const cwdServer = this.getServerForDirectory(cwd)
    if (cwdServer) {
      return cwdServer
    }

    // Otherwise return the first server
    const firstServer = this.servers.values().next().value
    return firstServer
  }

  /**
   * Legacy methods for backward compatibility
   */
  async start(config?: Config, cwd?: string): Promise<number> {
    const instance = await this.getOrCreateServer(cwd || process.cwd(), config)
    return instance.port
  }

  async stop(): Promise<void> {
    // Stop the primary server
    const primary = this.getPrimaryServer()
    if (primary) {
      await this.stopServerForDirectory(primary.directory)
    }
  }

  async restart(config?: Config, cwd?: string): Promise<number> {
    const targetDir = normalizePath(cwd || process.cwd())
    logger.debug('========== SERVER RESTART ==========')
    logger.debug('Restarting server for directory: %s', targetDir)
    logger.debug('Config passed to restart: %o', config)
    await this.stopServerForDirectory(targetDir)
    const instance = await this.getOrCreateServer(targetDir, config)
    logger.debug('Server restarted on port: %d', instance.port)
    return instance.port
  }

  isRunning(): boolean {
    return this.servers.size > 0
  }

  getUrl(): string | undefined {
    const primary = this.getPrimaryServer()
    return primary?.server.url
  }

  async getStatus(): Promise<ServerStatus> {
    const primary = this.getPrimaryServer()
    if (!primary) {
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
      port: primary.port,
      pid: undefined,
      startTime: primary.startTime,
      uptime: Date.now() - primary.startTime.getTime(),
      isHealthy: primary.isHealthy,
      lastHealthCheck: primary.lastHealthCheck
    }
  }

  /**
   * Find the next available port
   */
  private async findNextAvailablePort(): Promise<number> {
    const maxPort = this.BASE_PORT + this.MAX_SERVERS

    for (let port = this.BASE_PORT; port < maxPort; port++) {
      // Check if any of our servers is using this port
      let portInUse = false
      for (const instance of this.servers.values()) {
        if (instance.port === port) {
          portInUse = true
          break
        }
      }

      if (!portInUse) {
        // Also check if something else is using this port
        const isAvailable = await this.isPortAvailable(port)
        if (isAvailable) {
          return port
        }
      }
    }

    throw new Error(`No available ports in range ${this.BASE_PORT}-${maxPort}`)
  }

  /**
   * Check if a port is available
   */
  private async isPortAvailable(port: number): Promise<boolean> {
    try {
      await fetch(`http://127.0.0.1:${port}`, {
        method: 'GET',
        signal: AbortSignal.timeout(1000)
      })
      // If we get a response, port is in use
      logger.debug('Port %d is in use (got response)', port)
      return false
    } catch {
      // Connection failed, port is likely available
      return true
    }
  }

  /**
   * Check server health
   */
  private async checkServerHealth(instance: ServerInstance): Promise<boolean> {
    try {
      await fetch(instance.server.url, {
        signal: AbortSignal.timeout(2000)
      })
      return true
    } catch (error) {
      logger.debug('Health check failed for %s: %o', instance.directory, error)
      return false
    }
  }

  /**
   * Start health monitoring for a server instance
   */
  private startHealthMonitoring(instance: ServerInstance): void {
    // Check health every 30 seconds
    instance.healthCheckInterval = setInterval(async () => {
      const wasHealthy = instance.isHealthy
      instance.isHealthy = await this.checkServerHealth(instance)
      instance.lastHealthCheck = new Date()

      if (wasHealthy !== instance.isHealthy) {
        logger.debug(
          'Health status changed for %s: %s -> %s',
          instance.directory,
          wasHealthy,
          instance.isHealthy
        )
      }
    }, 30000)

    // Check immediately
    this.checkServerHealth(instance).then((isHealthy) => {
      instance.isHealthy = isHealthy
      instance.lastHealthCheck = new Date()
    })
  }

  /**
   * Get server directory from a specific URL (legacy method for compatibility)
   */
  async getServerDirectory(): Promise<string | null> {
    const primary = this.getPrimaryServer()
    if (!primary) {
      return null
    }
    return primary.directory
  }

  /**
   * Spawn an OpenCode server process with the specified options
   * This is the core spawning logic that supports custom working directories
   */
  private async spawnOpenCodeServer(options?: ServerOptions): Promise<{
    url: string
    close: () => void
  }> {
    const opts = {
      hostname: '127.0.0.1',
      port: 4096,
      timeout: 10000, // 10s for slower systems
      cwd: process.cwd(), // Default to current working directory
      ...options
    }

    // Get the full path to the opencode binary
    const binaryPath = getOpenCodeBinaryPath()

    // Verify binary exists
    if (!existsSync(binaryPath)) {
      throw new Error(`OpenCode binary not found at ${binaryPath}. Please ensure it is installed.`)
    }

    // Only set OPENCODE_CONFIG_CONTENT if config is explicitly provided
    // Otherwise let OpenCode SDK read opencode.json from cwd
    const envVars = { ...process.env }
    if (opts.config) {
      envVars.OPENCODE_CONFIG_CONTENT = JSON.stringify(opts.config)
    }

    const proc = spawn(
      binaryPath,
      ['serve', `--hostname=${opts.hostname}`, `--port=${opts.port}`],
      {
        cwd: opts.cwd, // Critical: Set the working directory for multi-project support
        signal: opts.signal,
        env: envVars
      }
    )

    const url = await new Promise<string>((resolve, reject) => {
      const id = setTimeout(() => {
        reject(new Error(`Timeout waiting for server to start after ${opts.timeout}ms`))
      }, opts.timeout!)

      let output = ''
      proc.stdout?.on('data', (chunk) => {
        output += chunk.toString()
        const lines = output.split('\n')
        for (const line of lines) {
          if (line.startsWith('opencode server listening')) {
            const match = line.match(/on\s+(https?:\/\/[^\s]+)/)
            if (!match) {
              throw new Error(`Failed to parse server url from output: ${line}`)
            }
            clearTimeout(id)
            resolve(match[1])
            return
          }
        }
      })

      proc.stderr?.on('data', (chunk) => {
        output += chunk.toString()
      })

      proc.on('exit', (code) => {
        clearTimeout(id)
        let msg = `OpenCode server failed to start (exit code ${code})`

        // Check for common issues
        if (output.includes('port') && output.includes('in use')) {
          msg = `Port ${opts.port} is already in use. Another OpenCode server may be running.`
        } else if (output.includes('permission') || output.includes('access')) {
          msg = `Permission denied when starting OpenCode server. Check file permissions.`
        } else if (output.includes('not found') || output.includes('cannot find')) {
          msg = `OpenCode binary issue: ${output}`
        }

        if (output.trim() && !msg.includes(output)) {
          msg += `\n\nServer output: ${output}`
        }

        msg += `\n\nWorking directory: ${opts.cwd}`
        msg += `\nBinary path: ${binaryPath}`

        reject(new Error(msg))
      })

      proc.on('error', (error) => {
        clearTimeout(id)
        const enhancedError = new Error(
          `Failed to spawn OpenCode server: ${error.message}\n` +
            `Binary path: ${binaryPath}\n` +
            `Working directory: ${opts.cwd}`
        )
        reject(enhancedError)
      })

      if (opts.signal) {
        opts.signal.addEventListener('abort', () => {
          clearTimeout(id)
          reject(new Error('Aborted'))
        })
      }
    })

    return {
      url,
      close() {
        proc.kill()
      }
    }
  }
}
