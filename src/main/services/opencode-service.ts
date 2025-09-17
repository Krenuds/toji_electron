import { app } from 'electron'
import { join } from 'path'
import { mkdirSync, existsSync } from 'fs'
import { chmod } from 'fs/promises'
import { createWriteStream } from 'fs'
import { pipeline } from 'stream/promises'
import { createServer } from 'net'
import { createOpencodeServer } from '@opencode-ai/sdk'
import { Service, ServiceStatus } from '../core/core'
import type { ConfigProvider } from '../config/ConfigProvider'

export interface OpenCodeConfig {
  model?: string
  hostname?: string
  port?: number
  timeout?: number
}

export interface ServerStatus {
  running: boolean
  url?: string
  error?: string
  healthy?: boolean
  port?: number
  pid?: number
  lastHealthCheck?: Date
}

export class OpenCodeService implements Service {
  name = 'opencode'

  private binDir: string
  private dataDir: string
  private server: { close: () => void } | null = null
  private config: OpenCodeConfig
  private healthCheckInterval: NodeJS.Timeout | null = null

  constructor(
    private configProvider: ConfigProvider,
    config: OpenCodeConfig = {}
  ) {
    this.config = {
      hostname: '127.0.0.1',
      port: 4096,
      timeout: 5000,
      model: 'opencode/grok-code',
      ...config
    }

    const userDataPath = app.getPath('userData')
    this.binDir = join(userDataPath, 'opencode-bin')
    this.dataDir = join(userDataPath, 'opencode-data')

    this.setupEnvironment()
  }

  private setupEnvironment(): void {
    // Create binary directory for our downloaded OpenCode executable
    if (!existsSync(this.binDir)) {
      mkdirSync(this.binDir, { recursive: true })
    }

    // WORKAROUND: Create bin/ directory due to OpenCode bug #1856
    // https://github.com/sst/opencode/issues/1856
    // OpenCode fails to create this directory but requires it for operations
    const opencodeBindir = join(this.dataDir, 'bin')
    if (!existsSync(opencodeBindir)) {
      mkdirSync(opencodeBindir, { recursive: true })
    }

    process.env.OPENCODE_INSTALL_DIR = this.binDir
    process.env.XDG_DATA_HOME = this.dataDir

    const binaryName = process.platform === 'win32' ? 'opencode.exe' : 'opencode'
    process.env.OPENCODE_BIN_PATH = join(this.binDir, binaryName)

    const currentPath = process.env.PATH || ''
    const pathSeparator = process.platform === 'win32' ? ';' : ':'
    if (!currentPath.includes(this.binDir)) {
      process.env.PATH = this.binDir + pathSeparator + currentPath
    }
  }

  async start(): Promise<void> {
    try {
      await this.ensureBinary()
      await this.startServer()
    } catch (error) {
      console.error('OpenCode Service: Failed to start:', error)
      throw error
    }
  }

  async stop(): Promise<void> {
    this.stopHealthChecking()

    if (this.server) {
      this.server.close()
      this.server = null
    }
  }

  getStatus(): ServiceStatus {
    return {
      running: !!this.server,
      healthy: !!this.server,
      error: this.server ? undefined : 'Service not started',
      lastCheck: new Date()
    }
  }

  async downloadBinary(): Promise<void> {
    const platform = process.platform
    const arch = process.arch
    const binaryName = platform === 'win32' ? 'opencode.exe' : 'opencode'
    const binaryPath = join(this.binDir, binaryName)

    const platformMap: Record<string, string> = {
      win32: 'windows',
      darwin: 'darwin',
      linux: 'linux'
    }

    const archMap: Record<string, string> = {
      x64: 'x64',
      arm64: 'arm64'
    }

    if (!platformMap[platform] || !archMap[arch]) {
      throw new Error(`Unsupported platform/architecture: ${platform}/${arch}`)
    }

    const archSuffix = arch === 'x64' ? 'x64' : archMap[arch]
    const zipName = `opencode-${platformMap[platform]}-${archSuffix}.zip`
    const downloadUrl = `https://github.com/sst/opencode/releases/latest/download/${zipName}`

    const response = await fetch(downloadUrl)
    if (!response.ok) {
      throw new Error(
        `Failed to download OpenCode binary: ${response.status} ${response.statusText}`
      )
    }

    const tempZipPath = join(this.binDir, 'opencode-temp.zip')
    const fileStream = createWriteStream(tempZipPath)
    await pipeline(response.body as ReadableStream, fileStream)

    await this.extractBinary(tempZipPath, binaryPath)

    const fs = await import('fs/promises')
    await fs.unlink(tempZipPath)

    if (platform !== 'win32') {
      await chmod(binaryPath, '755')
    }
  }

