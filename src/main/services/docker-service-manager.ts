/**
 * Docker Service Manager - Manages lifecycle of toji-services Docker containers
 * Handles starting, stopping, and health checking of Whisper (STT) and Piper (TTS) services
 */

import { spawn, exec } from 'child_process'
import { promisify } from 'util'
import { join } from 'path'
import { createFileDebugLogger } from '../utils/logger'
import { app } from 'electron'

const execAsync = promisify(exec)
const log = createFileDebugLogger('docker-service-manager')

export interface ServiceHealth {
  whisper: {
    available: boolean
    healthy: boolean
    url: string
    error?: string
  }
  piper: {
    available: boolean
    healthy: boolean
    url: string
    error?: string
  }
}

export enum DockerMode {
  DISABLED = 'disabled', // User chose not to use Docker
  NOT_INSTALLED = 'not_installed', // Docker not found on system
  STARTING = 'starting', // Services are starting up
  RUNNING = 'running', // Services are healthy and running
  ERROR = 'error' // Services failed to start or crashed
}

export class DockerServiceManager {
  private readonly WHISPER_PORT = 9000
  private readonly PIPER_PORT = 9001
  private readonly HEALTH_CHECK_INTERVAL = 30000 // 30 seconds
  private readonly STARTUP_TIMEOUT = 120000 // 2 minutes for model loading

  private mode: DockerMode = DockerMode.NOT_INSTALLED
  private healthCheckTimer?: NodeJS.Timeout
  private dockerComposeProcess?: ReturnType<typeof spawn>

  constructor() {
    log('DockerServiceManager initialized')
  }

  /**
   * Check if Docker is installed and accessible
   */
  async checkDockerInstalled(): Promise<boolean> {
    try {
      log('Checking if Docker is installed...')
      const { stdout } = await execAsync('docker --version')
      log(`Docker found: ${stdout.trim()}`)

      // Also check if Docker daemon is running
      await execAsync('docker ps')
      log('Docker daemon is running')

      return true
    } catch (error) {
      log('Docker not available:', error)
      this.mode = DockerMode.NOT_INSTALLED
      return false
    }
  }

  /**
   * Check if Docker Compose is available
   */
  async checkDockerCompose(): Promise<boolean> {
    try {
      // Try docker-compose first (standalone)
      await execAsync('docker-compose --version')
      log('Found docker-compose (standalone)')
      return true
    } catch {
      try {
        // Try docker compose (plugin)
        await execAsync('docker compose version')
        log('Found docker compose (plugin)')
        return true
      } catch (error) {
        log('Docker Compose not available:', error)
        return false
      }
    }
  }

  /**
   * Get the path to docker-compose.yml bundled with the app
   */
  private getDockerComposePath(): string {
    if (app.isPackaged) {
      // In production, resources are in a different location
      return join(process.resourcesPath, 'docker-services', 'docker-compose.yml')
    } else {
      // In development
      return join(app.getAppPath(), 'resources', 'docker-services', 'docker-compose.yml')
    }
  }

  /**
   * Get the directory containing Docker service files
   */
  private getDockerServicesDir(): string {
    if (app.isPackaged) {
      return join(process.resourcesPath, 'docker-services')
    } else {
      return join(app.getAppPath(), 'resources', 'docker-services')
    }
  }

  /**
   * Start the Docker services using docker-compose
   */
  async startServices(): Promise<void> {
    if (this.mode === DockerMode.RUNNING) {
      log('Services already running')
      return
    }

    log('Starting Docker services...')
    this.mode = DockerMode.STARTING

    const composePath = this.getDockerComposePath()
    const servicesDir = this.getDockerServicesDir()

    log(`Docker Compose file: ${composePath}`)
    log(`Services directory: ${servicesDir}`)

    try {
      // Determine which docker-compose command to use
      const usePlugin = await this.usesDockerComposePlugin()
      const command = usePlugin ? 'docker' : 'docker-compose'
      const args = usePlugin
        ? ['compose', '-f', composePath, 'up', '-d']
        : ['-f', composePath, 'up', '-d']

      log(`Executing: ${command} ${args.join(' ')}`)

      // Start docker-compose in detached mode
      const process = spawn(command, args, {
        cwd: servicesDir,
        stdio: ['ignore', 'pipe', 'pipe']
      })

      // Capture output
      process.stdout?.on('data', (data) => {
        log(`docker-compose stdout: ${data.toString().trim()}`)
      })

      process.stderr?.on('data', (data) => {
        log(`docker-compose stderr: ${data.toString().trim()}`)
      })

      // Wait for process to complete
      await new Promise<void>((resolve, reject) => {
        process.on('close', (code) => {
          if (code === 0) {
            log('Docker Compose started successfully')
            resolve()
          } else {
            reject(new Error(`docker-compose exited with code ${code}`))
          }
        })

        process.on('error', (error) => {
          reject(error)
        })
      })

      // Wait for services to become healthy
      const healthy = await this.waitForHealthy()
      if (healthy) {
        this.mode = DockerMode.RUNNING
        this.startHealthChecks()
        log('✅ All services are healthy and running')
      } else {
        this.mode = DockerMode.ERROR
        throw new Error('Services failed to become healthy within timeout')
      }
    } catch (error) {
      log('❌ Failed to start services:', error)
      this.mode = DockerMode.ERROR
      throw error
    }
  }

