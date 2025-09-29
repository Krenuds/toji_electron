// Event forwarding handler for Toji events to renderer process
// This decouples Toji from Electron BrowserWindow dependency
import { BrowserWindow } from 'electron'
import type { Toji } from '../toji'
import { createFileDebugLogger } from '../utils/logger'

const log = createFileDebugLogger('toji:events-handler')

/**
 * Register event listeners on Toji to forward events to the renderer process
 * This handler acts as the bridge between business logic (Toji) and UI (Electron renderer)
 */
export function registerTojiEventForwarding(toji: Toji): void {
  log('Registering Toji event forwarding handlers')

  // Forward project:opened events to renderer
  toji.on('project:opened', (data) => {
    try {
      const mainWindow = BrowserWindow.getAllWindows()[0]
      if (mainWindow && !mainWindow.isDestroyed()) {
        mainWindow.webContents.send('project:opened', data)
        log('Forwarded project:opened event: %s', data.path)
      } else {
        log('No window available to forward project:opened event')
      }
    } catch (error) {
      log('ERROR: Failed to forward project:opened event: %o', error)
    }
  })

  // Forward project:closed events to renderer
  toji.on('project:closed', (data) => {
    try {
      const mainWindow = BrowserWindow.getAllWindows()[0]
      if (mainWindow && !mainWindow.isDestroyed()) {
        mainWindow.webContents.send('project:closed', data)
        log('Forwarded project:closed event: %s', data.path)
      } else {
        log('No window available to forward project:closed event')
      }
    } catch (error) {
      log('ERROR: Failed to forward project:closed event: %o', error)
    }
  })

  log('Toji event forwarding handlers registered successfully')
}
