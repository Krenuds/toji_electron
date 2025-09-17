import { ElectronAPI } from '@electron-toolkit/preload'

// OpenCode API Types
export interface OpenCodeConfig {
  model?: string
  hostname?: string
  port?: number
  timeout?: number
}

export interface BinaryInfo {
  path: string
  installed: boolean
  lastChecked: Date
}

export interface ServerStatus {
  running: boolean
  url?: string
  error?: string
  healthy?: boolean
  port?: number
  pid?: number
  lastHealthCheck?: Date
}

export interface BinaryProgress {
  stage: 'downloading' | 'installing' | 'complete' | 'error'
  progress?: number
  message?: string
  error?: string
}

// Legacy types - can be removed later if not needed

export interface CoreAPI {
  // Agent Management
  isRunning: () => Promise<boolean>
  getCurrentDirectory: () => Promise<string | undefined>
  startOpencode: (directory: string, config?: object) => Promise<void>
  stopOpencode: () => Promise<void>

  // OpenCode SDK API
  prompt: (text: string) => Promise<string>
}

export interface OpenCodeAPI {
  // Binary Management
  getBinaryInfo: () => Promise<BinaryInfo>
  downloadBinary: () => Promise<void>
  ensureBinary: () => Promise<void>

  // Events
  onBinaryUpdate: (callback: (progress: BinaryProgress) => void) => () => void
}

declare global {
  interface Window {
    electron: ElectronAPI
    api: {
      core: CoreAPI
      opencode: OpenCodeAPI
    }
  }
}
