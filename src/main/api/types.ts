// ============================================
// Toji API Type Definitions and Re-exports
// ============================================

// Re-export ALL OpenCode SDK types - Single source of truth
export type * from '@opencode-ai/sdk'

// Custom Toji types
export interface TojiConfig {
  server?: {
    hostname?: string
    port?: number
    timeout?: number
  }
  workspace?: {
    autoInit?: boolean
    gitInit?: boolean
  }
}

export interface TojiStatus {
  server: {
    running: boolean
    url?: string
    directory?: string
  }
  client: {
    connected: boolean
  }
  workspace: {
    current?: string
  }
}

// ============================================
// Workspace Collection Types
// ============================================

// Our workspace concept - a collection of related projects
export interface WorkspaceCollection {
  id: string
  name: string
  baseDirectory: string
  projects: EnrichedProject[]
  tags?: string[]
  createdAt: Date
  lastAccessed: Date
}

// Discovered project with metadata
export interface DiscoveredProject {
  path: string
  name: string
  hasGit: boolean
  hasOpenCodeConfig: boolean
  hasPackageJson?: boolean
  size?: number
  lastModified?: Date
  projectType?: 'node' | 'python' | 'go' | 'rust' | 'unknown'
}

// Enhanced project combining OpenCode + our metadata
export interface EnrichedProject {
  // From OpenCode SDK
  id: string
  worktree: string
  vcs?: string

  // From OpenCode sessions
  projectID?: string
  sessionCount?: number
  lastSessionDate?: Date

  // Our enrichments
  name: string
  description?: string
  tags?: string[]
  language?: string
  framework?: string
  lastOpened?: Date
  favorite?: boolean
  size?: number
}
