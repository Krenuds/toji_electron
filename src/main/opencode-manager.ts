import { app } from 'electron'
import { join } from 'path'
import { mkdirSync, existsSync } from 'fs'
import { chmod, stat } from 'fs/promises'
import { createWriteStream } from 'fs'
import { pipeline } from 'stream/promises'
import { createOpencodeServer } from '@opencode-ai/sdk'

export interface OpenCodeConfig {
  model?: string
  hostname?: string
  port?: number
  timeout?: number
}

export interface BinaryInfo {
  path: string
  version?: string
  installed: boolean
  lastChecked: Date
}

export interface ServerStatus {
  running: boolean
  url?: string
  error?: string
}

export class OpenCodeManager {
  private binDir: string
  private dataDir: string
  private server: any = null
  private config: OpenCodeConfig

  constructor(config: OpenCodeConfig = {}) {
    this.config = {
      hostname: '127.0.0.1',
      port: 4096,
      timeout: 5000,
      model: 'anthropic/claude-3-5-sonnet-20241022',
      ...config
    }

    // Setup paths using Electron's userData directory
    const userDataPath = app.getPath('userData')
    this.binDir = join(userDataPath, 'opencode-bin')
    this.dataDir = join(userDataPath, 'opencode-data')

    this.setupEnvironment()
  }

  private setupEnvironment(): void {
    // Create all required directories for OpenCode SDK
    const requiredDirs = [
      this.binDir,
      join(this.dataDir, 'bin'),    // SDK working directory
      join(this.dataDir, 'data'),
      join(this.dataDir, 'config'),
      join(this.dataDir, 'state'),
      join(this.dataDir, 'log')
    ]

    requiredDirs.forEach(dir => {
      if (!existsSync(dir)) {
        mkdirSync(dir, { recursive: true })
      }
    })

    // Set environment variables for OpenCode SDK
    process.env.OPENCODE_INSTALL_DIR = this.binDir
    process.env.XDG_DATA_HOME = this.dataDir

    console.log('OpenCode environment configured:')
    console.log('  Binary directory:', this.binDir)
    console.log('  Data directory:', this.dataDir)
  }

  async getBinaryInfo(): Promise<BinaryInfo> {
    const platform = process.platform
    const binaryName = platform === 'win32' ? 'opencode.exe' : 'opencode'
    const binaryPath = join(this.binDir, binaryName)

    const info: BinaryInfo = {
      path: binaryPath,
      installed: existsSync(binaryPath),
      lastChecked: new Date()
    }

    if (info.installed) {
      try {
        const stats = await stat(binaryPath)
        info.version = `Size: ${stats.size} bytes, Modified: ${stats.mtime.toISOString()}`
      } catch (error) {
        console.warn('Could not read binary stats:', error)
      }
    }

    return info
  }

  async downloadBinary(): Promise<void> {
    const platform = process.platform
    const arch = process.arch
    const binaryName = platform === 'win32' ? 'opencode.exe' : 'opencode'
    const binaryPath = join(this.binDir, binaryName)

    console.log('Downloading OpenCode binary...')

    // Platform and architecture mapping based on OpenCode repository
    const platformMap: Record<string, string> = {
      'win32': 'windows',
      'darwin': 'darwin', 
      'linux': 'linux'
    }

    const archMap: Record<string, string> = {
      'x64': 'x64',
      'arm64': 'arm64'
    }

    if (!platformMap[platform] || !archMap[arch]) {
      throw new Error(`Unsupported platform/architecture: ${platform}/${arch}`)
    }

    // For x64 architecture, we might need the baseline version for better compatibility
    const archSuffix = arch === 'x64' ? 'x64' : archMap[arch]
    
    // Construct download URL based on actual OpenCode release structure
    // Format: opencode-{platform}-{arch}.zip
    const zipName = `opencode-${platformMap[platform]}-${archSuffix}.zip`
    const downloadUrl = `https://github.com/sst/opencode/releases/latest/download/${zipName}`

    console.log('Download URL:', downloadUrl)

    try {
      const response = await fetch(downloadUrl)
      if (!response.ok) {
        throw new Error(`Failed to download OpenCode binary: ${response.status} ${response.statusText}`)
      }

      // Download the ZIP file to a temporary location
      const tempZipPath = join(this.binDir, 'opencode-temp.zip')
      const fileStream = createWriteStream(tempZipPath)
      await pipeline(response.body as any, fileStream)

      // Extract the binary from the ZIP
      await this.extractBinary(tempZipPath, binaryPath)

      // Clean up the temporary ZIP file
      const fs = await import('fs/promises')
      await fs.unlink(tempZipPath)

      // Make executable on Unix-like systems
      if (platform !== 'win32') {
        await chmod(binaryPath, '755')
      }

      console.log('OpenCode binary installed successfully!')
    } catch (error) {
      console.error('Failed to download OpenCode binary:', error)
      throw error
    }
  }

  private async extractBinary(zipPath: string, outputPath: string): Promise<void> {
    const AdmZip = (await import('adm-zip')).default
    const zip = new AdmZip(zipPath)
    const { dirname, basename } = await import('path')
    
    const entries = zip.getEntries()
    for (const entry of entries) {
      if (entry.entryName === 'opencode' || entry.entryName === 'opencode.exe') {
        // Extract to the directory, then rename to the final path
        const outputDir = dirname(outputPath)
        zip.extractEntryTo(entry, outputDir, false, true)
        
        // If the extracted file has a different name, rename it
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
    const info = await this.getBinaryInfo()
    if (!info.installed) {
      await this.downloadBinary()
    }
  }

  async startServer(): Promise<ServerStatus> {
    try {
      // Ensure binary is available
      await this.ensureBinary()

      // Create OpenCode server
      this.server = await createOpencodeServer({
        hostname: this.config.hostname,
        port: this.config.port,
        timeout: this.config.timeout,
        config: {
          model: this.config.model
        }
      })

      const url = `http://${this.config.hostname}:${this.config.port}`
      console.log('OpenCode server started successfully at:', url)

      return {
        running: true,
        url
      }
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Unknown error'
      console.error('Failed to start OpenCode server:', errorMessage)
      
      return {
        running: false,
        error: errorMessage
      }
    }
  }

  async stopServer(): Promise<void> {
    if (this.server) {
      try {
        await this.server.close()
        console.log('OpenCode server stopped')
      } catch (error) {
        console.error('Error stopping OpenCode server:', error)
      } finally {
        this.server = null
      }
    }
  }

  getServerStatus(): ServerStatus {
    if (this.server) {
      return {
        running: true,
        url: `http://${this.config.hostname}:${this.config.port}`
      }
    }
    return { running: false }
  }

  updateConfig(newConfig: Partial<OpenCodeConfig>): void {
    this.config = { ...this.config, ...newConfig }
  }

  async cleanup(): Promise<void> {
    await this.stopServer()
  }
}