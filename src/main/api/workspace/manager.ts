// ============================================
// Workspace Manager - Directory and Workspace Operations
// ============================================

import { promises as fs } from 'fs'
import { join } from 'path'
import { exec } from 'child_process'
import { promisify } from 'util'

const execAsync = promisify(exec)

/**
 * Manages workspace operations including directory preparation,
 * git initialization, and workspace switching.
 * This orchestrates workspace-related functionality.
 */
export class WorkspaceManager {
  private currentDirectory?: string
  private originalCwd?: string

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
}
