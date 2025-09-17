import { createOpencodeClient, OpencodeClient } from '@opencode-ai/sdk'
import type { Part, Session } from '@opencode-ai/sdk'
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

      // Create a session for the conversation
      console.log('Core: Creating session...')
      const sessionResponse = await this.openCodeClient!.session.create({
        body: {
          title: `Chat ${new Date().toLocaleTimeString()}`
        }
      })

      // Extract session from response
      if (!sessionResponse.data?.id) {
        console.error('Core: Session creation failed:', sessionResponse)
        throw new Error('Failed to create session - no session ID returned')
      }

      const session: Session = sessionResponse.data
      console.log(`Core: Created session ${session.id}`)

      // Send the user message to the session
      const promptResponse = await this.openCodeClient!.session.prompt({
        path: { id: session.id },
        body: {
          model: {
            providerID: 'opencode',
            modelID: 'grok-code'
          },
          parts: [{ type: 'text', text: text.trim() }]
        }
      })

      // Extract response based on actual SDK structure
      console.log('Core: Prompt response:', JSON.stringify(promptResponse, null, 2))

      if (!promptResponse?.data?.parts) {
        console.warn('Core: No parts in response')
        return 'No response received from AI'
      }

      const parts: Part[] = promptResponse.data.parts

      // Find text parts in the response
      const textParts = parts.filter(
        (part: Part): part is Part & { text: string } =>
          part.type === 'text' && 'text' in part && typeof part.text === 'string'
      )

      if (textParts.length === 0) {
        console.warn('Core: No text parts found in response')
        console.log(
          'Core: Available part types:',
          parts.map((p) => p.type)
        )
        return 'No text response received from AI'
      }

      // Combine all text parts
      const responseText = textParts.map((part) => part.text).join('\n')
      console.log(`Core: Received response (${responseText.length} chars)`)
      return responseText
    } catch (error) {
      console.error('Core: Prompt failed:', error)
      // Clear client on error so it gets recreated next time
      this.openCodeClient = undefined
      throw new Error(`Prompt failed: ${error instanceof Error ? error.message : 'Unknown error'}`)
    }
  }
}
