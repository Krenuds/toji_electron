// Project initialization logic for converting non-git folders into proper projects
import { exec } from 'child_process'
import { promisify } from 'util'
import { writeFile, access, unlink } from 'fs/promises'
import { existsSync } from 'fs'
import { join } from 'path'
import type { OpencodeConfig } from './config'
import { defaultOpencodeConfig } from './config'
import { createFileDebugLogger } from '../utils/logger'

const log = createFileDebugLogger('toji:project-init')

export interface InitializationResult {
  success: boolean
  error?: string
  needsGitInstall?: boolean
  steps?: string[]
  projectPath?: string
  rollbackPerformed?: boolean
}

export interface ProjectStatus {
  isGlobalProject: boolean
  hasGit: boolean
  hasOpenCodeConfig: boolean
  gitAvailable: boolean
  path: string
}

export class ProjectInitializer {
  private execAsync = promisify(exec)

  /**
   * Check if git is available on the system
   */
  async checkGitAvailable(): Promise<boolean> {
    try {
      await this.execAsync('git --version')
      log('Git found in PATH')
      return true
    } catch {
      log('Git not found in PATH, checking common locations...')
      // Windows: Check common Git installation locations
      if (process.platform === 'win32') {
        const commonPaths = [
          'C:\\Program Files\\Git\\bin\\git.exe',
          'C:\\Program Files (x86)\\Git\\bin\\git.exe',
          'C:\\Program Files\\Git\\cmd\\git.exe'
        ]
        for (const gitPath of commonPaths) {
          try {
            await access(gitPath)
            log('Git found at: %s', gitPath)
            // Update PATH for this session
            const binDir = gitPath.substring(0, gitPath.lastIndexOf('\\'))
            process.env.PATH = `${binDir};${process.env.PATH}`
            return true
          } catch {
            // Continue checking other paths
          }
        }
      }
      log('Git not available on system')
      return false
    }
  }

  /**
   * Check if a directory has a git repository
   */
  async hasGitRepository(directory: string): Promise<boolean> {
    return existsSync(join(directory, '.git'))
  }

  /**
   * Check if a directory has an opencode.json config
   */
  async hasOpenCodeConfig(directory: string): Promise<boolean> {
    return existsSync(join(directory, 'opencode.json'))
  }

  /**
   * Get the complete project status
   */
  async getProjectStatus(directory: string, currentProjectId?: string): Promise<ProjectStatus> {
    const hasGit = await this.hasGitRepository(directory)
    const hasOpenCodeConfig = await this.hasOpenCodeConfig(directory)
    const gitAvailable = await this.checkGitAvailable()

    // If project ID is "global" or no git repo, it's a global project
    const isGlobalProject = currentProjectId === 'global' || !hasGit

    return {
      isGlobalProject,
      hasGit,
      hasOpenCodeConfig,
      gitAvailable,
      path: directory
    }
  }

