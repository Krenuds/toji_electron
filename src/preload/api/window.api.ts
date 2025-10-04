// Window control API for preload
import { ipcRenderer } from 'electron'

export const windowAPI = {
  // Window controls
  minimize: (): Promise<void> => ipcRenderer.invoke('window:minimize'),
  maximize: (): Promise<void> => ipcRenderer.invoke('window:maximize'),
  close: (): Promise<void> => ipcRenderer.invoke('window:close'),

  // Directory selection
  selectDirectory: (): Promise<string | null> => ipcRenderer.invoke('window:select-directory'),

  // Open folder in file explorer
  openFolder: (folderPath: string): Promise<void> =>
    ipcRenderer.invoke('window:open-folder', folderPath)
}
