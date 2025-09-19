// ============================================
// Workspace Manager - Directory and Workspace Operations
// ============================================

import { promises as fs } from 'fs'
import { join, basename, sep } from 'path'
import { exec } from 'child_process'
import { promisify } from 'util'
import type { DiscoveredProject, WorkspaceCollection, EnrichedProject } from '../types'
import type { Project, Session } from '@opencode-ai/sdk'
import type { ClientManager } from '../client'

const execAsync = promisify(exec)

/**
 * Manages workspace operations including directory preparation,
 * git initialization, workspace switching, and project discovery.
 * This orchestrates workspace-related functionality.
 */
export class WorkspaceManager {
  private currentDirectory?: string
  private originalCwd?: string

  constructor(private clientManager?: ClientManager) {}

  /**
   * Prepare a directory for OpenCode usage
   */
  async prepare(directory: string): Promise<void> {
    try {
      // Create directory if it doesn't exist
      await fs.mkdir(directory, { recursive: true })

      // Check if git repository exists
      const gitDir = join(directory, '.git')
      try {
        await fs.access(gitDir)
      } catch {
        // Initialize git repository if it doesn't exist
        await this.initGit(directory)
      }

      // Set current directory
      this.currentDirectory = directory
    } catch (error) {
      const message = error instanceof Error ? error.message : String(error)
      throw new Error(`Failed to prepare workspace: ${message}`)
    }
  }

  /**
   * Switch to a different workspace
   */
  async switch(directory: string): Promise<void> {
    // Store original directory if not already stored
    if (!this.originalCwd) {
      this.originalCwd = process.cwd()
    }

    // Prepare the new directory
    await this.prepare(directory)

    // Change to new directory
    process.chdir(directory)
    this.currentDirectory = directory
  }

  /**
   * Get current workspace directory
   */
  getCurrentDirectory(): string | undefined {
    return this.currentDirectory
  }

  /**
   * Return to original directory
   */
  async returnToOriginal(): Promise<void> {
    if (this.originalCwd) {
      process.chdir(this.originalCwd)
      this.currentDirectory = undefined
    }
  }

  /**
   * Initialize git repository in current workspace
   */
  async initGit(directory: string): Promise<void> {
    try {
      const originalCwd = process.cwd()
      process.chdir(directory)

      await execAsync('git init')

      // Create initial .gitignore if it doesn't exist
      const gitignorePath = join(directory, '.gitignore')
      try {
        await fs.access(gitignorePath)
      } catch {
        await fs.writeFile(gitignorePath, 'node_modules/\n.env\n*.log\n')
      }

      process.chdir(originalCwd)
    } catch (error) {
      const message = error instanceof Error ? error.message : String(error)
      throw new Error(`Failed to initialize git repository: ${message}`)
    }
  }

  /**
   * Inspect a directory without modifying it
   * Returns information about the workspace state
   */
  async inspect(directory: string): Promise<{
    exists: boolean
    hasGit: boolean
    hasOpenCodeConfig: boolean
    hasGitignore: boolean
  }> {
    try {
      // Check if directory exists
      let exists = false
      try {
        await fs.access(directory)
        exists = true
      } catch {
        exists = false
      }

      if (!exists) {
        return {
          exists: false,
          hasGit: false,
          hasOpenCodeConfig: false,
          hasGitignore: false
        }
      }

      // Check for .git directory
      let hasGit = false
      try {
        await fs.access(join(directory, '.git'))
        hasGit = true
      } catch {
        hasGit = false
      }

      // Check for opencode.json config
      let hasOpenCodeConfig = false
      try {
        await fs.access(join(directory, 'opencode.json'))
        hasOpenCodeConfig = true
      } catch {
        hasOpenCodeConfig = false
      }

      // Check for .gitignore
      let hasGitignore = false
      try {
        await fs.access(join(directory, '.gitignore'))
        hasGitignore = true
      } catch {
        hasGitignore = false
      }

      return {
        exists,
        hasGit,
        hasOpenCodeConfig,
        hasGitignore
      }
    } catch (error) {
      console.error('Error inspecting workspace:', error)
      return {
        exists: false,
        hasGit: false,
        hasOpenCodeConfig: false,
        hasGitignore: false
      }
    }
  }

  /**
   * Get workspace status
   */
  getStatus(): { current?: string; original?: string } {
    return {
      current: this.currentDirectory,
      original: this.originalCwd
    }
  }

  /**
   * Discover projects recursively from a base directory
   * Looks for Git repos and other project indicators
   */
  async discoverProjects(
    baseDir: string,
    maxDepth = 3,
    currentDepth = 0
  ): Promise<DiscoveredProject[]> {
    const projects: DiscoveredProject[] = []

    if (currentDepth >= maxDepth) return projects

    try {
      const entries = await fs.readdir(baseDir, { withFileTypes: true })

      // Check if current directory is a project
      const projectInfo = await this.inspectAsProject(baseDir)
      if (projectInfo.hasGit || projectInfo.hasPackageJson) {
        projects.push(projectInfo)
        // Don't recurse into Git repos
        if (projectInfo.hasGit) return projects
      }

      // Recurse into subdirectories
      for (const entry of entries) {
        if (entry.isDirectory() && !entry.name.startsWith('.') && entry.name !== 'node_modules') {
          const subDir = join(baseDir, entry.name)
          const subProjects = await this.discoverProjects(subDir, maxDepth, currentDepth + 1)
          projects.push(...subProjects)
        }
      }
    } catch (error) {
      console.error(`Error discovering projects in ${baseDir}:`, error)
    }

    return projects
  }

