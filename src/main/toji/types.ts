// Minimal types for Toji

export interface TojiConfig {
  server?: {
    hostname?: string
    port?: number
    timeout?: number
  }
  project?: {
    autoInit?: boolean
    gitInit?: boolean
  }
}

// Stub types for frontend - will be properly implemented later
export interface Session {
  id: string
  title?: string
  created?: Date
  updated?: Date
  version?: string
  projectID?: string
  directory?: string
  time?: {
    created?: string
    updated?: string
  }
}

export interface ProjectInfo {
  path: string
  hasGit?: boolean
  hasOpenCodeConfig?: boolean
  sessions?: Session[]
}

export interface ProjectCollection {
  id: string
  name: string
  projects: ProjectInfo[]
}

export interface EnrichedProject {
  id: string
  path: string
  name?: string
  sessionCount?: number
  vcs?: boolean
  metadata?: unknown
}

export interface DiscoveredProject {
  path: string
  type?: string
  name?: string
}

export interface ServerStatus {
  isRunning: boolean
  port?: number
  pid?: number
  startTime?: Date
  uptime?: number
  isHealthy?: boolean
  lastHealthCheck?: Date
}
