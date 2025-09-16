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
  // Initialize Core and services
  core = new Core()

  const openCodeService = new OpenCodeService({
    model: 'anthropic/claude-3-5-sonnet-20241022',
    hostname: '127.0.0.1',
    port: 4096
  })

  core.registerService(openCodeService)
  console.log('Core initialized with OpenCode service')

  // Set up IPC handlers for Core
  setupCoreHandlers()

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

  // Core status and service management
  ipcMain.handle('core:get-status', async () => {
    return core!.getAllStatus()
  })

  ipcMain.handle('core:start-service', async (_, serviceName: string) => {
    const mainWindow = BrowserWindow.getAllWindows()[0]
    try {
      await core!.startService(serviceName)
      if (mainWindow) {
        mainWindow.webContents.send('core:service-status-changed', {
          service: serviceName,
          status: core!.getServiceStatus(serviceName)
        })
      }
    } catch (error) {
      if (mainWindow) {
        mainWindow.webContents.send('core:service-error', {
          service: serviceName,
          error: error instanceof Error ? error.message : 'Unknown error'
        })
      }
      throw error
    }
  })

  ipcMain.handle('core:stop-service', async (_, serviceName: string) => {
    await core!.stopService(serviceName)
    const mainWindow = BrowserWindow.getAllWindows()[0]
    if (mainWindow) {
      mainWindow.webContents.send('core:service-status-changed', {
        service: serviceName,
        status: core!.getServiceStatus(serviceName)
      })
    }
  })

  ipcMain.handle('core:get-service-status', async (_, serviceName: string) => {
    return core!.getServiceStatus(serviceName)
  })

  // OpenCode-specific methods (delegated through core)
  const openCodeService = core.getService<OpenCodeService>('opencode')

  ipcMain.handle('opencode:get-binary-info', async () => {
    return await openCodeService?.getBinaryInfo()
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
      await openCodeService?.downloadBinary()
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
    return await openCodeService?.ensureBinary()
  })

  // Core API - Direct OpenCode SDK usage
  ipcMain.handle('core:prompt', async (_, text: string) => {
    if (!core) {
      throw new Error('Core not initialized')
    }
    return await core.prompt(text)
  })

}

// Quit when all windows are closed, except on macOS. There, it's common
// for applications and their menu bar to stay active until the user quits
// explicitly with Cmd + Q.
app.on('window-all-closed', async () => {
  console.log('All windows closed, cleaning up services...')

  // Cleanup services before quitting
  if (core) {
    try {
      const openCodeService = core.getService<OpenCodeService>('opencode')
      if (openCodeService) {
        await openCodeService.cleanup()
      }
      console.log('Services cleanup completed')
    } catch (error) {
      console.error('Error during services cleanup:', error)
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
    console.log('App is quitting, cleaning up services...')

    try {
      const openCodeService = core.getService<OpenCodeService>('opencode')
      if (openCodeService) {
        await openCodeService.cleanup()
      }
      console.log('Services cleanup completed, quitting app')
    } catch (error) {
      console.error('Error during services cleanup:', error)
    } finally {
      core = null
      app.quit()
    }
  }
})

// In this file you can include the rest of your app's specific main process
// code. You can also put them in separate files and require them here.
