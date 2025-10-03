// MCP Server types for Toji integration
import type { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js'

export interface McpServerInstance {
  server: McpServer
  projectDirectory: string
  port: number
}

export interface McpServerOptions {
  projectDirectory: string
}
