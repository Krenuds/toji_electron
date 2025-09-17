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

// Core API Types
export interface ServiceStatus {
  running: boolean
  healthy?: boolean
  error?: string
  lastCheck?: Date
}

export interface CoreStatus {
  services: Record<string, ServiceStatus>
  currentWorkspace?: string
}

export interface ServiceStatusChangeEvent {
  service: string
  status: ServiceStatus
}

export interface ServiceErrorEvent {
  service: string
  error: string
}

export interface CoreAPI {
  // Service Management
  getStatus: () => Promise<CoreStatus>
  startService: (serviceName: string) => Promise<void>
  stopService: (serviceName: string) => Promise<void>
  getServiceStatus: (serviceName: string) => Promise<ServiceStatus>

  // Core OpenCode SDK API
  prompt: (text: string) => Promise<string>

  // Events
  onServiceStatusChange: (callback: (data: ServiceStatusChangeEvent) => void) => () => void
  onServiceError: (callback: (data: ServiceErrorEvent) => void) => () => void
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
