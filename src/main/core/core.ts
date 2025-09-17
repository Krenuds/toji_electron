import { createOpencodeClient, OpencodeClient } from '@opencode-ai/sdk'
import type { Part } from '@opencode-ai/sdk'
import type { OpenCodeService } from '../services/opencode-service'

export interface Service {
  name: string
  start(): Promise<void>
  stop(): Promise<void>
  getStatus(): ServiceStatus
}

export interface ServiceStatus {
  running: boolean
  healthy?: boolean
  error?: string
  lastCheck?: Date
}

export interface CoreStatus {
  services: Record<string, ServiceStatus>
  currentWorkspace?: string
}

export class Core {
  private services = new Map<string, Service>()
  private currentWorkspace?: string
  private openCodeClient?: OpencodeClient

  constructor() {
    // Services will be registered here
  }

  registerService(service: Service): void {
    this.services.set(service.name, service)
  }

  async startService(serviceName: string): Promise<void> {
    const service = this.services.get(serviceName)
    if (!service) {
      throw new Error(`Service '${serviceName}' not found`)
    }
    await service.start()
  }

  async stopService(serviceName: string): Promise<void> {
    const service = this.services.get(serviceName)
    if (!service) {
      throw new Error(`Service '${serviceName}' not found`)
    }
    await service.stop()
  }

  getServiceStatus(serviceName: string): ServiceStatus {
    const service = this.services.get(serviceName)
    if (!service) {
      throw new Error(`Service '${serviceName}' not found`)
    }
    return service.getStatus()
  }

  getAllStatus(): CoreStatus {
    const services: Record<string, ServiceStatus> = {}
    for (const [name, service] of this.services) {
      services[name] = service.getStatus()
    }
    return {
      services,
      currentWorkspace: this.currentWorkspace
    }
  }

  setWorkspace(path: string): void {
    this.currentWorkspace = path
    // TODO: Notify services about workspace change
  }

  getCurrentWorkspace(): string | undefined {
    return this.currentWorkspace
  }

  // Helper to get a specific service
  getService<T extends Service>(serviceName: string): T | undefined {
    return this.services.get(serviceName) as T
  }

  private async initializeOpenCodeClient(): Promise<void> {
    const openCodeService = this.getService<OpenCodeService>('opencode')
    if (!openCodeService) {
      throw new Error('OpenCode service not registered')
    }

    // Get server status to get the URL
    const serverStatus = await openCodeService.getServerStatus()
    if (!serverStatus.running || !serverStatus.url) {
      throw new Error('OpenCode server is not running')
    }

    // Create the client that Core will use
    console.log(`Core: Creating OpenCode client with baseUrl: ${serverStatus.url}`)
    this.openCodeClient = createOpencodeClient({
      baseUrl: serverStatus.url
      // Removing responseStyle to see if that's causing the issue
    })

    console.log(`Core: OpenCode client initialized for ${serverStatus.url}`)

    // Test if the client can connect
    try {
      console.log('Core: Testing client connectivity...')
      // We'll test this when we create a session
    } catch (error) {
      console.error('Core: Client connectivity test failed:', error)
    }
  }

  async prompt(text: string): Promise<string> {
    if (!text || text.trim().length === 0) {
      throw new Error('Prompt text cannot be empty')
    }

    // Ensure OpenCode service is running
    const openCodeService = this.getService<OpenCodeService>('opencode')
    if (!openCodeService) {
      throw new Error('OpenCode service not registered')
    }

    const serviceStatus = openCodeService.getStatus()
    if (!serviceStatus.running) {
      console.log('Core: Starting OpenCode service...')
      await this.startService('opencode')
    }

    // Initialize client if needed
    if (!this.openCodeClient) {
      console.log('Core: Initializing OpenCode client...')
      await this.initializeOpenCodeClient()
    }

    try {
      console.log(`Core: Sending prompt: "${text.substring(0, 100)}..."`)

      // Create a simple session for the prompt
      console.log('Core: Creating session...')
      const sessionResponse = await this.openCodeClient!.session.create({
        body: {
          title: `Prompt ${new Date().toLocaleTimeString()}`
        }
      })

      // Session creation successful - extract ID
      if (!sessionResponse.data?.id) {
        console.error('Core: Session creation failed, no ID found in response:', sessionResponse)
        throw new Error('Failed to create session - no session ID returned')
      }

      const sessionId = sessionResponse.data.id

      console.log(`Core: Created session ${sessionId}`)

      // Send the prompt
      const promptResponse = await this.openCodeClient!.session.prompt({
        path: { id: sessionId },
        body: {
          model: {
            providerID: 'opencode',
            modelID: 'grok-code'
          },
          parts: [{ type: 'text', text: text.trim() }]
        }
      })

      // Extract response text based on SDK types
      console.log('Core: Prompt response:', JSON.stringify(promptResponse, null, 2))

      // The response has parts array in data.parts
      if (promptResponse?.data?.parts && promptResponse.data.parts.length > 0) {
        // Find the first text part
        const textPart = promptResponse.data.parts.find((part: Part) => part.type === 'text')
        if (textPart && 'text' in textPart && textPart.text) {
          console.log(`Core: Received response (${textPart.text.length} chars)`)
          return textPart.text
        }
      }

      console.warn('Core: Empty or invalid response received')
      console.log('Core: Available parts:', promptResponse?.data?.parts)
      return 'No response received from AI'
    } catch (error) {
      console.error('Core: Prompt failed:', error)
      // Clear client on error so it gets recreated next time
      this.openCodeClient = undefined
      throw new Error(`Prompt failed: ${error instanceof Error ? error.message : 'Unknown error'}`)
    }
  }
}
