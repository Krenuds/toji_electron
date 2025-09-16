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
    try {
      // Step 1: Ensure binary is installed
      console.log('OpenCode Service: Ensuring binary is installed...')
      await this.manager.ensureBinary()

      // Step 2: Start the server
      console.log('OpenCode Service: Starting server...')
      await this.manager.startServer()

      // Step 3: Wait for server to be ready with timeout
      console.log('OpenCode Service: Waiting for server to be ready...')
      let retries = 10
      let serverReady = false

      while (retries > 0 && !serverReady) {
        await new Promise(resolve => setTimeout(resolve, 500))
        const status = await this.manager.getServerStatus()

        if (status.running && status.healthy && status.url) {
          serverReady = true
          console.log(`OpenCode Service: Server ready at ${status.url}`)

          // Step 4: Create SDK client
          this.client = createOpencodeClient({
            baseUrl: status.url,
            responseStyle: 'data'
          })

          console.log('OpenCode Service: Client created successfully')
          break
        }

        retries--
        console.log(`OpenCode Service: Server not ready yet, retrying... (${retries} attempts left)`)
      }

      if (!serverReady) {
        throw new Error('OpenCode server failed to become ready within timeout')
      }

    } catch (error) {
      console.error('OpenCode Service: Failed to start:', error)
      // Cleanup on failure
      this.client = undefined
      try {
        await this.manager.stopServer()
      } catch (cleanupError) {
        console.error('OpenCode Service: Cleanup failed:', cleanupError)
      }
      throw error
    }
  }

  async stop(): Promise<void> {
    console.log('OpenCode Service: Stopping...')

    // Clear client and session state first
    this.client = undefined
    this.currentSession = undefined

    try {
      await this.manager.stopServer()
      console.log('OpenCode Service: Stopped successfully')
    } catch (error) {
      console.error('OpenCode Service: Error during stop:', error)
      // Don't throw - we still want to consider the service stopped
    }
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
      throw new Error('OpenCode service not started - call core.startService("opencode") first')
    }

    if (!text || text.trim().length === 0) {
      throw new Error('Message text cannot be empty')
    }

    try {
      console.log(`OpenCode Service: Sending message: "${text.substring(0, 100)}..."`)

      // Create session if we don't have one
      if (!this.currentSession) {
        console.log('OpenCode Service: Creating new chat session...')
        const session = await this.client.session.create({
          body: { title: 'Toji Chat Session' }
        })

        if (!session.data?.id) {
          throw new Error('Failed to create session - no session ID returned')
        }

        this.currentSession = session.data.id
        console.log(`OpenCode Service: Created session ${this.currentSession}`)
      }

      // Send message to OpenCode
      const response = await this.client.session.prompt({
        path: { id: this.currentSession },
        body: {
          model: {
            providerID: 'anthropic',
            modelID: 'claude-3-5-sonnet-20241022'
          },
          parts: [{ type: 'text', text: text.trim() }]
        }
      })

      // Extract the response text
      if (response.data?.parts && response.data.parts.length > 0) {
        const responsePart = response.data.parts[0]
        if ('text' in responsePart && responsePart.text) {
          console.log(`OpenCode Service: Received response (${responsePart.text.length} chars)`)
          return responsePart.text
        }
      }

      console.warn('OpenCode Service: Empty or invalid response received')
      return 'No response received from AI'

    } catch (error) {
      console.error('OpenCode Service: Chat error:', error)

      // If session error, clear the session so we retry next time
      if (error instanceof Error && error.message.includes('session')) {
        console.log('OpenCode Service: Clearing session due to error')
        this.currentSession = undefined
      }

      throw new Error(`Chat failed: ${error instanceof Error ? error.message : 'Unknown error'}`)
    }
  }

  async createNewSession(title?: string): Promise<string> {
    if (!this.client) {
      throw new Error('OpenCode service not started - call core.startService("opencode") first')
    }

    try {
      const sessionTitle = title || `Toji Session ${new Date().toLocaleTimeString()}`
      console.log(`OpenCode Service: Creating new session: "${sessionTitle}"`)

      const session = await this.client.session.create({
        body: { title: sessionTitle }
      })

      if (!session.data?.id) {
        throw new Error('Failed to create new session - no session ID returned')
      }

      this.currentSession = session.data.id
      console.log(`OpenCode Service: Created new session ${this.currentSession}`)
      return this.currentSession

    } catch (error) {
      console.error('OpenCode Service: Failed to create session:', error)
      throw new Error(`Failed to create session: ${error instanceof Error ? error.message : 'Unknown error'}`)
    }
  }

  getCurrentSession(): string | undefined {
    return this.currentSession
  }

  // Expose only installation/setup methods (not server management)
  getBinaryInfo() {
    return this.manager.getBinaryInfo()
  }

  downloadBinary() {
    return this.manager.downloadBinary()
  }

  ensureBinary() {
    return this.manager.ensureBinary()
  }

  updateConfig(config: Partial<OpenCodeConfig>) {
    return this.manager.updateConfig(config)
  }

  cleanup() {
    return this.manager.cleanup()
  }
}