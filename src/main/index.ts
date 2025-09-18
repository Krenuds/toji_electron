import { app, shell, BrowserWindow, ipcMain } from 'electron'
import { join } from 'path'
import { electronApp, optimizer, is } from '@electron-toolkit/utils'
import icon from '../../resources/toji.png?asset'
import { Toji } from './api/Toji'
import { OpenCodeService } from './services/opencode-service'
import { ConfigProvider } from './config/ConfigProvider'

// Global instances
let toji: Toji | null = null
let config: ConfigProvider | null = null

function createWindow(): void {
  // Create the browser window.
  const mainWindow = new BrowserWindow({
    width: 1280,
    height: 900,
    show: false,
    autoHideMenuBar: true,
    icon: icon,
    titleBarStyle: 'hidden',
    title: 'Toji3',
    center: true,
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
  // Initialize configuration provider
  config = new ConfigProvider()
  console.log('Config initialized with working directory:', config.getOpencodeWorkingDirectory())

  // Initialize binary service
  const openCodeService = new OpenCodeService()

  // Check binary status on startup
  const binaryInfo = openCodeService.getBinaryInfo()
  console.log('Binary status on startup:', binaryInfo)

  // Initialize Toji API with binary service and config
  toji = new Toji(openCodeService, config)
  console.log('Toji API initialized')

  // Set up IPC handlers for Core and Binary management
  setupCoreHandlers()
  setupBinaryHandlers(openCodeService)
  setupWindowHandlers()
  setupSystemHandlers()

  // Set app user model id for windows
  electronApp.setAppUserModelId('com.toji.toji3')

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

// Setup IPC handlers for Core functionality (now using Toji)
function setupCoreHandlers(): void {
  if (!toji) return

  // Core API status
  ipcMain.handle('core:is-running', async () => {
    const isReady = toji!.isReady()
    return isReady
  })

  ipcMain.handle('core:get-current-directory', async () => {
    return toji!.workspace.getCurrentDirectory()
  })

  // Main API - Start OpenCode in directory
  ipcMain.handle('core:start-opencode', async (_, directory: string, config?: object) => {
    if (!toji) {
      throw new Error('Toji not initialized')
    }
    return await toji.initialize(directory, config)
  })

  // Stop OpenCode
  ipcMain.handle('core:stop-opencode', async () => {
    if (!toji) {
      throw new Error('Toji not initialized')
    }
    return await toji.shutdown()
  })

  // Send prompt to current agent
  ipcMain.handle('core:prompt', async (_, text: string) => {
    if (!toji) {
      throw new Error('Toji not initialized')
    }
    // Use the session manager's prompt method
    const currentSession = toji.session.getCurrentSession()
    if (!currentSession) {
      // Create a new session if none exists
      const newSession = await toji.session.create('Default Session')
      return await toji.session.prompt(text, newSession.id)
    }
    return await toji.session.prompt(text, currentSession.id)
  })

  // List projects
  ipcMain.handle('core:list-projects', async () => {
    if (!toji) {
      throw new Error('Toji not initialized')
    }
    return await toji.project.list()
  })

  // List sessions
  ipcMain.handle('core:list-sessions', async () => {
    if (!toji) {
      throw new Error('Toji not initialized')
    }
    return await toji.session.list()
  })

  // Delete session
  ipcMain.handle('core:delete-session', async (_, sessionId: string) => {
    if (!toji) {
      throw new Error('Toji not initialized')
    }
    return await toji.session.delete(sessionId)
  })

  // Chat operations using Toji API
  ipcMain.handle('core:ensure-ready-for-chat', async (_, directory?: string) => {
    if (!toji) {
      throw new Error('Toji not initialized')
    }
    return await toji.ensureReadyForChat(directory)
  })

  ipcMain.handle('core:chat', async (_, message: string) => {
    if (!toji) {
      throw new Error('Toji not initialized')
    }
    return await toji.chat(message)
  })

  // Change workspace directory
  ipcMain.handle('core:change-workspace', async (_, directory: string) => {
    if (!toji) {
      throw new Error('Toji not initialized')
    }
    return await toji.changeWorkspace(directory)
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

  // Get OpenCode logs
  ipcMain.handle('api:get-opencode-logs', async () => {
    if (!toji) {
      throw new Error('Toji API not initialized')
    }
    return await toji.server.getLogs()
  })
}

// Setup IPC handlers for Window controls
function setupWindowHandlers(): void {
  // Minimize window
  ipcMain.handle('window:minimize', async () => {
    const mainWindow = BrowserWindow.getAllWindows()[0]
    if (mainWindow) {
      mainWindow.minimize()
    }
  })

  // Maximize/restore window
  ipcMain.handle('window:maximize', async () => {
    const mainWindow = BrowserWindow.getAllWindows()[0]
    if (mainWindow) {
      if (mainWindow.isMaximized()) {
        mainWindow.restore()
      } else {
        mainWindow.maximize()
      }
    }
  })

  // Close window
  ipcMain.handle('window:close', async () => {
    const mainWindow = BrowserWindow.getAllWindows()[0]
    if (mainWindow) {
      mainWindow.close()
    }
  })
}

// Quit when all windows are closed, except on macOS. There, it's common
// for applications and their menu bar to stay active until the user quits
// explicitly with Cmd + Q.
app.on('window-all-closed', async () => {
  console.log('All windows closed, cleaning up...')

  // Stop any running OpenCode agents
  if (toji) {
    try {
      await toji.shutdown()
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
  if (toji) {
    event.preventDefault()
    console.log('App is quitting, cleaning up...')

    try {
      await toji.shutdown()
      console.log('Cleanup completed, quitting app')
    } catch (error) {
      console.error('Error during cleanup:', error)
    } finally {
      toji = null
      app.quit()
    }
  }
})

// Setup IPC handlers for System Service Management
function setupSystemHandlers(): void {
  // Get service status - returns mock data for now
  ipcMain.handle('system:get-service-status', async () => {
    return {
      core: { status: 'running', uptime: Date.now() - 2 * 60 * 60 * 1000 }, // 2 hours ago
      discord: { status: 'connected', servers: 3 },
      whisper: { status: 'loading', port: 9000 },
      tts: { status: 'stopped', port: 9001 },
      claudeCli: { status: 'authenticated' }
    }
  })

  // Service controls - placeholder implementations
  ipcMain.handle('system:start-all-services', async () => {
    console.log('Starting all Toji services...')
    // TODO: Implement actual service startup logic
  })

  ipcMain.handle('system:stop-all-services', async () => {
    console.log('Stopping all Toji services...')
    // TODO: Implement actual service shutdown logic
  })

  ipcMain.handle('system:restart-all-services', async () => {
    console.log('Restarting all Toji services...')
    // TODO: Implement actual service restart logic
  })

  // Individual service controls
  ipcMain.handle('system:start-service', async (_, serviceName: string) => {
    console.log(`Starting service: ${serviceName}`)
    // TODO: Implement service-specific startup logic
  })

  ipcMain.handle('system:stop-service', async (_, serviceName: string) => {
    console.log(`Stopping service: ${serviceName}`)
    // TODO: Implement service-specific shutdown logic
  })

  ipcMain.handle('system:restart-service', async (_, serviceName: string) => {
    console.log(`Restarting service: ${serviceName}`)
    // TODO: Implement service-specific restart logic
  })

  // Get system resources - returns mock data for now
  ipcMain.handle('system:get-system-resources', async () => {
    return {
      cpu: 23, // 23% CPU usage
      memory: { used: 1.2 * 1024 * 1024 * 1024, total: 16 * 1024 * 1024 * 1024 }, // 1.2GB used of 16GB
      disk: { used: 847 * 1024 * 1024 }, // 847MB used for logs/cache
      network: { latency: 45 } // 45ms average latency
    }
  })

  // Get interface status - returns mock data for now
  ipcMain.handle('system:get-interface-status', async () => {
    return {
      electron: { status: 'active', description: 'This interface - Active' },
      discord: { status: 'connected', description: '3 servers connected' },
      slack: { status: 'disconnected', description: 'Not configured' },
      mcp: { status: 'active', description: 'Claude Code CLI ready' },
      voice: { status: 'inactive', description: 'No active connections' }
    }
  })

  // Install dependencies
  ipcMain.handle('system:install-dependencies', async () => {
    console.log('Installing Toji dependencies...')
    // TODO: Implement dependency installation (Whisper, Piper, etc.)
  })

  // Test connections
  ipcMain.handle('system:test-connections', async () => {
    console.log('Testing all service connections...')
    // TODO: Implement connection testing
    return {
      discord: true,
      whisper: false,
      tts: false,
      claudeCli: true,
      mcp: true
    }
  })
}

// In this file you can include the rest of your app's specific main process
// code. You can also put them in separate files and require them here.
