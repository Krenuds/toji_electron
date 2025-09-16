import { createOpencodeClient, OpencodeClient } from '@opencode-ai/sdk'
import { OpenCodeManager, OpenCodeConfig } from '../opencode-manager'
import { Service, ServiceStatus } from '../core/core'

export interface ChatMessage {
  text: string
  response?: string
  timestamp: Date
  error?: string
}

export class OpenCodeService implements Service {
  name = 'opencode'

  private manager: OpenCodeManager
  private client?: OpencodeClient
  private currentSession?: string

  constructor(config?: OpenCodeConfig) {
    this.manager = new OpenCodeManager(config)
  }

  async start(): Promise<void> {
    // Use existing OpenCodeManager to handle server setup
    await this.manager.ensureBinary()
    await this.manager.startServer()

    // Wait a moment for server to be ready
    await new Promise(resolve => setTimeout(resolve, 1000))

    // Create SDK client to talk to the server
    const status = await this.manager.getServerStatus()
    if (status.running && status.url) {
      this.client = createOpencodeClient({
        baseUrl: status.url,
        responseStyle: 'data'
      })
    } else {
      throw new Error('OpenCode server failed to start')
    }
  }

  async stop(): Promise<void> {
    this.client = undefined
    this.currentSession = undefined
    await this.manager.stopServer()
  }

  getStatus(): ServiceStatus {
    // Note: This is a synchronous method but manager.getServerStatus() is async
    // We'll need to cache the status or make this async too
    // For now, return basic status based on whether we have a client
    return {
      running: !!this.client,
      healthy: !!this.client,
      error: this.client ? undefined : 'Service not started',
      lastCheck: new Date()
    }
  }

  // Chat functionality
  async sendMessage(text: string): Promise<string> {
    if (!this.client) {
      throw new Error('OpenCode service not started')
    }

    try {
      // Create session if we don't have one
      if (!this.currentSession) {
        const session = await this.client.session.create({
          body: { title: 'Chat Session' }
        })
        if (session.data?.id) {
          this.currentSession = session.data.id
        } else {
          throw new Error('Failed to create session')
        }
      }

      // Send message to OpenCode
      const response = await this.client.session.prompt({
        path: { id: this.currentSession },
        body: {
          model: {
            providerID: 'anthropic',
            modelID: 'claude-3-5-sonnet-20241022'
          },
          parts: [{ type: 'text', text }]
        }
      })

      // Extract the response text
      if (response.data && response.data.parts && response.data.parts.length > 0) {
        const responsePart = response.data.parts[0]
        if ('text' in responsePart) {
          return responsePart.text
        }
      }

      return 'No response received'
    } catch (error) {
      console.error('OpenCode chat error:', error)
      throw new Error(`Chat failed: ${error instanceof Error ? error.message : 'Unknown error'}`)
    }
  }

  async createNewSession(title?: string): Promise<string> {
    if (!this.client) {
      throw new Error('OpenCode service not started')
    }

    const session = await this.client.session.create({
      body: { title: title || 'New Session' }
    })
    if (session.data?.id) {
      this.currentSession = session.data.id
      return this.currentSession
    } else {
      throw new Error('Failed to create new session')
    }
  }

  getCurrentSession(): string | undefined {
    return this.currentSession
  }

  // Expose manager methods for backward compatibility
  getBinaryInfo() {
    return this.manager.getBinaryInfo()
  }

  downloadBinary() {
    return this.manager.downloadBinary()
  }

  ensureBinary() {
    return this.manager.ensureBinary()
  }

  startServer() {
    return this.manager.startServer()
  }

  stopServer() {
    return this.manager.stopServer()
  }

  getServerStatus() {
    return this.manager.getServerStatus()
  }

  checkHealth() {
    return this.manager.checkHealth()
  }

  updateConfig(config: Partial<OpenCodeConfig>) {
    return this.manager.updateConfig(config)
  }

  cleanup() {
    return this.manager.cleanup()
  }
}