// ============================================
// Server Manager - OpenCode Server Lifecycle
// ============================================

import { createOpencodeServer } from '@opencode-ai/sdk'
import type { ServerOptions } from '@opencode-ai/sdk'
import type { OpenCodeService } from '../../services/opencode-service'

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
        model: 'anthropic/claude-3-5-sonnet-20241022'
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

  private buildServerUrl(): string {
    const hostname = this.currentOptions?.hostname || '127.0.0.1'
    const port = this.currentOptions?.port || 4096
    return `http://${hostname}:${port}`
  }
}
