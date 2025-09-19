// ============================================
// Project Manager - Project Operations and Management
// ============================================

import type { Project } from '@opencode-ai/sdk'
import type { ClientManager } from '../client'

/**
 * Manages OpenCode projects, providing enhanced project operations
 * on top of the raw SDK client. This includes project discovery,
 * project templates, and project metadata management.
 */
export class ProjectManager {
  constructor(private clientManager: ClientManager) {}

  /**
   * List all projects
   */
  async list(): Promise<{ data: Project[] }> {
    const client = this.clientManager.getClientForManager()
    const response = await client.project.list()

    return {
      data: response.data || []
    }
  }

  /**
   * Get current project
   */
  async getCurrent(): Promise<Project | null> {
    const client = this.clientManager.getClientForManager()

    try {
      const response = await client.project.current()
      return response.data || null
    } catch {
      // Return null if no current project exists
      return null
    }
  }

  /**
   * Get project by ID
   */
  async get(projectId: string): Promise<Project | null> {
    const client = this.clientManager.getClientForManager()
    const response = await client.project.list()
    const projects = response.data || []

    return projects.find((p) => p.id === projectId) || null
  }

  /**
   * Create a new project from template
   */
  async createFromTemplate(directory: string, template?: string): Promise<Project> {
    // Note: Project creation may not be directly available in SDK
    // This would typically involve file system operations + git init
    throw new Error(
      `Project creation not implemented - would create project in ${directory} with template ${template || 'default'}`
    )
  }

  /**
   * Log project information for debugging
   */
  async logInfo(): Promise<void> {
    try {
      const current = await this.getCurrent()
      const projects = await this.list()

      console.log('=== Project Information ===')
      console.log(`Current project: ${current?.id || 'None'}`)
      console.log(`Total projects: ${projects.data.length}`)
      console.log(
        'All projects:',
        projects.data.map((p) => ({ id: p.id, worktree: p.worktree }))
      )
    } catch (error) {
      console.error('Failed to retrieve project information:', error)
    }
  }
}