  /**
   * Stop the Docker services
   */
  async stopServices(): Promise<void> {
    log('Stopping Docker services...')

    this.stopHealthChecks()

    const composePath = this.getDockerComposePath()
    const servicesDir = this.getDockerServicesDir()

    try {
      const usePlugin = await this.usesDockerComposePlugin()
      const command = usePlugin ? 'docker' : 'docker-compose'
      const args = usePlugin ? ['compose', '-f', composePath, 'down'] : ['-f', composePath, 'down']

      await execAsync(`${command} ${args.join(' ')}`, { cwd: servicesDir })
      log('Services stopped successfully')
      this.mode = DockerMode.DISABLED
    } catch (error) {
      log('Error stopping services:', error)
      throw error
    }
  }

  /**
   * Get current service health status
   */
  async getServiceHealth(): Promise<ServiceHealth> {
    const whisperUrl = `http://localhost:${this.WHISPER_PORT}`
    const piperUrl = `http://localhost:${this.PIPER_PORT}`

    const health: ServiceHealth = {
      whisper: {
        available: false,
        healthy: false,
        url: whisperUrl
      },
      piper: {
        available: false,
        healthy: false,
        url: piperUrl
      }
    }

    // Check Whisper service
    try {
      const response = await fetch(`${whisperUrl}/health`, {
        signal: AbortSignal.timeout(5000)
      })
      if (response.ok) {
        health.whisper.available = true
        health.whisper.healthy = true
      }
    } catch (error) {
      health.whisper.error = error instanceof Error ? error.message : 'Unknown error'
    }

    // Check Piper service
    try {
      const response = await fetch(`${piperUrl}/health`, {
        signal: AbortSignal.timeout(5000)
      })
      if (response.ok) {
        health.piper.available = true
        health.piper.healthy = true
      }
    } catch (error) {
      health.piper.error = error instanceof Error ? error.message : 'Unknown error'
    }

    return health
  }

  /**
   * Wait for services to become healthy (with timeout)
   */
  private async waitForHealthy(): Promise<boolean> {
    const startTime = Date.now()
    const checkInterval = 5000 // Check every 5 seconds

    log('Waiting for services to become healthy...')

    while (Date.now() - startTime < this.STARTUP_TIMEOUT) {
      const health = await this.getServiceHealth()

      if (health.whisper.healthy && health.piper.healthy) {
        log('✅ Both services are healthy')
        return true
      }

      log(
        `Waiting... Whisper: ${health.whisper.healthy ? '✅' : '❌'}, Piper: ${health.piper.healthy ? '✅' : '❌'}`
      )

      await new Promise((resolve) => setTimeout(resolve, checkInterval))
    }

    log('❌ Timeout waiting for services to become healthy')
    return false
  }

  /**
   * Start periodic health checks
   */
  private startHealthChecks(): void {
    this.stopHealthChecks()

    this.healthCheckTimer = setInterval(async () => {
      const health = await this.getServiceHealth()

      if (!health.whisper.healthy || !health.piper.healthy) {
        log('⚠️ Health check failed, services may be unhealthy')
        this.mode = DockerMode.ERROR
      } else if (this.mode !== DockerMode.RUNNING) {
        log('✅ Services recovered')
        this.mode = DockerMode.RUNNING
      }
    }, this.HEALTH_CHECK_INTERVAL)
  }

  /**
   * Stop periodic health checks
   */
  private stopHealthChecks(): void {
    if (this.healthCheckTimer) {
      clearInterval(this.healthCheckTimer)
      this.healthCheckTimer = undefined
    }
  }

  /**
   * Determine if system uses docker-compose plugin or standalone
   */
  private async usesDockerComposePlugin(): Promise<boolean> {
    try {
      await execAsync('docker compose version')
      return true
    } catch {
      return false
    }
  }

  /**
   * Get current mode
   */
  getMode(): DockerMode {
    return this.mode
  }

  /**
   * Set mode (for manual control)
   */
  setMode(mode: DockerMode): void {
    this.mode = mode
  }

  /**
   * Get service URLs
   */
  getServiceUrls() {
    return {
      whisper: `http://localhost:${this.WHISPER_PORT}`,
      piper: `http://localhost:${this.PIPER_PORT}`
    }
  }

  /**
   * Cleanup when app closes
   */
  async cleanup(): Promise<void> {
    this.stopHealthChecks()

    // Optionally stop services on cleanup
    // await this.stopServices()
  }
}
