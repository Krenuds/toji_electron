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
  version?: string
  installed: boolean
  lastChecked: Date
}

export interface ServerStatus {
  running: boolean
  url?: string
  error?: string
}

export interface BinaryProgress {
  stage: 'downloading' | 'installing' | 'complete' | 'error'
  progress?: number
  message?: string
  error?: string
}

export interface OpenCodeAPI {
  // Binary Management
  getBinaryInfo: () => Promise<BinaryInfo>
  downloadBinary: () => Promise<void>
  ensureBinary: () => Promise<void>
  
  // Server Management
  startServer: () => Promise<ServerStatus>
  stopServer: () => Promise<void>
  getServerStatus: () => Promise<ServerStatus>
  
  // Configuration
  updateConfig: (config: Partial<OpenCodeConfig>) => Promise<void>
  
  // Events
  onServerStatusChange: (callback: (status: ServerStatus) => void) => () => void
  onBinaryUpdate: (callback: (progress: BinaryProgress) => void) => () => void
}

declare global {
  interface Window {
    electron: ElectronAPI
    api: {
      opencode: OpenCodeAPI
    }
  }
}
