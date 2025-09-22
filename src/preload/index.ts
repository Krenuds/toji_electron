import { contextBridge } from 'electron'
import { electronAPI } from '@electron-toolkit/preload'

// Import all API modules
import { tojiAPI, projectAPI, windowAPI, discordAPI, binaryAPI } from './api'

// Build the complete API object - clean and modular!
const api = {
  toji: tojiAPI,
  project: projectAPI,
  window: windowAPI,
  discord: discordAPI,
  binary: binaryAPI,
  // Stub for logs - will be implemented later
  logs: {
    getOpenCodeLogs: (): Promise<string> => Promise.resolve('No logs available')
  }
}

// Use `contextBridge` APIs to expose Electron APIs to
// renderer only if context isolation is enabled, otherwise
// just add to the DOM global.
if (process.contextIsolated) {
  try {
    contextBridge.exposeInMainWorld('electron', electronAPI)
    contextBridge.exposeInMainWorld('api', api)
  } catch (error) {
    console.error(error)
  }
} else {
  // @ts-ignore (define in dts)
  window.electron = electronAPI
  // @ts-ignore (define in dts)
  window.api = api
}
