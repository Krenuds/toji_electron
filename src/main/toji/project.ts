// Project management module for Toji
import type { OpencodeClient, Project } from '@opencode-ai/sdk'
import { createLogger } from '../utils/logger'
import * as fs from 'fs/promises'
import * as path from 'path'
import * as os from 'os'

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

  /**
   * Delete a project from OpenCode storage
   * This removes the project JSON file from ~/.local/share/opencode/storage/project/
   */
  async deleteProject(projectPath: string): Promise<void> {
    logger.info('Deleting project: %s', projectPath)

    // Get the projects storage directory
    const homeDir = os.homedir()
    const projectsDir = path.join(homeDir, '.local', 'share', 'opencode', 'storage', 'project')

    try {
      // Read all project JSON files
      const files = await fs.readdir(projectsDir)
      const jsonFiles = files.filter((f) => f.endsWith('.json') && f !== 'global.json')

      // Find the file that contains this project path
      for (const file of jsonFiles) {
        const filePath = path.join(projectsDir, file)
        try {
          const content = await fs.readFile(filePath, 'utf-8')
          const projectData = JSON.parse(content)

          // Normalize paths for comparison (handle forward/backslashes)
          const normalizedWorktree = projectData.worktree?.replace(/\\/g, '/')
          const normalizedProjectPath = projectPath.replace(/\\/g, '/')

          if (normalizedWorktree === normalizedProjectPath) {
            // Found the matching project file - delete it
            await fs.unlink(filePath)
            logger.info('Successfully deleted project file: %s', file)
            return
          }
        } catch (err) {
          // Skip files that can't be read or parsed
          logger.debug('Skipping file %s: %o', file, err)
        }
      }

      // If we get here, project wasn't found
      logger.warn('Project not found in storage: %s', projectPath)
      throw new Error(`Project not found: ${projectPath}`)
    } catch (error) {
      logger.error('Failed to delete project: %o', error)
      throw error
    }
  }
}
