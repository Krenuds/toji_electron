// Project management module for Toji
import type { OpencodeClient, Project } from '@opencode-ai/sdk'
import { createLogger } from '../utils/logger'

const logger = createLogger('toji:project')

export interface ProjectInfo {
  path: string
  name: string
  sdkProject: Project // Original SDK project data
}

export class ProjectManager {
  constructor(private getClient: () => OpencodeClient | undefined) {}

  /**
   * List all projects from the OpenCode client
   */
  async list(): Promise<Project[]> {
    const client = this.getClient()
    if (!client) {
      logger.debug('OpenCode client not available')
      return []
    }

    try {
      const response = await client.project.list()
      // With responseStyle: 'data', response is the data directly
      // TypeScript needs explicit type assertion due to SDK type definitions
      const projects = (response as unknown as Project[]) || []
      logger.debug('OpenCode SDK returned %d projects', projects.length)
      return projects
    } catch (error) {
      logger.debug('Failed to list projects from SDK: %o', error)
      return []
    }
  }

  /**
   * Get the current project from the OpenCode client
   */
  async getCurrent(): Promise<Project | null> {
    const client = this.getClient()
    if (!client) {
      logger.debug('OpenCode client not available')
      return null
    }

    try {
      const response = await client.project.current()
      // With responseStyle: 'data', response is the data directly
      // TypeScript needs explicit type assertion due to SDK type definitions
      return (response as unknown as Project) || null
    } catch {
      return null
    }
  }

  /**
   * Get all projects (directly from SDK)
   */
  async getAllProjects(): Promise<ProjectInfo[]> {
    const projects = await this.list()
    return projects.map((project) => ({
      path: project.worktree,
      name: project.worktree.split(/[/\\]/).pop() || project.worktree,
      sdkProject: project
    }))
  }
}
