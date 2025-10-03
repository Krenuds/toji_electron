// MCP Server Manager - Creates and manages MCP servers per project
import { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js'
import { StreamableHTTPServerTransport } from '@modelcontextprotocol/sdk/server/streamableHttp.js'
import express from 'express'
import type { Server } from 'http'
import type { OpencodeClient } from '@opencode-ai/sdk'
import type { McpServerInstance, McpServerOptions } from './types'
import { registerDiscordMessageTool, type DiscordMessageFetcher } from './tools/discord-messages'
import { registerClearSessionTool } from './tools/clear-session'
import { registerReadSessionTool } from './tools/read-session'
import type { SessionManager } from '../sessions'
import { createFileDebugLogger } from '../../utils/logger'
import { normalizePath } from '../../utils/path'
import { promises as fs } from 'fs'
import path from 'path'

const log = createFileDebugLogger('mcp:manager')

// Start port range for MCP servers
const BASE_PORT = 3100

export class McpManager {
  private servers: Map<string, McpServerInstance> = new Map()
  private httpServers: Map<string, Server> = new Map()
  private messageFetcher?: DiscordMessageFetcher
  private getClientFn?: () => OpencodeClient | null
  private getCurrentProjectPathFn?: () => string | undefined
  private sessionManager?: SessionManager
  private portCounter = BASE_PORT

  constructor() {
    log('McpManager initialized')
  }

  /**
   * Set OpenCode session dependencies for clear session tool
   */
  setSessionDependencies(
    getClient: () => OpencodeClient | null,
    getCurrentProjectPath: () => string | undefined,
    sessionManager: SessionManager
  ): void {
    log('Session dependencies configured for MCP tools')
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
        log('Registered session tools for existing server: %s', dir)
      } catch (error) {
        log('Warning: Failed to register session tools for %s: %o', dir, error)
      }
    }
  }

  /**
   * Set the Discord message fetcher for all MCP servers
   * This will register the Discord tool with all existing servers
   */
  setDiscordMessageFetcher(fetcher: DiscordMessageFetcher): void {
    log('Discord message fetcher configured')
    this.messageFetcher = fetcher

    // Register Discord tool with all existing MCP servers
    for (const [dir, instance] of this.servers.entries()) {
      try {
        registerDiscordMessageTool(instance.server, fetcher)
        log('Registered Discord tool for existing server: %s', dir)
      } catch (error) {
        log('Warning: Failed to register Discord tool for %s: %o', dir, error)
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
   */
  private async writeOpencodeConfig(projectDirectory: string, mcpPort: number): Promise<void> {
    const configPath = path.join(projectDirectory, 'opencode.json')
    log('Writing opencode.json to %s', configPath)

    const config = {
      $schema: 'https://opencode.ai/config.json',
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
      log('Successfully wrote opencode.json with MCP config')
    } catch (error) {
      log('Warning: Failed to write opencode.json: %o', error)
    }
  }

  /**
   * Create an MCP server for a project
   */
  async createServerForProject(options: McpServerOptions): Promise<McpServerInstance> {
    const { projectDirectory } = options
    const normalized = normalizePath(projectDirectory)
    log('Creating MCP server for project: %s', normalized)

    // Check if we already have a server for this project
    if (this.servers.has(normalized)) {
      log('MCP server already exists for project: %s', normalized)
      return this.servers.get(normalized)!
    }

    // Allocate a port for this server
    const port = this.getNextPort()
    log('Allocated port %d for project: %s', port, normalized)

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
      log('Registered session tools for new server: %s', normalized)
    }

    // Register Discord message tool if fetcher is available
    if (this.messageFetcher) {
      registerDiscordMessageTool(server, this.messageFetcher)
      log('Registered Discord tool for new server: %s', normalized)
    }

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
        log('Error handling MCP request: %o', error)
        if (!res.headersSent) {
          res.status(500).json({ error: String(error) })
        }
      }
    })

    // Start HTTP server
    const httpServer = app.listen(port, () => {
      log('MCP HTTP server listening on port %d for project %s', port, normalized)
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
    log('MCP server created and connected for %s on port %d', normalized, port)

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
      log('Closing MCP server for %s', normalized)

      // Close HTTP server
      if (httpServer) {
        await new Promise<void>((resolve) => {
          httpServer.close(() => {
            log('HTTP server closed for %s', normalized)
            resolve()
          })
        })
        this.httpServers.delete(normalized)
      }

      this.servers.delete(normalized)
      log('MCP server closed for %s', normalized)
    }
  }

  /**
   * Close all MCP servers
   */
  async closeAll(): Promise<void> {
    log('Closing all MCP servers')
    const directories = Array.from(this.servers.keys())
    await Promise.all(directories.map((dir) => this.closeServer(dir)))
    log('All MCP servers closed')
  }

  /**
   * Get all active MCP servers
   */
  getAllServers(): Map<string, McpServerInstance> {
    return new Map(this.servers)
  }
}
