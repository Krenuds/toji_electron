// Project management module for Toji
import type { OpencodeClient } from '@opencode-ai/sdk'
import { app } from 'electron'
import { join } from 'path'

export class ProjectManager {
  constructor(private getClient: () => OpencodeClient | undefined) {}

  /**
   * List all projects from the OpenCode client
   */
  async list(): Promise<unknown[]> {
    const client = this.getClient()
    if (!client) {
      throw new Error('OpenCode client not initialized')
    }

    // Call the OpenCode SDK's project.list() method
    const response = await client.project.list()
    return response.data || []
  }

  /**
   * Get the current project from the OpenCode client
   */
  async getCurrent(): Promise<unknown | null> {
    const client = this.getClient()
    if (!client) {
      throw new Error('OpenCode client not initialized')
    }

    try {
      const response = await client.project.current()
      return response.data || null
    } catch {
      // No current project is not an error
      return null
    }
  }

  /**
   * Get the path to the projects data folder
   */
  getDataPath(): string {
    const userData = app.getPath('userData')
    return join(userData, 'opencode-data', 'projects')
  }
}
