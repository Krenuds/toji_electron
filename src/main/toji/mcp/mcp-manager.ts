// MCP Server Manager - Creates and manages MCP servers per project
import { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js'
import { StreamableHTTPServerTransport } from '@modelcontextprotocol/sdk/server/streamableHttp.js'
import express from 'express'
import type { Server } from 'http'
import type { OpencodeClient } from '@opencode-ai/sdk'
import type { McpServerInstance, McpServerOptions } from './types'
import { registerDiscordMessageTool, type DiscordMessageFetcher } from './tools/discord-messages'
import { registerDiscordUploadTool, type DiscordFileUploader } from './tools/discord-upload'
import {
  registerDiscordListChannelsTool,
  type DiscordChannelLister
} from './tools/discord-list-channels'
import {
  registerDiscordChannelInfoTool,
  type DiscordChannelInfoProvider
} from './tools/discord-channel-info'
import {
  registerDiscordSearchMessagesTool,
  type DiscordMessageSearcher
} from './tools/discord-search-messages'
import {
  registerDiscordCreateChannelTool,
  type DiscordChannelCreator
} from './tools/discord-create-channel'
import {
  registerDiscordDeleteChannelTool,
  type DiscordChannelDeleter
} from './tools/discord-delete-channel'
import {
  registerDiscordEditChannelTool,
  type DiscordChannelEditor
} from './tools/discord-edit-channel'
import { registerClearSessionTool } from './tools/clear-session'
import { registerReadSessionTool } from './tools/read-session'
import { registerListSessionsTool } from './tools/list-sessions'
import { registerInitializeProjectTool } from './tools/initialize-project'
import type { SessionManager } from '../sessions'
import type { ITojiCore } from '../interfaces'
import { createLogger } from '../../utils/logger'
import { normalizePath } from '../../utils/path'
import { promises as fs, existsSync } from 'fs'
import path from 'path'
import { platform } from 'os'

const logger = createLogger('mcp:manager')

// Start port range for MCP servers
const BASE_PORT = 3100

/**
 * Check if a directory is a protected system location that requires elevated permissions
 * @param directory The directory path to check
 * @returns True if the directory is protected (root drive on Windows, / on Unix)
 */
function isProtectedDirectory(directory: string): boolean {
  if (platform() === 'win32') {
    // Check if it's a root drive (C:\, D:\, etc.) - requires admin rights
    return /^[A-Z]:\\?$/i.test(directory)
  }
  // On Unix-like systems, check for root
  return directory === '/'
}

export class McpManager {
  private servers: Map<string, McpServerInstance> = new Map()
  private httpServers: Map<string, Server> = new Map()
  private services = new Map<string, unknown>()
  private getClientFn?: () => OpencodeClient | null
  private getCurrentProjectPathFn?: () => string | undefined
  private sessionManager?: SessionManager
  private getTojiFn?: () => ITojiCore | null
  private portCounter = BASE_PORT

  constructor() {
    logger.debug('McpManager initialized')
  }

  // ========================================================================================
  // Service Registry
  // ========================================================================================

  /**
   * Register a service for MCP tools
   * This replaces the old individual setters for better extensibility
   */
  registerService<T>(name: string, service: T): void {
    logger.debug('Registering service: %s', name)
    this.services.set(name, service)

    // Register tool with all existing MCP servers
    this.registerServiceWithAllServers(name, service)
  }

  /**
   * Get a registered service
   */
  getService<T>(name: string): T | undefined {
    return this.services.get(name) as T | undefined
  }

  /**
   * Register service with all existing MCP servers
   */
  private registerServiceWithAllServers(name: string, service: unknown): void {
    for (const [dir, instance] of this.servers.entries()) {
      try {
        this.registerServiceWithServer(instance.server, name, service)
        logger.debug('Registered service %s for existing server: %s', name, dir)
      } catch (error) {
        logger.debug('Warning: Failed to register service %s for %s: %o', name, dir, error)
      }
    }
  }

  /**
   * Register service tool with a specific MCP server based on service name
   */
  private registerServiceWithServer(server: McpServer, name: string, service: unknown): void {
    switch (name) {
      case 'discord:messages':
        registerDiscordMessageTool(server, service as DiscordMessageFetcher)
        break
      case 'discord:upload':
        registerDiscordUploadTool(server, service as DiscordFileUploader)
        break
      case 'discord:channels':
        registerDiscordListChannelsTool(server, service as DiscordChannelLister)
        break
      case 'discord:channel-info':
        registerDiscordChannelInfoTool(server, service as DiscordChannelInfoProvider)
        break
      case 'discord:search':
        registerDiscordSearchMessagesTool(server, service as DiscordMessageSearcher)
        break
      case 'discord:create-channel':
        registerDiscordCreateChannelTool(server, service as DiscordChannelCreator)
        break
      case 'discord:delete-channel':
        registerDiscordDeleteChannelTool(server, service as DiscordChannelDeleter)
        break
      case 'discord:edit-channel':
        registerDiscordEditChannelTool(server, service as DiscordChannelEditor)
        break
      default:
        logger.debug('Unknown service name: %s', name)
    }
  }

  /**
   * Set Toji instance getter for project initialization tool
   */
  setTojiInstance(getToji: () => ITojiCore | null): void {
    logger.debug('Toji instance configured for MCP tools')
    this.getTojiFn = getToji

    // Register initialize project tool with all existing MCP servers
    for (const [dir, instance] of this.servers.entries()) {
      try {
        registerInitializeProjectTool(instance.server, { getToji })
        logger.debug('Registered initialize project tool for existing server: %s', dir)
      } catch (error) {
        logger.debug('Warning: Failed to register initialize project tool for %s: %o', dir, error)
      }
    }
  }

  /**
   * Set OpenCode session dependencies for clear session tool
   */
  setSessionDependencies(
    getClient: () => OpencodeClient | null,
    getCurrentProjectPath: () => string | undefined,
    sessionManager: SessionManager
  ): void {
    logger.debug('Session dependencies configured for MCP tools')
    this.getClientFn = getClient
    this.getCurrentProjectPathFn = getCurrentProjectPath
    this.sessionManager = sessionManager

    // Register session tools with all existing MCP servers
    for (const [dir, instance] of this.servers.entries()) {
      try {
        registerClearSessionTool(instance.server, {
          getClient,
          getCurrentProjectPath,
          sessionManager
        })
        registerReadSessionTool(instance.server, {
          getClient,
          getCurrentProjectPath,
          sessionManager
        })
        registerListSessionsTool(instance.server, {
          getClient,
          getCurrentProjectPath,
          sessionManager
        })
        logger.debug('Registered session tools for existing server: %s', dir)
      } catch (error) {
        logger.debug('Warning: Failed to register session tools for %s: %o', dir, error)
      }
    }
  }

  /**
   * Get next available port for MCP server
   */
  private getNextPort(): number {
    return this.portCounter++
  }

  /**
   * Write opencode.json configuration with MCP server
   * IMPORTANT: Merges with existing config to preserve user settings
   * Skips writing for protected directories (root drives) to avoid permission errors
   */
  private async writeOpencodeConfig(projectDirectory: string, mcpPort: number): Promise<void> {
    // Skip writing for protected directories (root drives on Windows, / on Unix)
    if (isProtectedDirectory(projectDirectory)) {
      logger.debug(
        'Skipping opencode.json write for protected directory: %s (requires elevation)',
        projectDirectory
      )
      return
    }

    const configPath = path.join(projectDirectory, 'opencode.json')
    logger.debug('Writing opencode.json to %s', configPath)

    // Read existing config if it exists
    let existingConfig: Record<string, unknown> = {}
    try {
      if (existsSync(configPath)) {
        const existingContent = await fs.readFile(configPath, 'utf-8')
        existingConfig = JSON.parse(existingContent)
        logger.debug('Loaded existing opencode.json config for merging')
      }
    } catch (error) {
      logger.debug('Warning: Could not read existing opencode.json, creating new: %o', error)
    }

    // Merge MCP config with existing config
    const config = {
      $schema: 'https://opencode.ai/config.json',
      ...existingConfig, // Preserve all existing settings
      mcp: {
        toji: {
          type: 'remote',
          url: `http://localhost:${mcpPort}/mcp`,
          enabled: true
        }
      }
    }

    try {
      await fs.writeFile(configPath, JSON.stringify(config, null, 2), 'utf-8')
      logger.debug('Successfully wrote opencode.json with MCP config (merged with existing)')
    } catch (error) {
      logger.debug('Warning: Failed to write opencode.json: %o', error)
    }
  }

  /**
   * Create an MCP server for a project
   */
  async createServerForProject(options: McpServerOptions): Promise<McpServerInstance> {
    const { projectDirectory } = options
    const normalized = normalizePath(projectDirectory)
    logger.debug('Creating MCP server for project: %s', normalized)

    // Check if we already have a server for this project
    if (this.servers.has(normalized)) {
      logger.debug('MCP server already exists for project: %s', normalized)
      return this.servers.get(normalized)!
    }

    // Allocate a port for this server
    const port = this.getNextPort()
    logger.debug('Allocated port %d for project: %s', port, normalized)

    // Create MCP server instance
    const server = new McpServer({
      name: 'toji',
      version: '1.0.0'
    })

    // Register session tools if dependencies available
    if (this.getClientFn && this.getCurrentProjectPathFn && this.sessionManager) {
      registerClearSessionTool(server, {
        getClient: this.getClientFn,
        getCurrentProjectPath: this.getCurrentProjectPathFn,
        sessionManager: this.sessionManager
      })
      registerReadSessionTool(server, {
        getClient: this.getClientFn,
        getCurrentProjectPath: this.getCurrentProjectPathFn,
        sessionManager: this.sessionManager
      })
      registerListSessionsTool(server, {
        getClient: this.getClientFn,
        getCurrentProjectPath: this.getCurrentProjectPathFn,
        sessionManager: this.sessionManager
      })
    }

    const tools: string[] = ['read-session', 'list-sessions']

    // Register all services with this server
    for (const [name, service] of this.services.entries()) {
      try {
        this.registerServiceWithServer(server, name, service)
        tools.push(name)
      } catch (error) {
        logger.debug('Warning: Failed to register service %s: %o', name, error)
      }
    }

    // Register project initialization tool if Toji instance available
    if (this.getTojiFn) {
      registerInitializeProjectTool(server, { getToji: this.getTojiFn })
      tools.push('init-project')
    }

    logger.debug('Registered %d MCP tools for %s: [%s]', tools.length, normalized, tools.join(', '))

    // Create Express app
    const app = express()
    app.use(express.json())

    app.post('/mcp', async (req, res) => {
      try {
        // Create a new transport for each request to prevent ID collisions
        const transport = new StreamableHTTPServerTransport({
          sessionIdGenerator: undefined,
          enableJsonResponse: true
        })

        res.on('close', () => {
          transport.close()
        })

        await server.connect(transport)
        await transport.handleRequest(req, res, req.body)
      } catch (error) {
        logger.debug('Error handling MCP request: %o', error)
        if (!res.headersSent) {
          res.status(500).json({ error: String(error) })
        }
      }
    })

    // Start HTTP server
    const httpServer = app.listen(port, () => {
      logger.debug('MCP HTTP server listening on port %d for project %s', port, normalized)
    })

    // Write opencode.json with MCP configuration
    await this.writeOpencodeConfig(normalized, port)

    const instance: McpServerInstance = {
      server,
      projectDirectory: normalized,
      port
    }

    this.servers.set(normalized, instance)
    this.httpServers.set(normalized, httpServer)
    logger.debug('MCP server created and connected for %s on port %d', normalized, port)

    return instance
  }

  /**
   * Get MCP server for a project
   */
  getServer(projectDirectory: string): McpServerInstance | undefined {
    const normalized = normalizePath(projectDirectory)
    return this.servers.get(normalized)
  }

  /**
   * Close MCP server for a project
   */
  async closeServer(projectDirectory: string): Promise<void> {
    const normalized = normalizePath(projectDirectory)
    const instance = this.servers.get(normalized)
    const httpServer = this.httpServers.get(normalized)

    if (instance) {
      logger.debug('Closing MCP server for %s', normalized)

      // Close HTTP server
      if (httpServer) {
        await new Promise<void>((resolve) => {
          httpServer.close(() => {
            logger.debug('HTTP server closed for %s', normalized)
            resolve()
          })
        })
        this.httpServers.delete(normalized)
      }

      this.servers.delete(normalized)
      logger.debug('MCP server closed for %s', normalized)
    }
  }

  /**
   * Close all MCP servers
   */
  async closeAll(): Promise<void> {
    logger.debug('Closing all MCP servers')
    const directories = Array.from(this.servers.keys())
    await Promise.all(directories.map((dir) => this.closeServer(dir)))
    logger.debug('All MCP servers closed')
  }

  /**
   * Get all active MCP servers
   */
  getAllServers(): Map<string, McpServerInstance> {
    return new Map(this.servers)
  }
}
