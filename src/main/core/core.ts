import { createOpencodeClient, OpencodeClient } from '@opencode-ai/sdk'
import type { Part, Session } from '@opencode-ai/sdk'
import type { OpenCodeService } from '../services/opencode-service'
import type { ConfigProvider } from '../config/ConfigProvider'

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
  private currentSession?: Session

  constructor(private config: ConfigProvider) {
    // Config is available to core
    console.log(
      'Core: Initialized with config, OpenCode working directory:',
      config.getOpencodeWorkingDirectory()
    )
  }

  getConfig(): ConfigProvider {
    return this.config
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

    // Debug: Check what project OpenCode thinks it's working with
    try {
      console.log('Core: Checking current project...')
      const currentProject = await this.openCodeClient.project.current()
      console.log('Core: Current project:', JSON.stringify(currentProject, null, 2))

      console.log('Core: Listing all projects...')
      const allProjects = await this.openCodeClient.project.list()
      console.log('Core: All projects:', JSON.stringify(allProjects, null, 2))

      // Test file operations to see what OpenCode can access
      console.log('Core: Testing file operations immediately after client init...')
      await this.testFileOperations()
    } catch (error) {
      console.error('Core: Project debugging failed:', error)
    }

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

      // Use persistent session or create new one
      let session: Session
      if (!this.currentSession) {
        console.log('Core: Creating new persistent session...')
        const sessionResponse = await this.openCodeClient!.session.create({
          body: {
            title: `Persistent Chat Session - ${new Date().toLocaleString()}`
          }
        })

        // Extract session from response
        if (!sessionResponse.data?.id) {
          console.error('Core: Session creation failed:', sessionResponse)
          throw new Error('Failed to create session - no session ID returned')
        }

        session = sessionResponse.data
        this.currentSession = session
        console.log(`Core: Created new persistent session ${session.id}`)
      } else {
        session = this.currentSession
        console.log(`Core: Using existing persistent session ${session.id}`)
      }

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
      // Clear client and session on error so they get recreated next time
      this.openCodeClient = undefined
      this.currentSession = undefined
      throw new Error(`Prompt failed: ${error instanceof Error ? error.message : 'Unknown error'}`)
    }
  }

  // File operation methods using the OpenCode SDK
  async readFile(filePath: string): Promise<string> {
    if (!this.openCodeClient) {
      throw new Error('OpenCode client not initialized')
    }

    try {
      console.log(`Core: Reading file: ${filePath}`)
      const response = await this.openCodeClient.file.read({
        query: { path: filePath }
      })

      if (response.data?.content) {
        console.log(`Core: Successfully read file ${filePath} (${response.data.content.length} chars)`)
        return response.data.content
      } else {
        throw new Error('No content returned from file read')
      }
    } catch (error) {
      console.error(`Core: Failed to read file ${filePath}:`, error)
      throw new Error(`Failed to read file: ${error instanceof Error ? error.message : 'Unknown error'}`)
    }
  }

  async findFiles(pattern: string): Promise<string[]> {
    if (!this.openCodeClient) {
      throw new Error('OpenCode client not initialized')
    }

    try {
      console.log(`Core: Finding files with pattern: ${pattern}`)
      const response = await this.openCodeClient.find.files({
        query: { query: pattern }
      })

      if (response.data && Array.isArray(response.data)) {
        console.log(`Core: Found ${response.data.length} files matching ${pattern}`)
        return response.data
      } else {
        console.log(`Core: No files found matching ${pattern}`)
        return []
      }
    } catch (error) {
      console.error(`Core: Failed to find files with pattern ${pattern}:`, error)
      throw new Error(`Failed to find files: ${error instanceof Error ? error.message : 'Unknown error'}`)
    }
  }

  async searchText(searchTerm: string): Promise<any[]> {
    if (!this.openCodeClient) {
      throw new Error('OpenCode client not initialized')
    }

    try {
      console.log(`Core: Searching for text: ${searchTerm}`)
      const response = await this.openCodeClient.find.text({
        query: { pattern: searchTerm }
      })

      if (response.data && Array.isArray(response.data)) {
        console.log(`Core: Found ${response.data.length} text matches for ${searchTerm}`)
        return response.data
      } else {
        console.log(`Core: No text matches found for ${searchTerm}`)
        return []
      }
    } catch (error) {
      console.error(`Core: Failed to search text ${searchTerm}:`, error)
      throw new Error(`Failed to search text: ${error instanceof Error ? error.message : 'Unknown error'}`)
    }
  }

  // Method to test file operations - useful for debugging
  async testFileOperations(): Promise<void> {
    console.log('Core: Testing file operations...')

    try {
      // Test finding files
      const allFiles = await this.findFiles('*')
      console.log('Core: All files found:', allFiles)

      // Test finding markdown files specifically
      const mdFiles = await this.findFiles('*.md')
      console.log('Core: Markdown files found:', mdFiles)

      // If AGENTS.md exists, try to read it
      if (mdFiles.includes('AGENTS.md')) {
        const content = await this.readFile('AGENTS.md')
        console.log('Core: AGENTS.md content:', content)
      }

      // Test searching for text
      const clownMatches = await this.searchText('clown')
      console.log('Core: Text search results for "clown":', clownMatches)

    } catch (error) {
      console.error('Core: File operations test failed:', error)
    }
  }
}
