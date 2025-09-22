import { app, shell, BrowserWindow } from 'electron'
import { join } from 'path'
import { electronApp, optimizer, is } from '@electron-toolkit/utils'
import icon from '../../resources/toji.png?asset'
import { Toji } from './toji'
import { OpenCodeService } from './services/opencode-service'
import { DiscordService } from './services/discord-service'
import { ConfigProvider } from './config/ConfigProvider'

// Import modular handlers
import {
  registerTojiHandlers,
  registerProjectHandlers,
  registerWindowHandlers,
  registerDiscordHandlers,
  registerBinaryHandlers
} from './handlers'

// Global instances
let toji: Toji | null = null
let config: ConfigProvider | null = null
let discordService: DiscordService | null = null

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

  // Initialize Discord service with Toji and config
  discordService = new DiscordService(toji, config)
  console.log('Discord service initialized')

  // Auto-start OpenCode if enabled
  if (config.getOpencodeAutoStart()) {
    try {
      // First ensure binary is installed
      await openCodeService.ensureBinary()

      // Get the last used workspace
      const workingDirectory = config.getOpencodeWorkingDirectory()
      console.log('Auto-starting OpenCode in:', workingDirectory)

      // Start OpenCode server
      await toji.server.start()
      await toji.connectClient()

      // Track this workspace in recent list
      config.addRecentWorkspace(workingDirectory)
      console.log('OpenCode auto-started successfully')
    } catch (error) {
      console.error('Failed to auto-start OpenCode:', error)
      // Don't crash the app, just log the error
    }
  }

  // Register modular IPC handlers
  registerTojiHandlers(toji)
  registerProjectHandlers(toji)
  registerWindowHandlers()
  registerDiscordHandlers(discordService, config)
  registerBinaryHandlers(openCodeService)

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
  console.log('All windows closed, cleaning up...')

  // Disconnect Discord bot
  if (discordService) {
    try {
      console.log('Disconnecting Discord bot...')
      await discordService.disconnect()
      console.log('Discord bot disconnected')
    } catch (error) {
      console.error('Error disconnecting Discord:', error)
    }
  }

  // Stop any running OpenCode agents
  if (toji) {
    try {
      await toji.server.stop()
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
