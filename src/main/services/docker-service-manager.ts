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

export interface BuildState {
  imagesBuilt: boolean
  whisperImageId?: string
  piperImageId?: string
  lastBuildDate?: string
}

export class DockerServiceManager {
  private readonly WHISPER_PORT = 9000
  private readonly PIPER_PORT = 9001
  private readonly HEALTH_CHECK_INTERVAL = 30000 // 30 seconds
  private readonly STARTUP_TIMEOUT = 120000 // 2 minutes for model loading

  private mode: DockerMode = DockerMode.NOT_INSTALLED
  private healthCheckTimer?: NodeJS.Timeout
  private buildState: BuildState = { imagesBuilt: false }

  constructor() {
    log('DockerServiceManager initialized')
    this.loadBuildState().catch((error: unknown) => {
      log('Failed to load build state:', error)
    })
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
   * Get the directory containing Docker service files
   * Handles both development and production (packaged) paths
   */
  private getServicesPath(): string {
    if (app.isPackaged) {
      // Production: resources are in app.asar.unpacked or process.resourcesPath
      return join(process.resourcesPath, 'docker-services')
    } else {
      // Development: relative to source
      return join(app.getAppPath(), 'resources', 'docker-services')
    }
  }

  /**
   * Get the path to docker-compose.yml bundled with the app
   */
  private getDockerComposePath(): string {
    return join(this.getServicesPath(), 'docker-compose.yml')
  }

  /**
   * Get the path to build state file
   */
  private getBuildStatePath(): string {
    return join(app.getPath('userData'), 'docker-build-state.json')
  }

  /**
   * Load build state from disk
   */
  private async loadBuildState(): Promise<void> {
    try {
      const statePath = this.getBuildStatePath()
      const fs = await import('fs/promises')
      const data = await fs.readFile(statePath, 'utf-8')
      this.buildState = JSON.parse(data)
      log('Loaded build state:', this.buildState)
    } catch {
      // File doesn't exist or invalid JSON - use defaults
      log('No existing build state found, will build on first run')
      this.buildState = { imagesBuilt: false }
    }
  }

  /**
   * Save build state to disk
   */
  private async saveBuildState(): Promise<void> {
    try {
      const statePath = this.getBuildStatePath()
      const fs = await import('fs/promises')
      await fs.writeFile(statePath, JSON.stringify(this.buildState, null, 2), 'utf-8')
      log('Saved build state:', this.buildState)
    } catch (error) {
      log('Failed to save build state:', error)
    }
  }

  /**
   * Check if Docker images need to be built
   */
  async needsBuild(): Promise<boolean> {
    // If build state says we've built before, verify images exist
    if (this.buildState.imagesBuilt) {
      try {
        // Check if images exist
        const { stdout } = await execAsync('docker images --format "{{.Repository}}:{{.Tag}}"')
        const images = stdout.split('\n')
        const hasWhisper = images.some((img) => img.includes('toji-whisper'))
        const hasPiper = images.some((img) => img.includes('toji-piper'))

        if (hasWhisper && hasPiper) {
          log('Docker images already exist, skipping build')
          return false
        } else {
          log('Build state indicates built, but images not found. Will rebuild.')
          this.buildState.imagesBuilt = false
          return true
        }
      } catch (error) {
        log('Error checking for existing images:', error)
        return true
      }
    }
    return true
  }

  /**
   * Build Docker images (only if needed)
   */
  async buildImages(onProgress?: (message: string) => void): Promise<void> {
    const needsBuild = await this.needsBuild()
    if (!needsBuild) {
      log('Images already built, skipping build')
      onProgress?.('Docker images already built')
      return
    }

    log('Building Docker images...')
    onProgress?.('Building Docker images (this may take 5-10 minutes on first run)...')

    const servicesDir = this.getServicesPath()
    const composePath = this.getDockerComposePath()

    try {
      const usePlugin = await this.usesDockerComposePlugin()
      const command = usePlugin ? 'docker' : 'docker-compose'
      const args = usePlugin
        ? ['compose', '-f', composePath, 'build']
        : ['-f', composePath, 'build']

      log(`Building with: ${command} ${args.join(' ')}`)
      onProgress?.('Building Whisper service (3-4 minutes)...')

      const buildProcess = spawn(command, args, {
        cwd: servicesDir,
        stdio: ['ignore', 'pipe', 'pipe']
      })

      let lastProgress = ''
      buildProcess.stdout?.on('data', (data) => {
        const message = data.toString().trim()
        if (message && message !== lastProgress) {
          log(`build stdout: ${message}`)
          lastProgress = message
          onProgress?.(message)
        }
      })

      buildProcess.stderr?.on('data', (data) => {
        const message = data.toString().trim()
        if (message) {
          log(`build stderr: ${message}`)
          onProgress?.(message)
        }
      })

      await new Promise<void>((resolve, reject) => {
        buildProcess.on('close', (code) => {
          if (code === 0) {
            log('Docker images built successfully')
            resolve()
          } else {
            reject(new Error(`Build failed with code ${code}`))
          }
        })
        buildProcess.on('error', reject)
      })

      // Update build state
      const { stdout } = await execAsync(
        'docker images --format "{{.Repository}}:{{.Tag}} {{.ID}}"'
      )
      const images = stdout.split('\n')
      const whisperImage = images.find((img) => img.includes('toji-whisper'))
      const piperImage = images.find((img) => img.includes('toji-piper'))

      this.buildState = {
        imagesBuilt: true,
        whisperImageId: whisperImage?.split(' ')[1],
        piperImageId: piperImage?.split(' ')[1],
        lastBuildDate: new Date().toISOString()
      }

      await this.saveBuildState()
      onProgress?.('Build complete!')
    } catch (error) {
      log('Build failed:', error)
      onProgress?.('Build failed: ' + (error instanceof Error ? error.message : 'Unknown error'))
      throw error
    }
  }

  /**
   * Start the Docker services using docker-compose
   */
  async startServices(onProgress?: (message: string) => void): Promise<void> {
    if (this.mode === DockerMode.RUNNING) {
      log('Services already running')
      return
    }

    log('Starting Docker services...')
    this.mode = DockerMode.STARTING
    onProgress?.('Starting Docker services...')

    // Build images if needed
    await this.buildImages(onProgress)

    const composePath = this.getDockerComposePath()
    const servicesDir = this.getServicesPath()

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
      onProgress?.('Starting containers...')

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

      onProgress?.('Waiting for services to become healthy...')

      // Wait for services to become healthy
      const healthy = await this.waitForHealthy()
      if (healthy) {
        this.mode = DockerMode.RUNNING
        this.startHealthChecks()
        log('✅ All services are healthy and running')
        onProgress?.('Voice services ready!')
      } else {
        this.mode = DockerMode.ERROR
        throw new Error('Services failed to become healthy within timeout')
      }
    } catch (error) {
      log('❌ Failed to start services:', error)
      this.mode = DockerMode.ERROR
      onProgress?.(
        'Failed to start services: ' + (error instanceof Error ? error.message : 'Unknown error')
      )
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
    const servicesDir = this.getServicesPath()

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
   * Get build state
   */
  getBuildState(): BuildState {
    return { ...this.buildState }
  }

  /**
   * Reset build state (force rebuild on next start)
   */
  async resetBuildState(): Promise<void> {
    this.buildState = { imagesBuilt: false }
    await this.saveBuildState()
    log('Build state reset')
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
  getServiceUrls(): { whisper: string; piper: string } {
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
