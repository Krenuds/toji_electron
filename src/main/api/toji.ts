// ============================================
// Toji - Main API Orchestrator Class
// ============================================

import type { TojiConfig, TojiStatus } from './types'
import type { OpenCodeService } from '../services/opencode-service'
import { ServerManager } from './server'
import { ClientManager } from './client'
import { WorkspaceManager } from './workspace'
import { SessionManager } from './session'
import { ProjectManager } from './project'

/**
 * Toji - The main API orchestrator class that provides a unified interface
 * to all OpenCode functionality plus custom enhancements.
 *
 * This is THE API that all interfaces (Electron, Discord, Slack, etc.)
 * will interact with. It orchestrates all managers and provides high-level
 * business logic operations.
 */
export class Toji {
  // Core OpenCode managers
  public readonly server: ServerManager
  public readonly client: ClientManager
  public readonly workspace: WorkspaceManager
  public readonly session: SessionManager
  public readonly project: ProjectManager

  constructor(
    // Services are injected - Toji orchestrates, doesn't implement
    private opencodeService: OpenCodeService
  ) {
    // Initialize all managers with proper dependencies
    this.server = new ServerManager(this.opencodeService)
    this.client = new ClientManager()
    this.workspace = new WorkspaceManager()
    this.session = new SessionManager(this.client)
    this.project = new ProjectManager(this.client)

    console.log('Toji: Main API orchestrator initialized')
  }

  /**
   * Initialize Toji with a workspace and configuration
   * This is the main entry point for setting up OpenCode
   */
  async initialize(directory: string, config: TojiConfig = {}): Promise<void> {
    console.log(`Toji: Initializing OpenCode in ${directory}`)

    try {
      // 1. Prepare workspace
      await this.workspace.prepare(directory)

      // 2. Start server with configuration
      const serverOptions = {
        hostname: config.server?.hostname,
        port: config.server?.port,
        timeout: config.server?.timeout,
        config: {
          // Add any model configuration here
        }
      }
      await this.server.start(directory, serverOptions)

      // 3. Connect client to the started server
      const serverUrl = this.server.getUrl()
      if (!serverUrl) {
        throw new Error('Server started but URL not available')
      }
      await this.client.connect(serverUrl)

      // 4. Log project info
      await this.project.logInfo()

      console.log('Toji: Initialization complete!')
    } catch (error) {
      console.error('Toji: Initialization failed:', error)
      await this.shutdown() // Clean up on failure
      throw error
    }
  }

  /**
   * Shutdown Toji cleanly
   */
  async shutdown(): Promise<void> {
    console.log('Toji: Shutting down OpenCode')

    try {
      // 1. Disconnect client
      await this.client.disconnect()

      // 2. Stop server
      await this.server.stop()

      // 3. Return to original directory
      await this.workspace.returnToOriginal()

      console.log('Toji: Shutdown complete')
    } catch (error) {
      console.error('Toji: Error during shutdown:', error)
      throw error
    }
  }

  /**
   * Get overall Toji status
   */
  getStatus(): TojiStatus {
    return {
      server: this.server.getStatus(),
      client: this.client.getConnectionInfo(),
      workspace: this.workspace.getStatus()
    }
  }

  /**
   * Quick start method for common workflow
   */
  async quickStart(directory: string): Promise<void> {
    console.log(`Toji: Quick starting OpenCode in ${directory}`)

    // Initialize with sensible defaults
    await this.initialize(directory, {
      server: {
        hostname: '127.0.0.1',
        port: 4096,
        timeout: 5000
      },
      workspace: {
        autoInit: true,
        gitInit: true
      }
    })

    console.log('Toji: Quick start complete - ready for interaction!')
  }

  /**
   * Check if Toji is ready for operations
   */
  isReady(): boolean {
    return this.server.isRunning() && this.client.isConnected()
  }
}
