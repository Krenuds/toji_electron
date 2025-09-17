import { app } from 'electron'
import { join } from 'path'
import { mkdirSync, existsSync } from 'fs'
import { chmod } from 'fs/promises'
import { createWriteStream } from 'fs'
import { pipeline } from 'stream/promises'
import { Readable } from 'stream'

export class OpenCodeService {
  private binDir: string
  private dataDir: string

  constructor() {
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
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    await pipeline(Readable.fromWeb(response.body as any), fileStream)

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
}
