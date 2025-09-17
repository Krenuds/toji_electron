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
    // TODO: Next session - implement project listing
    // - Use client.project.list()
    // - Return standardized response format
    throw new Error('ProjectManager.list() - To be implemented in next session')
  }

  /**
   * Get current project
   */
  async getCurrent(): Promise<Project | null> {
    // TODO: Next session - implement current project retrieval
    // - Use client.project.current()
    // - Handle cases where no current project exists
    throw new Error('ProjectManager.getCurrent() - To be implemented in next session')
  }

  /**
   * Get project by ID
   */
  async get(projectId: string): Promise<Project> {
    // TODO: Next session - implement project retrieval by ID
    throw new Error('ProjectManager.get() - To be implemented in next session')
  }

  /**
   * Create a new project from template
   */
  async createFromTemplate(directory: string, template?: string): Promise<Project> {
    // TODO: Next session - implement project creation
    // - Set up project structure
    // - Apply template if specified
    // - Initialize with OpenCode
    throw new Error('ProjectManager.createFromTemplate() - To be implemented in next session')
  }

  /**
   * Log project information for debugging
   */
  async logInfo(): Promise<void> {
    // TODO: Next session - implement project info logging
    throw new Error('ProjectManager.logInfo() - To be implemented in next session')
  }
}
