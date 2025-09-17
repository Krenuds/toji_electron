import { createOpencodeServer, createOpencodeClient, OpencodeClient } from '@opencode-ai/sdk'
import type { Part, Session } from '@opencode-ai/sdk'
import { mkdirSync, existsSync } from 'fs'
import { execSync } from 'child_process'
import path from 'path'
import type { OpenCodeService } from '../services/opencode-service'

export interface AgentConfig {
  model?: string
  hostname?: string
  port?: number
  timeout?: number
}

export class Core {
  private currentAgent: { close: () => void } | null = null
  private currentClient?: OpencodeClient
  private currentSession?: Session
  private currentDirectory?: string
  private originalCwd?: string

  constructor(public binaryService: OpenCodeService) {
    console.log('Core: API layer initialized')
  }

  // Main API method - replicate "cd + opencode"
  async startOpencodeInDirectory(
    directory: string, 
    config: AgentConfig = {}
  ): Promise<void> {
    // Stop any existing agent first
    await this.stopOpencode()

    const agentConfig = {
      hostname: '127.0.0.1',
      port: 4096,
      timeout: 5000,
      model: 'opencode/grok-code',
      ...config
    }

    // Ensure binary is available
    await this.binaryService.ensureBinary()

    // Prepare directory (create, init git if needed)
    await this.prepareDirectory(directory)

    // Change to target directory (replicating "cd")
    this.originalCwd = process.cwd()
    console.log(`Core: Changing to directory: ${directory}`)
    process.chdir(directory)

    try {
      // Start agent (replicating "opencode")
      console.log('Core: Starting OpenCode agent...')
      this.currentAgent = await createOpencodeServer({
        hostname: agentConfig.hostname,
        port: agentConfig.port,
        timeout: agentConfig.timeout,
        config: {
          model: agentConfig.model
        }
      })

      // Create client to talk to agent
      const baseUrl = `http://${agentConfig.hostname}:${agentConfig.port}`
      this.currentClient = createOpencodeClient({ baseUrl })
      this.currentDirectory = directory

      console.log(`Core: OpenCode agent running in ${directory}`)

      // Log project info for debugging
      await this.logProjectInfo()

    } catch (error) {
      // Restore directory on failure
      if (this.originalCwd) {
        process.chdir(this.originalCwd)
        this.originalCwd = undefined
      }
      throw error
    }
  }

  async stopOpencode(): Promise<void> {
    if (this.currentAgent) {
      console.log('Core: Stopping OpenCode agent...')
      this.currentAgent.close()
      this.currentAgent = null
    }

    this.currentClient = undefined
    this.currentSession = undefined
    this.currentDirectory = undefined

    // Restore original directory
    if (this.originalCwd) {
      console.log('Core: Restoring original directory')
      process.chdir(this.originalCwd)
      this.originalCwd = undefined
    }
  }

  async prompt(text: string): Promise<string> {
    if (!text || text.trim().length === 0) {
      throw new Error('Prompt text cannot be empty')
    }

    if (!this.currentClient) {
      throw new Error('No OpenCode agent running. Call startOpencodeInDirectory() first.')
    }

    try {
      // Get or create session
      let session = this.currentSession
      if (!session) {
        console.log('Core: Creating new session...')
        const sessionResponse = await this.currentClient.session.create({
          body: {
            title: `Session - ${new Date().toLocaleString()}`
          }
        })

        if (!sessionResponse.data?.id) {
          throw new Error('Failed to create session')
        }

        session = sessionResponse.data
        this.currentSession = session
        console.log(`Core: Created session ${session.id}`)
      }

      // Send prompt
      console.log(`Core: Sending prompt: "${text.substring(0, 100)}..."`)
      const promptResponse = await this.currentClient.session.prompt({
        path: { id: session.id },
        body: {
          model: {
            providerID: 'opencode',
            modelID: 'grok-code'
          },
          parts: [{ type: 'text', text: text.trim() }]
        }
      })

      // Extract response
      if (!promptResponse?.data?.parts) {
        return 'No response received from AI'
      }

      const parts: Part[] = promptResponse.data.parts
      const textParts = parts.filter(
        (part: Part): part is Part & { text: string } =>
          part.type === 'text' && 'text' in part && typeof part.text === 'string'
      )

      if (textParts.length === 0) {
        return 'No text response received from AI'
      }

      const responseText = textParts.map((part) => part.text).join('\n')
      console.log(`Core: Received response (${responseText.length} chars)`)
      return responseText

    } catch (error) {
      console.error('Core: Prompt failed:', error)
      // Clear session on error for clean retry
      this.currentSession = undefined
      throw new Error(`Prompt failed: ${error instanceof Error ? error.message : 'Unknown error'}`)
    }
  }

  // Simple status check
  isRunning(): boolean {
    return !!this.currentAgent && !!this.currentClient
  }

  getCurrentDirectory(): string | undefined {
    return this.currentDirectory
  }

  // Private helpers
  private async prepareDirectory(directory: string): Promise<void> {
    // Create directory if it doesn't exist
    if (!existsSync(directory)) {
      console.log(`Core: Creating directory: ${directory}`)
      mkdirSync(directory, { recursive: true })
    }

    // Initialize Git if needed (OpenCode requires Git repos)
    const gitDir = path.join(directory, '.git')
    if (!existsSync(gitDir)) {
      console.log('Core: Initializing Git repository...')
      execSync('git init', { cwd: directory, stdio: 'pipe' })

      // Create initial commit if there are files
      try {
        const statusOutput = execSync('git status --porcelain', { 
          cwd: directory, 
          stdio: 'pipe' 
        }).toString()
        
        if (statusOutput.trim()) {
          console.log('Core: Creating initial commit...')
          execSync('git add .', { cwd: directory, stdio: 'pipe' })
          execSync('git commit -m "Initial commit for OpenCode"', {
            cwd: directory,
            stdio: 'pipe'
          })
        }
      } catch (error) {
        console.log('Core: Git commit not needed or failed, continuing...')
      }
    }
  }

  private async logProjectInfo(): Promise<void> {
    if (!this.currentClient) return

    try {
      const currentProject = await this.currentClient.project.current()
      console.log('Core: Current project:', JSON.stringify(currentProject, null, 2))

      const allProjects = await this.currentClient.project.list()
      console.log('Core: All projects:', JSON.stringify(allProjects, null, 2))
    } catch (error) {
      console.error('Core: Failed to get project info:', error)
    }
  }
}