import { ElectronAPI } from '@electron-toolkit/preload'
import type {
  tojiAPI,
  projectAPI,
  windowAPI,
  discordAPI,
  binaryAPI,
  loggerAPI,
  opencodeAPI
} from './api'

declare global {
  interface Window {
    electron: ElectronAPI
    api: {
      toji: typeof tojiAPI
      project: typeof projectAPI
      window: typeof windowAPI
      discord: typeof discordAPI
      binary: typeof binaryAPI
      logger: typeof loggerAPI
      opencode: typeof opencodeAPI
      dialog: {
        showOpenDialog: (
          options: Electron.OpenDialogOptions
        ) => Promise<{ canceled: boolean; filePaths: string[] }>
      }
    }
  }
}

// Export types from API modules
export type { BinaryInfo, BinaryProgress } from './api/binary.api'
export type { Project } from './api/project.api'
export type { ApiKeySyncResult } from './api/opencode.api'
export type {
  PermissionConfig,
  PermissionLevel,
  PermissionType,
  ModelConfig
} from '../main/toji/config'

// Export stub types from main
export type {
  Session,
  ProjectInfo,
  ProjectCollection,
  EnrichedProject,
  DiscoveredProject,
  ServerStatus
} from '../main/toji/types'
