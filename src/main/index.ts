import { app, shell, BrowserWindow, ipcMain } from 'electron'
import { join } from 'path'
import { electronApp, optimizer, is } from '@electron-toolkit/utils'
import icon from '../../resources/toji.png?asset'
import { Core } from './core/core'
import { OpenCodeService } from './services/opencode-service'

// Global Core instance
let core: Core | null = null

function createWindow(): void {
  // Create the browser window.
  const mainWindow = new BrowserWindow({
    width: 1280,
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
  // Initialize binary service
  const openCodeService = new OpenCodeService()

  // Check binary status on startup
  const binaryInfo = openCodeService.getBinaryInfo()
  console.log('Binary status on startup:', binaryInfo)

  // Initialize Core API with binary service
  core = new Core(openCodeService)
  console.log('Core API initialized')

  // Set up IPC handlers for Core and Binary management
  setupCoreHandlers()
  setupBinaryHandlers(openCodeService)

  // Set app user model id for windows
  electronApp.setAppUserModelId('com.electron')

  // Default open or close DevTools by F12 in development
  // and ignore CommandOrControl + R in production.
  // see https://github.com/alex8088/electron-toolkit/tree/master/packages/utils
  app.on('browser-window-created', (_, window) => {
    optimizer.watchWindowShortcuts(window)
  })

  createWindow()

  app.on('activate', function () {
    // On macOS it's common to re-create a window in the app when the
    // dock icon is clicked and there are no other windows open.
    if (BrowserWindow.getAllWindows().length === 0) createWindow()
  })
})

// Setup IPC handlers for Core functionality
function setupCoreHandlers(): void {
  if (!core) return

  // Core API status
  ipcMain.handle('core:is-running', async () => {
    return core!.isRunning()
  })

  ipcMain.handle('core:get-current-directory', async () => {
    return core!.getCurrentDirectory()
  })

  // Main API - Start OpenCode in directory
  ipcMain.handle('core:start-opencode', async (_, directory: string, config?: object) => {
    if (!core) {
      throw new Error('Core not initialized')
    }
    return await core.startOpencodeInDirectory(directory, config)
  })

  // Stop OpenCode
  ipcMain.handle('core:stop-opencode', async () => {
    if (!core) {
      throw new Error('Core not initialized')
    }
    return await core.stopOpencode()
  })

  // Send prompt to current agent
  ipcMain.handle('core:prompt', async (_, text: string) => {
    if (!core) {
      throw new Error('Core not initialized')
    }
    return await core.prompt(text)
  })
}

// Setup IPC handlers for Binary management
function setupBinaryHandlers(openCodeService: OpenCodeService): void {
  // Get binary status
  ipcMain.handle('binary:get-info', async () => {
    return openCodeService.getBinaryInfo()
  })

  // Install binary
  ipcMain.handle('binary:install', async () => {
    const mainWindow = BrowserWindow.getAllWindows()[0]
    if (mainWindow) {
      mainWindow.webContents.send('binary:status-update', {
        stage: 'downloading',
        message: 'Downloading OpenCode binary...'
      })
    }

    try {
      await openCodeService.downloadBinary()
      if (mainWindow) {
        mainWindow.webContents.send('binary:status-update', {
          stage: 'complete',
          message: 'Binary installed successfully'
        })
      }
    } catch (error) {
      if (mainWindow) {
        mainWindow.webContents.send('binary:status-update', {
          stage: 'error',
          error: error instanceof Error ? error.message : 'Unknown error'
        })
      }
      throw error
    }
  })
}

// Quit when all windows are closed, except on macOS. There, it's common
// for applications and their menu bar to stay active until the user quits
// explicitly with Cmd + Q.
app.on('window-all-closed', async () => {
  console.log('All windows closed, cleaning up...')

  // Stop any running OpenCode agents
  if (core) {
    try {
      await core.stopOpencode()
      console.log('Cleanup completed')
    } catch (error) {
      console.error('Error during cleanup:', error)
    }
  }

  if (process.platform !== 'darwin') {
    app.quit()
  }
})

// Handle application quit events
app.on('before-quit', async (event) => {
  if (core) {
    event.preventDefault()
    console.log('App is quitting, cleaning up...')

    try {
      await core.stopOpencode()
      console.log('Cleanup completed, quitting app')
    } catch (error) {
      console.error('Error during cleanup:', error)
    } finally {
      core = null
      app.quit()
    }
  }
})

// In this file you can include the rest of your app's specific main process
// code. You can also put them in separate files and require them here.
