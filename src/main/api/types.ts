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
