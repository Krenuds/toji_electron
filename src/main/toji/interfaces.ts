/**
 * Shared interfaces to break circular dependencies
 *
 * This file contains minimal interface definitions that multiple modules need
 * without creating circular dependencies. Do NOT import from index.ts here.
 */

import type { InitializationResult } from './project-initializer'
import type { OpencodeConfig } from './config'

/**
 * Minimal interface for Toji functionality needed by MCP tools
 * This prevents circular dependency: mcp-manager -> index.ts -> mcp/index.ts -> mcp-manager
 *
 * Only includes methods actually used by MCP tools to keep interface minimal
 */
export interface ITojiCore {
  changeWorkingDirectory: (directory: string) => Promise<void>
  switchToProject: (projectPath: string) => Promise<{ success: boolean; projectPath: string }>
  initializeProject: (config?: OpencodeConfig) => Promise<InitializationResult>
}
