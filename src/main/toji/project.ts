// Project management module for Toji
import type { OpencodeClient, Config, Project } from '@opencode-ai/sdk'
import { app } from 'electron'
import { join } from 'path'
import type { ConfigProvider } from '../config/ConfigProvider'
import type { ServerManager } from './server'
import { createFileDebugLogger } from '../utils/logger'

const log = createFileDebugLogger('toji:project')
// const logSDK = createFileDebugLogger('toji:project:sdk') // Reserved for future SDK operations

export interface ProjectInfo {
  path: string
  name: string
  isOpen: boolean
  port?: number
  config?: Partial<Config>
  sdkProject?: Project // Original SDK project data
}

export class ProjectManager {
  constructor(
    private getClient: () => OpencodeClient | undefined,
    private server?: ServerManager,
    private config?: ConfigProvider,
    private toji?: { connectClientToProject: (directory: string) => Promise<void> }
  ) {}

  /**
   * List all projects from the OpenCode client
   */
  async list(): Promise<unknown[]> {
    const client = this.getClient()
    if (!client) {
      throw new Error('OpenCode client not initialized')
    }

    // Call the OpenCode SDK's project.list() method
    const response = await client.project.list()
    return response.data || []
  }

  /**
   * Get the current project from the OpenCode client
   */
  async getCurrent(): Promise<unknown | null> {
    const client = this.getClient()
    if (!client) {
      throw new Error('OpenCode client not initialized')
    }

    try {
      const response = await client.project.current()
      return response.data || null
    } catch {
      // No current project is not an error
      return null
    }
  }

  /**
   * Create new project (just saves config, doesn't open)
   */
  async createProject(directory: string, config?: Partial<Config>): Promise<void> {
    if (!this.config) {
      throw new Error('ConfigProvider not available')
    }

    const defaultConfig: Partial<Config> = {
      model: 'anthropic/claude-3-5-sonnet-20241022',
      ...config
    }

    this.config.setProjectConfig(directory, defaultConfig)
    this.config.addRecentProject(directory)
  }

  /**
   * Open project (starts server)
   */
  async openProject(directory: string): Promise<number> {
    log('Opening project: %s', directory)

    if (!this.server || !this.config || !this.toji) {
      const error = new Error('ServerManager, ConfigProvider, or Toji not available')
      log('ERROR: %s', error.message)
      throw error
    }

    // Get project configuration
    const config = this.config.getProjectConfig(directory)
    log('Project config: %o', config)

    try {
      // Start server for this project
      log('Starting server for project...')
      const port = await this.server.start(directory, config)
      log('Server started successfully on port %d', port)

      // Connect client to this project's server
      log('Connecting client to project server...')
      await this.toji.connectClientToProject(directory)
      log('Client connected successfully')

      // Mark project as open and active
      this.config.setProjectOpen(directory, true, port)
      this.config.setCurrentProjectPath(directory)
      log('Project marked as open and active: %s', directory)

      return port
    } catch (error) {
      log('ERROR: Failed to open project %s: %o', directory, error)
      throw error
    }
  }

  /**
   * Close project (stops server)
   */
  async closeProject(directory: string): Promise<void> {
    if (!this.server || !this.config) {
      throw new Error('ServerManager or ConfigProvider not available')
    }

    await this.server.stop(directory)
    this.config.setProjectOpen(directory, false)
  }

  /**
   * Set active/focused project
   */
  async setActiveProject(directory: string): Promise<void> {
    if (!this.config || !this.server) {
      throw new Error('ConfigProvider or ServerManager not available')
    }

    this.config.setCurrentProjectPath(directory)

    // TODO: Reconnect client to this project's server
    // This will need to be handled by the parent Toji class
  }

  /**
   * Get all projects with their states (uses SDK as source of truth)
   */
  async getAllProjects(): Promise<ProjectInfo[]> {
    if (!this.config) {
      throw new Error('ConfigProvider not available')
    }

    const projectMap = new Map<string, ProjectInfo>()

    // Get SDK projects if client is available
    try {
      const client = this.getClient()
      if (client) {
        const sdkProjects = await client.project.list()
        const sdkData = sdkProjects.data || []

        // Add all SDK projects
        for (const project of sdkData as Project[]) {
          const path = project.worktree // SDK project has typed worktree property
          projectMap.set(path, {
            path,
            name: path.split(/[/\\]/).pop() || path,
            isOpen: false, // Will be updated below
            config: this.config.getProjectConfig(path),
            sdkProject: project
          })
        }
      }
    } catch (error) {
      console.warn('Failed to get SDK projects:', error)
    }

    // Add recent projects not in SDK
    const recent = this.config.getRecentProjects()
    for (const path of recent) {
      if (!projectMap.has(path)) {
        projectMap.set(path, {
          path,
          name: path.split(/[/\\]/).pop() || path,
          isOpen: false,
          config: this.config.getProjectConfig(path),
          sdkProject: undefined
        })
      }
    }

    // Update with server state
    if (this.server) {
      const servers = this.server.getRunningServers()
      for (const [path, serverInstance] of servers) {
        const project = projectMap.get(path)
        if (project) {
          project.isOpen = true
          project.port = serverInstance.port
        } else {
          // Server running for unknown project
          projectMap.set(path, {
            path,
            name: path.split(/[/\\]/).pop() || path,
            isOpen: true,
            port: serverInstance.port,
            config: this.config.getProjectConfig(path),
            sdkProject: undefined
          })
        }
      }
    }

    return Array.from(projectMap.values())
  }

  /**
   * Get the path to the projects data folder
   * Uses XDG_DATA_HOME set by OpenCodeService for cross-platform compatibility
   */
  getDataPath(): string {
    // Use XDG_DATA_HOME set by OpenCodeService, fallback to userData
    const dataHome = process.env.XDG_DATA_HOME || join(app.getPath('userData'), 'opencode-data')
    return join(dataHome, 'opencode', 'storage', 'project')
  }
}