  /**
   * Inspect a directory to determine if it's a project
   */
  private async inspectAsProject(directory: string): Promise<DiscoveredProject> {
    const name = basename(directory)
    let hasGit = false
    let hasOpenCodeConfig = false
    let hasPackageJson = false
    let projectType: DiscoveredProject['projectType'] = 'unknown'
    let lastModified: Date | undefined

    try {
      // Check for various project indicators
      const checks = await Promise.allSettled([
        fs.access(join(directory, '.git')),
        fs.access(join(directory, 'opencode.json')),
        fs.access(join(directory, 'package.json')),
        fs.access(join(directory, 'requirements.txt')),
        fs.access(join(directory, 'go.mod')),
        fs.access(join(directory, 'Cargo.toml')),
        fs.stat(directory)
      ])

      hasGit = checks[0].status === 'fulfilled'
      hasOpenCodeConfig = checks[1].status === 'fulfilled'
      hasPackageJson = checks[2].status === 'fulfilled'

      // Determine project type
      if (hasPackageJson) projectType = 'node'
      else if (checks[3].status === 'fulfilled') projectType = 'python'
      else if (checks[4].status === 'fulfilled') projectType = 'go'
      else if (checks[5].status === 'fulfilled') projectType = 'rust'

      // Get last modified
      if (checks[6].status === 'fulfilled') {
        lastModified = (checks[6] as PromiseFulfilledResult<import('fs').Stats>).value.mtime
      }
    } catch (error) {
      console.error(`Error inspecting project ${directory}:`, error)
    }

    return {
      path: directory,
      name,
      hasGit,
      hasOpenCodeConfig,
      hasPackageJson,
      projectType,
      lastModified
    }
  }

  /**
   * Get workspace collections by grouping OpenCode data
   */
  async getWorkspaceCollections(): Promise<WorkspaceCollection[]> {
    if (!this.clientManager) {
      return []
    }

    try {
      const client = this.clientManager.getClientForManager()

      // Get all sessions and projects from OpenCode
      const [sessionsResponse, projectsResponse] = await Promise.all([
        client.session.list(),
        client.project.list()
      ])

      const sessions = sessionsResponse.data || []
      const projects = projectsResponse.data || []

      // Group sessions by directory to find workspace base directories
      const directoryMap = new Map<string, Session[]>()
      sessions.forEach((session) => {
        if (session.directory) {
          const existing = directoryMap.get(session.directory) || []
          existing.push(session)
          directoryMap.set(session.directory, existing)
        }
      })

      // Create workspace collections
      const collections: WorkspaceCollection[] = []

      for (const [directory, dirSessions] of directoryMap) {
        // Find matching project
        const project = projects.find((p) => p.worktree === directory)

        // Create enriched project
        const enrichedProject = await this.enrichProject(project, dirSessions)

        // Find or create collection for base directory
        const baseDir = this.getBaseDirectory(directory)
        let collection = collections.find((c) => c.baseDirectory === baseDir)

        if (!collection) {
          collection = {
            id: Buffer.from(baseDir).toString('base64'),
            name: basename(baseDir),
            baseDirectory: baseDir,
            projects: [],
            createdAt: new Date(),
            lastAccessed: new Date()
          }
          collections.push(collection)
        }

        collection.projects.push(enrichedProject)
      }

      return collections
    } catch (error) {
      console.error('Error getting workspace collections:', error)
      return []
    }
  }

  /**
   * Enrich an OpenCode project with additional metadata
   */
  private async enrichProject(
    project: Project | undefined,
    sessions: Session[]
  ): Promise<EnrichedProject> {
    const worktree = project?.worktree || sessions[0]?.directory || 'unknown'
    const name = basename(worktree)

    // Calculate session stats
    const sessionCount = sessions.length
    let lastSessionDate: Date | undefined
    if (sessions.length > 0) {
      const latestSession = sessions.reduce((latest, session) => {
        const sessionTime = session.time?.updated || session.time?.created || 0
        const latestTime = latest.time?.updated || latest.time?.created || 0
        return sessionTime > latestTime ? session : latest
      })
      if (latestSession.time?.updated || latestSession.time?.created) {
        lastSessionDate = new Date(latestSession.time.updated || latestSession.time.created)
      }
    }

    return {
      id: project?.id || Buffer.from(worktree).toString('base64'),
      worktree,
      vcs: project?.vcs,
      projectID: project?.id,
      sessionCount,
      lastSessionDate,
      name,
      lastOpened: lastSessionDate
    }
  }

  /**
   * Get base directory from a full path
   * This is a simple implementation - could be enhanced
   */
  private getBaseDirectory(fullPath: string): string {
    // For now, just go up one level
    // Could be smarter about detecting workspace roots
    const parts = fullPath.split(/[\\/]/)
    if (parts.length > 2) {
      return parts.slice(0, -1).join(sep)
    }
    return fullPath
  }
}