  /**
   * Initialize a project with git and opencode.json
   */
  async initializeProject(
    directory: string,
    config?: Partial<OpencodeConfig>
  ): Promise<InitializationResult> {
    const completedSteps: string[] = []
    log('Starting project initialization for: %s', directory)

    try {
      // Step 1: Verify git is available
      const hasGit = await this.checkGitAvailable()
      if (!hasGit) {
        log('Git not available, cannot initialize project')
        return {
          success: false,
          error: 'Git is not installed. Please install Git from https://git-scm.com',
          needsGitInstall: true
        }
      }

      // Step 2: Check if already has git
      if (await this.hasGitRepository(directory)) {
        log('Directory already has git repository')
        // Just add opencode.json if missing
        if (!(await this.hasOpenCodeConfig(directory))) {
          await this.createOpenCodeConfig(directory, config)
          completedSteps.push('opencode-config')
        }
        return {
          success: true,
          steps: completedSteps,
          projectPath: directory
        }
      }

      // Step 3: Git init
      log('Initializing git repository...')
      await this.execAsync('git init', { cwd: directory })
      completedSteps.push('git-init')

      // Step 4: Create .gitignore
      log('Creating .gitignore...')
      const gitignoreContent = `# Dependencies
node_modules/
bower_components/
vendor/

# Build outputs
dist/
build/
out/
*.exe
*.dll
*.so
*.dylib

# IDE and editor files
.vscode/
.idea/
*.swp
*.swo
*~
.DS_Store
Thumbs.db

# Logs
*.log
npm-debug.log*
yarn-debug.log*
yarn-error.log*

# Environment files
.env
.env.local
.env.*.local

# Temporary files
*.tmp
*.temp
.cache/

# OpenCode
.opencode/sessions/
`
      await writeFile(join(directory, '.gitignore'), gitignoreContent, 'utf-8')
      completedSteps.push('gitignore')

      // Step 5: Create opencode.json
      log('Creating opencode.json configuration...')
      await this.createOpenCodeConfig(directory, config)
      completedSteps.push('opencode-config')

      // Step 6: Create README.md if doesn't exist
      const readmePath = join(directory, 'README.md')
      if (!existsSync(readmePath)) {
        log('Creating README.md...')
        const projectName = directory.split(/[/\\]/).pop() || 'Project'
        const readmeContent = `# ${projectName}

This project was initialized by Toji3 with OpenCode AI assistance.

## Getting Started

This project is configured to work with OpenCode AI for intelligent code assistance.

## Configuration

Project settings are stored in \`opencode.json\`.

---
*Initialized on ${new Date().toLocaleDateString()}*
`
        await writeFile(readmePath, readmeContent, 'utf-8')
        completedSteps.push('readme')
      }

      // Step 7: Stage all files
      log('Staging files for initial commit...')
      await this.execAsync('git add .', { cwd: directory })
      completedSteps.push('git-add')

      // Step 8: Create initial commit
      log('Creating initial commit...')
      const commitEnv = {
        ...process.env,
        GIT_AUTHOR_NAME: 'Toji3',
        GIT_AUTHOR_EMAIL: 'toji3@opencode.local',
        GIT_COMMITTER_NAME: 'Toji3',
        GIT_COMMITTER_EMAIL: 'toji3@opencode.local'
      }

      await this.execAsync('git commit -m "Initial commit - Project initialized by Toji3"', {
        cwd: directory,
        env: commitEnv
      })
      completedSteps.push('initial-commit')

      log('Project initialization completed successfully')
      return {
        success: true,
        steps: completedSteps,
        projectPath: directory
      }
    } catch (error) {
      log('ERROR: Project initialization failed: %o', error)
      // Attempt rollback
      await this.rollback(directory, completedSteps)
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error',
        steps: completedSteps,
        rollbackPerformed: true
      }
    }
  }

  /**
   * Create or update opencode.json configuration
   */
  private async createOpenCodeConfig(
    directory: string,
    config?: Partial<OpencodeConfig>
  ): Promise<void> {
    const opencodeConfig = {
      ...defaultOpencodeConfig,
      ...config
      // Only include valid OpenCode config fields
      // No "rules" or "project" fields as they are not valid
    }

    const configPath = join(directory, 'opencode.json')
    await writeFile(configPath, JSON.stringify(opencodeConfig, null, 2), 'utf-8')
    log('Created opencode.json at: %s', configPath)
  }

  /**
   * Rollback initialization on failure
   */
  private async rollback(directory: string, completedSteps: string[]): Promise<void> {
    log('Rolling back initialization steps...')

    try {
      // Remove files in reverse order
      if (completedSteps.includes('readme')) {
        await unlink(join(directory, 'README.md')).catch(() => {})
      }
      if (completedSteps.includes('opencode-config')) {
        await unlink(join(directory, 'opencode.json')).catch(() => {})
      }
      if (completedSteps.includes('gitignore')) {
        await unlink(join(directory, '.gitignore')).catch(() => {})
      }
      if (completedSteps.includes('git-init')) {
        // Remove .git directory (platform-specific)
        const rmCommand = process.platform === 'win32' ? 'rmdir /s /q .git' : 'rm -rf .git'
        await this.execAsync(rmCommand, { cwd: directory }).catch(() => {})
      }
      log('Rollback completed')
    } catch (error) {
      log('ERROR: Rollback failed: %o', error)
    }
  }
}
