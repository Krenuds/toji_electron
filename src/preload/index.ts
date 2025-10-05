import { contextBridge, ipcRenderer } from 'electron'
import { electronAPI } from '@electron-toolkit/preload'

// Import all API modules
import {
  tojiAPI,
  projectAPI,
  windowAPI,
  discordAPI,
  binaryAPI,
  loggerAPI,
  opencodeAPI,
  voiceApi
} from './api'

// Build the complete API object - clean and modular!
const api = {
  toji: tojiAPI,
  project: projectAPI,
  window: windowAPI,
  discord: discordAPI,
  binary: binaryAPI,
  logger: loggerAPI,
  opencode: opencodeAPI,
  voice: voiceApi,
  dialog: {
    showOpenDialog: (options: Electron.OpenDialogOptions) =>
      ipcRenderer.invoke('dialog:showOpenDialog', options)
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
