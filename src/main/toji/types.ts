// Minimal types for Toji

export interface WorkspaceSettings {
  [key: string]: unknown
}

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