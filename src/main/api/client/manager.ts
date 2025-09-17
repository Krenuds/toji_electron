// ============================================
// Client Manager - OpenCode Client Management
// ============================================

import { createOpencodeClient } from '@opencode-ai/sdk'
import type { OpencodeClient } from '@opencode-ai/sdk'

/**
 * Manages OpenCode client instances and connections.
 * This wraps createOpencodeClient and provides access to the full SDK client.
 */
export class ClientManager {
  private client?: OpencodeClient
  private baseUrl?: string

  /**
   * Get the current client instance (internal use only)
   * Used by managers to access SDK functionality
   */
  private getClientInternal(): OpencodeClient {
    if (!this.client) {
      throw new Error('Client not initialized. Call connect() first.')
    }
    return this.client
  }

  /**
   * Get the client for use by other managers (internal API use only)
   * This should only be called by SessionManager, ProjectManager, etc.
   */
  getClientForManager(): OpencodeClient {
    return this.getClientInternal()
  }

  /**
   * Connect to OpenCode server
   */
  async connect(baseUrl: string): Promise<void> {
    console.log(`ClientManager: Connecting to OpenCode server at ${baseUrl}`)

    try {
      // Create client using OpenCode SDK
      this.client = createOpencodeClient({
        baseUrl: baseUrl
      })

      this.baseUrl = baseUrl
      console.log(`ClientManager: Successfully connected to ${baseUrl}`)

      // Test the connection by trying to get config
      try {
        await this.client.config.get()
        console.log('ClientManager: Connection verified - config accessible')
      } catch (testError) {
        console.warn('ClientManager: Connection created but server may not be ready:', testError)
        // Don't throw here - the client is created, server might just be starting
      }
    } catch (error) {
      console.error('ClientManager: Failed to create client:', error)
      this.client = undefined
      this.baseUrl = undefined
      throw error
    }
  }

  /**
   * Disconnect from server
   */
  async disconnect(): Promise<void> {
    if (this.client) {
      console.log('ClientManager: Disconnecting from OpenCode server')
      this.client = undefined
      this.baseUrl = undefined
      console.log('ClientManager: Disconnected')
    }
  }

  /**
   * Reconnect to last known server
   */
  async reconnect(): Promise<void> {
    if (!this.baseUrl) {
      throw new Error('No previous connection to reconnect to')
    }

    const previousUrl = this.baseUrl
    await this.disconnect()
    await this.connect(previousUrl)
  }

  /**
   * Check if client is connected
   */
  isConnected(): boolean {
    return this.client !== undefined
  }

  /**
   * Get connection info
   */
  getConnectionInfo(): { connected: boolean; url?: string } {
    return {
      connected: this.isConnected(),
      url: this.baseUrl
    }
  }

  /**
   * Test connection to server
   */
  async testConnection(): Promise<boolean> {
    if (!this.client) {
      return false
    }

    try {
      await this.getClientInternal().config.get()
      return true
    } catch (error) {
      console.warn('ClientManager: Connection test failed:', error)
      return false
    }
  }
}
