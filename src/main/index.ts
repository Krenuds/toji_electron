import { app, shell, BrowserWindow, ipcMain } from 'electron'
import { join } from 'path'
import { electronApp, optimizer, is } from '@electron-toolkit/utils'
import icon from '../../resources/toji.png?asset'
import { OpenCodeManager } from './opencode-manager'

// Global OpenCode manager instance
let openCodeManager: OpenCodeManager | null = null

function createWindow(): void {
  // Create the browser window.
  const mainWindow = new BrowserWindow({
    width: 800,
    height: 900,
    show: false,
    autoHideMenuBar: true,
    ...(process.platform === 'linux' ? { icon } : {}),
    webPreferences: {
      preload: join(__dirname, '../preload/index.js'),
      sandbox: false
    }
  })

  mainWindow.on('ready-to-show', () => {
    mainWindow.show()
  })

  mainWindow.webContents.setWindowOpenHandler((details) => {
    shell.openExternal(details.url)
    return { action: 'deny' }
  })

  // HMR for renderer base on electron-vite cli.
  // Load the remote URL for development or the local html file for production.
  if (is.dev && process.env['ELECTRON_RENDERER_URL']) {
    mainWindow.loadURL(process.env['ELECTRON_RENDERER_URL'])
  } else {
    mainWindow.loadFile(join(__dirname, '../renderer/index.html'))
  }
}

// This method will be called when Electron has finished
// initialization and is ready to create browser windows.
// Some APIs can only be used after this event occurs.
app.whenReady().then(async () => {
  // Initialize OpenCode manager
  openCodeManager = new OpenCodeManager({
    model: 'anthropic/claude-3-5-sonnet-20241022',
    hostname: '127.0.0.1',
    port: 4096
  })

  console.log('OpenCode manager initialized')

  // Set up IPC handlers for OpenCode
  setupOpenCodeHandlers()

  // Set app user model id for windows
  electronApp.setAppUserModelId('com.electron')

  // Default open or close DevTools by F12 in development
  // and ignore CommandOrControl + R in production.
  // see https://github.com/alex8088/electron-toolkit/tree/master/packages/utils
  app.on('browser-window-created', (_, window) => {
    optimizer.watchWindowShortcuts(window)
  })

  // IPC test
  ipcMain.on('ping', () => console.log('pong'))

  createWindow()

  app.on('activate', function () {
    // On macOS it's common to re-create a window in the app when the
    // dock icon is clicked and there are no other windows open.
    if (BrowserWindow.getAllWindows().length === 0) createWindow()
  })
})

// Setup IPC handlers for OpenCode functionality
function setupOpenCodeHandlers(): void {
  if (!openCodeManager) return

  // Binary management
  ipcMain.handle('opencode:get-binary-info', async () => {
    return await openCodeManager!.getBinaryInfo()
  })

  ipcMain.handle('opencode:download-binary', async () => {
    const mainWindow = BrowserWindow.getAllWindows()[0]
    if (mainWindow) {
      mainWindow.webContents.send('opencode:binary-update', {
        stage: 'downloading',
        message: 'Downloading OpenCode binary...'
      })
    }

    try {
      await openCodeManager!.downloadBinary()
      if (mainWindow) {
        mainWindow.webContents.send('opencode:binary-update', {
          stage: 'complete',
          message: 'Binary downloaded successfully'
        })
      }
    } catch (error) {
      if (mainWindow) {
        mainWindow.webContents.send('opencode:binary-update', {
          stage: 'error',
          error: error instanceof Error ? error.message : 'Unknown error'
        })
      }
      throw error
    }
  })

  ipcMain.handle('opencode:ensure-binary', async () => {
    return await openCodeManager!.ensureBinary()
  })

  // Server management
  ipcMain.handle('opencode:start-server', async () => {
    const status = await openCodeManager!.startServer()
    const mainWindow = BrowserWindow.getAllWindows()[0]
    if (mainWindow) {
      mainWindow.webContents.send('opencode:server-status-changed', status)
    }
    return status
  })

  ipcMain.handle('opencode:stop-server', async () => {
    await openCodeManager!.stopServer()
    const mainWindow = BrowserWindow.getAllWindows()[0]
    if (mainWindow) {
      mainWindow.webContents.send('opencode:server-status-changed', { running: false })
    }
  })

  ipcMain.handle('opencode:get-server-status', async () => {
    return await openCodeManager!.getServerStatus()
  })

  // Health check
  ipcMain.handle('opencode:health-check', async () => {
    if (!openCodeManager) return false
    return await openCodeManager.checkHealth()
  })

  // Configuration
  ipcMain.handle('opencode:update-config', async (_, config) => {
    openCodeManager!.updateConfig(config)
  })
}

// Quit when all windows are closed, except on macOS. There, it's common
// for applications and their menu bar to stay active until the user quits
// explicitly with Cmd + Q.
app.on('window-all-closed', async () => {
  console.log('All windows closed, cleaning up OpenCode manager...')

  // Cleanup OpenCode manager before quitting
  if (openCodeManager) {
    try {
      await openCodeManager.cleanup()
      console.log('OpenCode manager cleanup completed')
    } catch (error) {
      console.error('Error during OpenCode cleanup:', error)
    }
  }

  if (process.platform !== 'darwin') {
    app.quit()
  }
})

// Handle application quit events
app.on('before-quit', async (event) => {
  if (openCodeManager) {
    event.preventDefault()
    console.log('App is quitting, cleaning up OpenCode manager...')

    try {
      await openCodeManager.cleanup()
      console.log('OpenCode cleanup completed, quitting app')
    } catch (error) {
      console.error('Error during OpenCode cleanup:', error)
    } finally {
      openCodeManager = null
      app.quit()
    }
  }
})

// In this file you can include the rest of your app's specific main process
// code. You can also put them in separate files and require them here.
