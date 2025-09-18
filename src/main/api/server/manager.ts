// ============================================
// Server Manager - OpenCode Server Lifecycle
// ============================================

import { createOpencodeServer } from '@opencode-ai/sdk'
import type { ServerOptions } from '@opencode-ai/sdk'
import type { OpenCodeService } from '../../services/opencode-service'
import { readFile } from 'fs/promises'
import { join } from 'path'
import { app } from 'electron'

/**
 * Manages OpenCode server lifecycle and configuration.
 * This wraps createOpencodeServer and handles server state management.
 */
export class ServerManager {
  private currentServer: { close: () => void } | null = null
  private currentOptions?: ServerOptions
  private currentDirectory?: string

  constructor(private opencodeService: OpenCodeService) {}

  /**
   * Start OpenCode server with specified options
   */
  async start(directory: string, options: ServerOptions = {}): Promise<void> {
    // Stop any existing server first
    await this.stop()

    // Ensure binary is available through service
    const binaryInfo = this.opencodeService.getBinaryInfo()
    if (!binaryInfo.installed) {
      throw new Error('OpenCode binary not installed. Install it first.')
    }

    // Prepare default server options
    const defaultOptions: ServerOptions = {
      hostname: '127.0.0.1',
      port: 4096,
      timeout: 5000,
      config: {
        model: 'opencode/grok-code'
      }
    }

    // Merge user options with defaults, properly handling nested config
    const finalOptions: ServerOptions = {
      ...defaultOptions,
      ...options,
      config: {
        ...defaultOptions.config,
        ...options.config
      }
    }

    console.log(`ServerManager: Starting OpenCode server in ${directory}`)
    console.log(`ServerManager: Options:`, finalOptions)

    try {
      // Start the server using OpenCode SDK
      this.currentServer = await createOpencodeServer(finalOptions)
      this.currentOptions = finalOptions
      this.currentDirectory = directory

      console.log(`ServerManager: Server started at ${this.buildServerUrl()}`)
    } catch (error) {
      console.error('ServerManager: Failed to start server:', error)
      throw error
    }
  }

  /**
   * Stop the current server
   */
  async stop(): Promise<void> {
    if (this.currentServer) {
      console.log('ServerManager: Stopping OpenCode server')
      this.currentServer.close()
      console.log('ServerManager: Server stopped')
    }
  }

  /**
   * Restart server with same options
   */
  async restart(): Promise<void> {
    if (!this.currentDirectory || !this.currentOptions) {
      throw new Error('Cannot restart - no previous server configuration')
    }

    const directory = this.currentDirectory
    const options = this.currentOptions

    await this.stop()
    await this.start(directory, options)
  }

  /**
   * Get current server status
   */
  getStatus(): { running: boolean; url?: string; options?: ServerOptions; directory?: string } {
    return {
      running: this.currentServer !== null,
      url: this.currentServer ? this.buildServerUrl() : undefined,
      options: this.currentOptions,
      directory: this.currentDirectory
    }
  }

  /**
   * Get the server URL if running
   */
  getUrl(): string | null {
    return this.currentServer ? this.buildServerUrl() : null
  }

  /**
   * Check if server is currently running
   */
  isRunning(): boolean {
    return this.currentServer !== null
  }

  /**
   * Get OpenCode server logs
   */
  async getLogs(): Promise<string> {
    try {
      // OpenCode logs are stored in ~/.local/share/opencode/log/ by default
      // Even with custom XDG_DATA_HOME, OpenCode seems to use the default location
      const homeDir = app.getPath('home')
      const logDir = join(homeDir, '.local', 'share', 'opencode', 'log')

      // Also try our custom location as fallback
      const userDataPath = app.getPath('userData')
      const customLogDir = join(userDataPath, 'opencode-data', 'log')

      const possibleLogDirs = [logDir, customLogDir]

      for (const currentLogDir of possibleLogDirs) {
        try {
          // Read directory and find the most recent log file
          const { readdir } = await import('fs/promises')
          const files = await readdir(currentLogDir)

          // Filter for .log files and sort by name (timestamp) to get the most recent
          const logFiles = files
            .filter(file => file.endsWith('.log'))
            .sort()
            .reverse() // Most recent first

          if (logFiles.length > 0) {
            const mostRecentLog = logFiles[0]
            const logPath = join(currentLogDir, mostRecentLog)
            const logContent = await readFile(logPath, 'utf-8')

            // Return the most recent log with a header
            return `=== OpenCode Logs (${mostRecentLog}) ===\n\n${logContent}`
          }
        } catch (error) {
          // Continue to next directory
          continue
        }
      }

      // If no log files found in any directory
      return `No OpenCode log files found.\nSearched directories:\n- ${logDir}\n- ${customLogDir}`

    } catch (error) {
      console.error('ServerManager: Failed to read logs:', error)
      return `Error reading OpenCode logs: ${error instanceof Error ? error.message : 'Unknown error'}`
    }
  }

  private buildServerUrl(): string {
    const hostname = this.currentOptions?.hostname || '127.0.0.1'
    const port = this.currentOptions?.port || 4096
    return `http://${hostname}:${port}`
  }
}