  private async extractBinary(zipPath: string, outputPath: string): Promise<void> {
    const AdmZip = (await import('adm-zip')).default
    const zip = new AdmZip(zipPath)
    const { dirname } = await import('path')

    const entries = zip.getEntries()
    for (const entry of entries) {
      if (entry.entryName === 'opencode' || entry.entryName === 'opencode.exe') {
        const outputDir = dirname(outputPath)
        zip.extractEntryTo(entry, outputDir, false, true)

        const extractedPath = join(outputDir, entry.entryName)
        if (extractedPath !== outputPath) {
          const fs = await import('fs/promises')
          await fs.rename(extractedPath, outputPath)
        }
        return
      }
    }
    throw new Error('OpenCode binary not found in ZIP archive')
  }

  async ensureBinary(): Promise<void> {
    const binaryName = process.platform === 'win32' ? 'opencode.exe' : 'opencode'
    const binaryPath = join(this.binDir, binaryName)

    if (!existsSync(binaryPath)) {
      await this.downloadBinary()
    }
  }

  getBinaryInfo(): {
    path: string
    installed: boolean
    lastChecked: Date
  } {
    const binaryName = process.platform === 'win32' ? 'opencode.exe' : 'opencode'
    const binaryPath = join(this.binDir, binaryName)

    return {
      path: binaryPath,
      installed: existsSync(binaryPath),
      lastChecked: new Date()
    }
  }

  async startServer(): Promise<ServerStatus> {
    try {
      await this.ensureBinary()

      // Get configured working directory and ensure it exists
      const workingDirectory = this.configProvider.getOpencodeWorkingDirectory()
      console.log('OpenCode Service: Using working directory:', workingDirectory)

      if (!existsSync(workingDirectory)) {
        console.log('OpenCode Service: Creating working directory:', workingDirectory)
        mkdirSync(workingDirectory, { recursive: true })
      }

      // Change to the configured working directory before starting OpenCode
      const originalCwd = process.cwd()
      console.log('OpenCode Service: Changing from', originalCwd, 'to', workingDirectory)
      process.chdir(workingDirectory)

      // Check if port is already in use
      if (await this.isPortInUse(this.config.port!)) {
        return {
          running: false,
          error: `Port ${this.config.port} is already in use`,
          healthy: false
        }
      }

      this.server = await createOpencodeServer({
        hostname: this.config.hostname,
        port: this.config.port,
        timeout: this.config.timeout,
        config: {
          model: this.config.model
        }
      })

      const url = `http://${this.config.hostname}:${this.config.port}`

      // Wait a moment for server to fully start
      await new Promise((resolve) => setTimeout(resolve, 1000))

      // Perform initial health check
      const healthy = await this.performHealthCheck()

      if (!healthy) {
        console.warn('Server started but initial health check failed')
      }

      // Start periodic health checking
      this.startHealthChecking()

      return {
        running: true,
        url,
        healthy,
        port: this.config.port,
        lastHealthCheck: new Date()
      }
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Unknown error'
      console.error('Failed to start OpenCode server:', errorMessage)

      // Clean up if server creation failed
      this.server = null

      return {
        running: false,
        error: errorMessage,
        healthy: false
      }
    }
  }

  private async isPortInUse(port: number): Promise<boolean> {
    return new Promise((resolve) => {
      const server = createServer()

      server.listen(port, '127.0.0.1', () => {
        server.once('close', () => resolve(false))
        server.close()
      })

      server.on('error', () => resolve(true))
    })
  }

  private async performHealthCheck(): Promise<boolean> {
    if (!this.server) return false

    try {
      const url = `http://${this.config.hostname}:${this.config.port}`
      const controller = new AbortController()
      const timeout = setTimeout(() => controller.abort(), 3000)

      // Try a simple GET request to see if server responds
      const response = await fetch(url, {
        signal: controller.signal,
        method: 'GET'
      })

      clearTimeout(timeout)
      // Even if it returns 404, the server is responsive
      return response.status !== undefined
    } catch (error) {
      console.warn('Health check failed:', error)
      return false
    }
  }

  private startHealthChecking(): void {
    this.stopHealthChecking()

    this.healthCheckInterval = setInterval(async () => {
      if (this.server) {
        const healthy = await this.performHealthCheck()
        if (!healthy) {
          console.warn('OpenCode server health check failed')
          // Optionally emit event or take corrective action
        }
      }
    }, 30000) // Check every 30 seconds
  }

  private stopHealthChecking(): void {
    if (this.healthCheckInterval) {
      clearInterval(this.healthCheckInterval)
      this.healthCheckInterval = null
    }
  }

  async getServerStatus(): Promise<ServerStatus> {
    if (this.server) {
      const healthy = await this.performHealthCheck()
      return {
        running: true,
        url: `http://${this.config.hostname}:${this.config.port}`,
        healthy,
        port: this.config.port,
        lastHealthCheck: new Date()
      }
    }
    return {
      running: false,
      healthy: false
    }
  }

  async checkHealth(): Promise<boolean> {
    return await this.performHealthCheck()
  }

  updateConfig(newConfig: Partial<OpenCodeConfig>): void {
    this.config = { ...this.config, ...newConfig }
  }

  async cleanup(): Promise<void> {
    this.stopHealthChecking()
    await this.stop()
  }
}
