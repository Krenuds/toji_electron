// MCP Server types for Toji integration
import type { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js'

export interface McpServerInstance {
  server: McpServer
  projectDirectory: string
  discordChannelId?: string
  port?: number
}

export interface McpServerOptions {
  projectDirectory: string
  discordChannelId?: string
}

export interface DiscordMessageToolInput {
  channelId: string
  limit?: number
}

export interface DiscordMessageToolOutput {
  messages: Array<{
    id: string
    author: string
    content: string
    timestamp: string
  }>
  count: number
}
