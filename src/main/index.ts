import { app, shell, BrowserWindow, ipcMain, dialog } from 'electron'
import { join } from 'path'
import { execSync } from 'child_process'
import { electronApp, optimizer, is } from '@electron-toolkit/utils'
import windowStateKeeper from 'electron-window-state'
import icon from '../../resources/toji.png?asset'
import { Toji } from './toji'
import { OpenCodeService } from './services/opencode-service'
import { DiscordService } from './services/discord-service'
import { ConfigProvider } from './config/ConfigProvider'
import { initializeFileLogging, createFileDebugLogger } from './utils/logger'

// Initialize file logging as early as possible
initializeFileLogging()

// const log = createFileDebugLogger('toji:main') // Reserved for future use
const logStartup = createFileDebugLogger('toji:startup')
const logCleanup = createFileDebugLogger('toji:cleanup')

// Import modular handlers
import {
  registerTojiHandlers,
  registerTojiEventForwarding,
  registerProjectHandlers,
  registerWindowHandlers,
  registerDiscordHandlers,
  registerBinaryHandlers,
  registerLoggerHandlers,
  registerOpencodeHandlers
} from './handlers'

// Global instances
let toji: Toji | null = null
let config: ConfigProvider | null = null
let discordService: DiscordService | null = null

function createWindow(): void {
  // Load window state (position, size, maximized, etc.)
  const mainWindowState = windowStateKeeper({
    defaultWidth: 1280,
    defaultHeight: 900
  })

  // Create the browser window.
  const mainWindow = new BrowserWindow({
    x: mainWindowState.x,
    y: mainWindowState.y,
    width: mainWindowState.width,
    height: mainWindowState.height,
    show: false,
    autoHideMenuBar: true,
    icon: icon,
    titleBarStyle: 'hidden',
    title: 'Toji3',
    webPreferences: {
      preload: join(__dirname, '../preload/index.js'),
      sandbox: false
    }
  })

  // Let windowStateKeeper manage the window
  mainWindowState.manage(mainWindow)

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
  logStartup('Initializing ConfigProvider')
  config = new ConfigProvider()
  logStartup('Config initialized with working directory: %s', config.getOpencodeWorkingDirectory())

  // Initialize binary service
  logStartup('Initializing OpenCodeService')
  const openCodeService = new OpenCodeService()

  // Check binary status on startup
  const binaryInfo = openCodeService.getBinaryInfo()
  logStartup('Binary status on startup: %o', binaryInfo)

  // Initialize Toji API with binary service and config
  logStartup('Initializing Toji API')
  toji = new Toji(openCodeService, config)
  logStartup('Toji API initialized')

  // Initialize Discord service with Toji and config
  logStartup('Initializing Discord service')
  discordService = new DiscordService(toji, config)
  logStartup('Discord service initialized')

  // Auto-connect Discord bot if token is configured
  const discordToken = config.getDiscordToken()
  if (discordToken) {
    logStartup('Discord token found, connecting bot...')
    try {
      await discordService.connect()
      logStartup('Discord bot connected successfully')
    } catch (error) {
      logStartup('WARNING: Failed to connect Discord bot: %o', error)
      // Continue without Discord - it's not critical
    }
  } else {
    logStartup('No Discord token configured, bot will not connect')
  }

  // Always try to start OpenCode server (simplified approach)
  try {
    logStartup('Starting OpenCode server initialization')

    // First ensure binary is installed
    await openCodeService.ensureBinary()
    logStartup('OpenCode binary installation checked')

    // Load last project or use default
    const lastProject = config.getCurrentProjectPath() || config.getOpencodeWorkingDirectory()
    logStartup('Loading project: %s', lastProject)

    // Start the server from the project directory
    logStartup('Starting OpenCode server from project directory')
    await toji.server.start(undefined, lastProject)
    logStartup('OpenCode server ready (running from %s)', lastProject)

    // Connect the client to the specific project directory
    logStartup('Connecting OpenCode client for directory: %s', lastProject)
    await toji.connectClient(lastProject)
    logStartup('OpenCode client connected successfully')

    // Set the working directory
    await toji.changeWorkingDirectory(lastProject)
    logStartup('Project directory set: %s', lastProject)

    // Try to load the most recent session for this project
    try {
      await toji.loadMostRecentSession()
      logStartup('Loaded most recent session')
    } catch (sessionError) {
      logStartup(
        'Could not load most recent session (this is ok for new projects): %o',
        sessionError
      )
      // This is ok - might be a new project with no sessions
    }
  } catch (error) {
    logStartup('ERROR: Failed during OpenCode initialization: %o', error)
    // Re-throw to prevent running with undefined state
    throw error
  }

  // Register modular IPC handlers
  registerTojiHandlers(toji)
  registerProjectHandlers(toji)
  registerWindowHandlers()
  registerDiscordHandlers(discordService, config)
  registerBinaryHandlers(openCodeService)
  registerLoggerHandlers()
  registerOpencodeHandlers(toji, config)

  // Register Toji event forwarding (bridge business logic events to renderer)
  registerTojiEventForwarding(toji)

  // Register dialog handler
  ipcMain.handle('dialog:showOpenDialog', async (_, options) => {
    return dialog.showOpenDialog(options)
  })

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

// Quit when all windows are closed, except on macOS. There, it's common
// for applications and their menu bar to stay active until the user quits
// explicitly with Cmd + Q.
app.on('window-all-closed', async () => {
  logCleanup('All windows closed, starting cleanup sequence')

  // Disconnect Discord bot
  if (discordService) {
    try {
      logCleanup('Disconnecting Discord bot...')
      await discordService.disconnect()
      logCleanup('Discord bot disconnected successfully')
    } catch (error) {
      logCleanup('ERROR: Failed to disconnect Discord: %o', error)
    }
  }

  // Stop ALL running OpenCode servers
  if (toji) {
    try {
      logCleanup('Stopping all OpenCode servers...')
      await toji.server.stopAllServers()
      logCleanup('All OpenCode servers stopped successfully')
    } catch (error) {
      logCleanup('ERROR: Failed to stop OpenCode servers: %o', error)
    }
  }

  if (process.platform !== 'darwin') {
    app.quit()
  }
})

// Handle process exit as last resort
process.on('exit', () => {
  // Synchronous cleanup only - last chance
  if (toji) {
    try {
      // Try to kill all OpenCode processes synchronously
      if (process.platform === 'win32') {
        execSync('taskkill /F /IM opencode.exe', { stdio: 'ignore' })
      } else {
        execSync('pkill -f opencode', { stdio: 'ignore' })
      }
    } catch {
      // Ignore errors - best effort
    }
  }
})

// Handle SIGINT (Ctrl+C)
process.on('SIGINT', async () => {
  console.log('\nReceived SIGINT, shutting down gracefully...')
  if (toji) {
    await toji.server.stopAllServers()
  }
  process.exit(0)
})

// Handle SIGTERM
process.on('SIGTERM', async () => {
  console.log('Received SIGTERM, shutting down gracefully...')
  if (toji) {
    await toji.server.stopAllServers()
  }
  process.exit(0)
})

// Handle application quit events
app.on('before-quit', async (event) => {
  if (toji || discordService) {
    event.preventDefault()
    console.log('App is quitting, cleaning up...')

    try {
      // Disconnect Discord bot first
      if (discordService) {
        console.log('Disconnecting Discord bot...')
        await discordService.disconnect()
        discordService = null
        console.log('Discord bot disconnected')
      }

      // Then shutdown ALL Toji/OpenCode servers
      if (toji) {
        console.log('Stopping all OpenCode servers...')
        await toji.server.stopAllServers()
        toji = null
        console.log('All OpenCode servers stopped, Toji shutdown completed')
      }

      console.log('All cleanup completed, quitting app')
    } catch (error) {
      console.error('Error during cleanup:', error)
    } finally {
      toji = null
      discordService = null
      app.quit()
    }
  }
})

// In this file you can include the rest of your app's specific main process
// code. You can also put them in separate files and require them here.
