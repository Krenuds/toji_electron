import { app, shell, BrowserWindow } from 'electron'
import { join } from 'path'
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
  registerProjectHandlers,
  registerWindowHandlers,
  registerDiscordHandlers,
  registerBinaryHandlers,
  registerLoggerHandlers
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

  // Auto-start OpenCode if enabled
  const autoStartEnabled = config.getOpencodeAutoStart()
  logStartup('Auto-start enabled: %s', autoStartEnabled)

  if (autoStartEnabled) {
    try {
      logStartup('Starting auto-start sequence')
      // First ensure binary is installed
      await openCodeService.ensureBinary()
      logStartup('Binary ensured')

      // Get the last used project directory
      const workingDirectory = config.getOpencodeWorkingDirectory()
      logStartup('Auto-starting OpenCode in: %s', workingDirectory)

      // Start OpenCode server
      await toji.server.start()
      logStartup('Server started')

      await toji.connectClient()
      logStartup('Client connected')

      // Track this project in recent list
      config.addRecentProject(workingDirectory)
      logStartup('OpenCode auto-started successfully')
    } catch (error) {
      logStartup('ERROR: Failed to auto-start OpenCode: %o', error)
      // Don't crash the app, just log the error
    }
  }

  // Register modular IPC handlers
  registerTojiHandlers(toji)
  registerProjectHandlers(toji)
  registerWindowHandlers()
  registerDiscordHandlers(discordService, config)
  registerBinaryHandlers(openCodeService)
  registerLoggerHandlers()

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

  // Stop any running OpenCode agents
  if (toji) {
    try {
      logCleanup('Stopping OpenCode servers...')
      await toji.server.stop()
      logCleanup('OpenCode servers stopped successfully')
    } catch (error) {
      logCleanup('ERROR: Failed to stop OpenCode servers: %o', error)
    }
  }

  if (process.platform !== 'darwin') {
    app.quit()
  }
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

      // Then shutdown Toji/OpenCode
      if (toji) {
        await toji.server.stop()
        toji = null
        console.log('Toji shutdown completed')
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
