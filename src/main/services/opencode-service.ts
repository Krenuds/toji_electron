import { join } from 'path'
import { mkdirSync, existsSync } from 'fs'
import { chmod } from 'fs/promises'
import { createWriteStream } from 'fs'
import { pipeline } from 'stream/promises'
import { Readable } from 'stream'
import { homedir } from 'os'

export class OpenCodeService {
  private binDir: string

  constructor() {
    // Use OpenCode's standard binary location
    this.binDir = join(homedir(), '.local', 'share', 'opencode', 'bin')
    this.setupEnvironment()
  }

  private setupEnvironment(): void {
    // Create OpenCode's standard binary directory
    if (!existsSync(this.binDir)) {
      mkdirSync(this.binDir, { recursive: true })
    }

    // Add OpenCode's standard bin directory to PATH
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
