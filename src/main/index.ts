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
import { initializeFileLogging, createLogger } from './utils/logger'

// Initialize file logging as early as possible
initializeFileLogging()

// Loggers for different contexts
const loggerStartup = createLogger('toji:startup')
const loggerCleanup = createLogger('toji:cleanup')

// Import modular handlers
import {
  registerTojiHandlers,
  registerTojiEventForwarding,
  registerProjectHandlers,
  registerWindowHandlers,
  registerDiscordHandlers,
  registerBinaryHandlers,
  registerLoggerHandlers,
  registerOpencodeHandlers,
  registerVoiceHandlers,
  cleanupVoiceServices
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
  loggerStartup.debug('Initializing ConfigProvider')
  config = new ConfigProvider()
  loggerStartup.debug(
    'Config initialized with working directory: %s',
    config.getOpencodeWorkingDirectory()
  )

  // Initialize binary service
  loggerStartup.debug('Initializing OpenCodeService')
  const openCodeService = new OpenCodeService()

  // Check binary status on startup
  const binaryInfo = openCodeService.getBinaryInfo()
  loggerStartup.debug('Binary status on startup: %o', binaryInfo)

  // Initialize Toji API with binary service and config
  loggerStartup.debug('Initializing Toji API')
  toji = new Toji(openCodeService, config)
  loggerStartup.debug('Toji API initialized')

  // Initialize Discord service with Toji and config
  loggerStartup.debug('Initializing Discord service')
  discordService = new DiscordService(toji, config)
  loggerStartup.debug('Discord service initialized')

  // Auto-connect Discord bot if token is configured
  const discordToken = config.getDiscordToken()
  if (discordToken) {
    loggerStartup.debug('Discord token found, connecting bot...')
    try {
      await discordService.connect()
      loggerStartup.debug('Discord bot connected successfully')
    } catch (error) {
      loggerStartup.debug('WARNING: Failed to connect Discord bot: %o', error)
      // Continue without Discord - it's not critical
    }
  } else {
    loggerStartup.debug('No Discord token configured, bot will not connect')
  }

  // Always try to start OpenCode server (simplified approach)
  try {
    loggerStartup.debug('Starting OpenCode server initialization')

    // First ensure binary is installed
    await openCodeService.ensureBinary()
    loggerStartup.debug('OpenCode binary installation checked')

    // Load last project or use default
    const lastProject = config.getCurrentProjectPath() || config.getOpencodeWorkingDirectory()
    loggerStartup.debug('========== APP STARTUP ==========')
    loggerStartup.debug('Loading project: %s', lastProject)
    loggerStartup.debug('Checking opencode.json in project directory...')
    try {
      const { existsSync } = await import('fs')
      const { join: joinPath } = await import('path')
      const configPath = joinPath(lastProject, 'opencode.json')
      const configExists = existsSync(configPath)
      if (configExists) {
        loggerStartup.debug('opencode.json found in project: %s', configPath)
      } else {
        loggerStartup.debug('No opencode.json in project: %s', configPath)
      }
    } catch (error) {
      loggerStartup.debug('Error checking opencode.json: %o', error)
    }

    // Start the server from the project directory
    loggerStartup.debug('Starting OpenCode server from project directory')
    loggerStartup.debug('Config passed to server.start: undefined (should read from opencode.json)')
    await toji.server.start(undefined, lastProject)
    loggerStartup.debug('OpenCode server ready (running from %s)', lastProject)

    // Connect the client to the specific project directory
    loggerStartup.debug('Connecting OpenCode client for directory: %s', lastProject)
    await toji.connectClient(lastProject)
    loggerStartup.debug('OpenCode client connected successfully')

    // Set the working directory
    await toji.changeWorkingDirectory(lastProject)
    loggerStartup.debug('Project directory set: %s', lastProject)

    // Try to load the most recent session for this project
    try {
      await toji.loadMostRecentSession()
      loggerStartup.debug('Loaded most recent session')
    } catch (sessionError) {
      loggerStartup.debug(
        'Could not load most recent session (this is ok for new projects): %o',
        sessionError
      )
      // This is ok - might be a new project with no sessions
    }
  } catch (error) {
    loggerStartup.debug('ERROR: Failed during OpenCode initialization: %o', error)
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
  registerVoiceHandlers()

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
  loggerCleanup.debug('All windows closed, starting cleanup sequence')

  // Disconnect Discord bot
  if (discordService) {
    try {
      loggerCleanup.debug('Disconnecting Discord bot...')
      await discordService.disconnect()
      loggerCleanup.debug('Discord bot disconnected successfully')
    } catch (error) {
      loggerCleanup.debug('ERROR: Failed to disconnect Discord: %o', error)
    }
  }

  // Stop ALL running OpenCode servers
  if (toji) {
    try {
      loggerCleanup.debug('Stopping all OpenCode servers...')
      await toji.server.stopAllServers()
      loggerCleanup.debug('All OpenCode servers stopped successfully')
    } catch (error) {
      loggerCleanup.debug('ERROR: Failed to stop OpenCode servers: %o', error)
    }
  }

  // Cleanup voice services
  try {
    loggerCleanup.debug('Cleaning up voice services...')
    await cleanupVoiceServices()
    loggerCleanup.debug('Voice services cleaned up successfully')
  } catch (error) {
    loggerCleanup.debug('ERROR: Failed to cleanup voice services: %o', error)
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
