// Manages OpenCode client lifecycle and connection state
// This is separate from ServerManager which handles server processes
import { createOpencodeClient } from '@opencode-ai/sdk'
import type { OpencodeClient } from '@opencode-ai/sdk'
import type { ServerManager } from './server'
import { createFileDebugLogger } from '../utils/logger'
import { normalizePath } from '../utils/path'

const log = createFileDebugLogger('toji:client-manager')

export class ClientManager {
  private clients: Map<string, OpencodeClient> = new Map()

  constructor(private server: ServerManager) {
    log('ClientManager initialized')
  }

  /**
   * Connect a client to a specific server directory
   * Creates or reuses existing client for the directory
   * @returns The connected client instance
   */
  async connectClient(directory: string): Promise<OpencodeClient> {
    const normalized = normalizePath(directory)
    log('Connecting client for directory: %s', normalized)

    // Get or create server for this directory
    const serverInstance = await this.server.getOrCreateServer(directory)
    const serverUrl = serverInstance.server.url

    log('Connecting to server URL: %s for directory: %s', serverUrl, directory)

    // Create client for this directory if not exists
    if (!this.clients.has(normalized)) {
      const client = createOpencodeClient({
        baseUrl: serverUrl,
        responseStyle: 'data' // Get data directly without wrapper
      })
      this.clients.set(normalized, client)
      log('Client created and connected for %s', normalized)
    } else {
      log('Reusing existing client for %s', normalized)
    }

    return this.clients.get(normalized)!
  }

  /**
   * Get client for a specific directory
   * Returns undefined if no client exists for that directory
   */
  getClient(directory: string): OpencodeClient | undefined {
    const normalized = normalizePath(directory)
    return this.clients.get(normalized)
  }

  /**
   * Remove client for a specific directory
   * Should be called before stopping the associated server
   */
  removeClient(directory: string): void {
    const normalized = normalizePath(directory)
    if (this.clients.delete(normalized)) {
      log('Removed client for %s', normalized)
    } else {
      log('No client found to remove for %s', normalized)
    }
  }

  /**
   * Check if a client exists for a specific directory
   */
  hasClient(directory: string): boolean {
    const normalized = normalizePath(directory)
    return this.clients.has(normalized)
  }

  /**
   * Get all connected clients (for debugging/status)
   */
  getAllClients(): Array<{ directory: string; hasClient: boolean }> {
    const clients: Array<{ directory: string; hasClient: boolean }> = []
    for (const [directory] of this.clients) {
      clients.push({
        directory,
        hasClient: true
      })
    }
    return clients
  }

  /**
   * Get count of active clients
   */
  getClientCount(): number {
    return this.clients.size
  }
}
