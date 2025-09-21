import { app, shell, BrowserWindow, ipcMain, dialog } from 'electron'
import { join } from 'path'
import { promises as fs } from 'fs'
import { electronApp, optimizer, is } from '@electron-toolkit/utils'
import icon from '../../resources/toji.png?asset'
import { Toji } from './toji'
import { OpenCodeService } from './services/opencode-service'
import { DiscordService } from './services/discord-service'
import { ConfigProvider } from './config/ConfigProvider'

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
      // TODO: Re-implement quickStart
      // await toji.quickStart(workingDirectory)

      // Track this workspace in recent list
      config.addRecentWorkspace(workingDirectory)
      console.log('OpenCode auto-started successfully')
    } catch (error) {
      console.error('Failed to auto-start OpenCode:', error)
      // Don't crash the app, just log the error
    }
  }

  // Set up IPC handlers for Core and Binary management
  setupCoreHandlers()
  setupBinaryHandlers(openCodeService)
  setupDiscordHandlers()
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

  // TODO: Re-implement
  // ipcMain.handle('core:get-current-directory', async () => {
  //   return toji!.workspace.getCurrentDirectory()
  // })

  // Main API - Start OpenCode in directory
  ipcMain.handle('core:start-opencode', async (_, directory: string, config?: object) => {
    if (!toji) {
      throw new Error('Toji not initialized')
    }
    // TODO: Re-implement initialize
    // return await toji.initialize(directory, config)
    return
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
    // All business logic now in Toji API - IPC is just a thin passthrough
    // TODO: Re-implement promptWithAutoSession
    // return await toji.promptWithAutoSession(text)
    return 'Not implemented yet'
  })

  // List projects
  ipcMain.handle('core:list-projects', async () => {
    if (!toji) {
      throw new Error('Toji not initialized')
    }
    // TODO: Re-implement project.list
    // return await toji.project.list()
    return { data: [] }
  })

  // List sessions
  ipcMain.handle('core:list-sessions', async () => {
    if (!toji) {
      throw new Error('Toji not initialized')
    }
    // TODO: Re-implement session.list
    // return await toji.session.list()
    return { data: [] }
  })

  // Delete session
  ipcMain.handle('core:delete-session', async (_, sessionId: string) => {
    if (!toji) {
      throw new Error('Toji not initialized')
    }
    // TODO: Re-implement session.delete
    // return await toji.session.delete(sessionId)
    return
  })

  // Get sessions for a specific workspace
  ipcMain.handle('core:get-sessions-for-workspace', async (_, workspacePath: string) => {
    if (!toji) {
      throw new Error('Toji not initialized')
    }
    // TODO: Re-implement getSessionsForWorkspace
    // return await toji.getSessionsForWorkspace(workspacePath)
    return []
  })

  // Chat operations using Toji API
  ipcMain.handle('core:ensure-ready-for-chat', async (_, directory?: string) => {
    if (!toji) {
      throw new Error('Toji not initialized')
    }
    // TODO: Re-implement ensureReadyForChat
    // return await toji.ensureReadyForChat(directory)
    return { sessionId: '', serverStatus: 'offline' }
  })

  ipcMain.handle('core:chat', async (_, message: string) => {
    if (!toji) {
      throw new Error('Toji not initialized')
    }
    // TODO: Re-implement chat
    // return await toji.chat(message)
    return 'Not implemented yet'
  })

  // Change workspace directory
  ipcMain.handle('core:change-workspace', async (_, directory: string) => {
    if (!toji) {
      throw new Error('Toji not initialized')
    }
    // TODO: Re-implement changeWorkspace
    // return await toji.changeWorkspace(directory)
    return {
      isNew: true,
      hasGit: false,
      hasOpenCodeConfig: false,
      sessionId: '',
      workspacePath: directory
    }
  })

  // Get workspace collections
  ipcMain.handle('core:workspace-collections', async () => {
    if (!toji) {
      throw new Error('Toji not initialized')
    }
    // TODO: Re-implement getWorkspaceCollections
    // return await toji.getWorkspaceCollections()
    return []
  })

  // Get all enriched projects
  ipcMain.handle('core:all-projects', async () => {
    if (!toji) {
      throw new Error('Toji not initialized')
    }
    // TODO: Re-implement getAllProjects
    // return await toji.getAllProjects()
    return []
  })

  // Discover projects in directory
  ipcMain.handle('core:discover-projects', async (_, baseDir?: string) => {
    if (!toji) {
      throw new Error('Toji not initialized')
    }
    // TODO: Re-implement discoverProjects
    // return await toji.discoverProjects(baseDir)
    return []
  })

  // Get enriched projects
  ipcMain.handle('core:enriched-projects', async () => {
    if (!toji) {
      throw new Error('Toji not initialized')
    }
    // TODO: Re-implement getEnrichedProjects
    // return await toji.getEnrichedProjects()
    return []
  })

  // Inspect workspace
  ipcMain.handle('core:inspect-workspace', async (_, directory: string) => {
    if (!toji) {
      throw new Error('Toji not initialized')
    }
    // TODO: Re-implement workspace.inspect
    // return await toji.workspace.inspect(directory)
    return { exists: false, hasGit: false, hasOpenCodeConfig: false, hasNodeModules: false }
  })

  // Get workspaces from sessions
  ipcMain.handle('core:get-workspaces-from-sessions', async (_, limit?: number) => {
    if (!toji) {
      throw new Error('Toji not initialized')
    }
    // TODO: Re-implement getWorkspacesFromSessions
    // return await toji.getWorkspacesFromSessions(limit)
    return []
  })

  // Get all workspaces (sessions + recent)
  ipcMain.handle('core:get-all-workspaces', async (_, limit?: number) => {
    if (!toji) {
      throw new Error('Toji not initialized')
    }
    // TODO: Re-implement getAllWorkspaces
    // return await toji.getAllWorkspaces(limit)
    return []
  })

  // Open workspace directory in system file manager
  ipcMain.handle('core:open-workspace-directory', async (_, path: string) => {
    const { shell } = await import('electron')
    return shell.showItemInFolder(path)
  })

  // Open sessions data directory
  ipcMain.handle('core:open-sessions-directory', async () => {
    const { shell } = await import('electron')

    // Get the actual sessions storage directory
    // OpenCode stores sessions in userData/opencode-data/opencode/storage/session
    const userDataPath = app.getPath('userData')
    const sessionsDir = join(userDataPath, 'opencode-data', 'opencode', 'storage', 'session')

    // Try to open the sessions directory
    try {
      await fs.access(sessionsDir)
      return shell.openPath(sessionsDir)
    } catch {
      // If directory doesn't exist, create it and open
      await fs.mkdir(sessionsDir, { recursive: true })
      return shell.openPath(sessionsDir)
    }
  })

  // Get recent workspaces
  ipcMain.handle('core:get-recent-workspaces', async () => {
    if (!toji) {
      throw new Error('Toji not initialized')
    }
    // TODO: Re-implement getRecentWorkspaces
    // return toji.getRecentWorkspaces()
    return []
  })

  // Remove workspace from recent list
  ipcMain.handle('core:remove-recent-workspace', async (_, path: string) => {
    if (!toji) {
      throw new Error('Toji not initialized')
    }
    // TODO: Re-implement removeRecentWorkspace
    // toji.removeRecentWorkspace(path)
    // TODO: Re-implement getRecentWorkspaces
    // return toji.getRecentWorkspaces()
    return []
  })

  // Clear all recent workspaces
  ipcMain.handle('core:clear-recent-workspaces', async () => {
    if (!toji) {
      throw new Error('Toji not initialized')
    }
    // TODO: Re-implement clearRecentWorkspaces
    // toji.clearRecentWorkspaces()
    return []
  })

  // Workspace-specific settings handlers
  ipcMain.handle('core:get-workspace-settings', async (_, workspacePath: string) => {
    if (!toji) {
      throw new Error('Toji not initialized')
    }
    // TODO: Re-implement getWorkspaceSettings
    // return await toji.getWorkspaceSettings(workspacePath)
    return {}
  })

  ipcMain.handle(
    'core:set-workspace-settings',
    async (_, workspacePath: string, settings: unknown) => {
      if (!toji) {
        throw new Error('Toji not initialized')
      }
      // TODO: Re-implement setWorkspaceSettings
      // await toji.setWorkspaceSettings(workspacePath, settings)
    }
  )

  ipcMain.handle('core:clear-workspace-settings', async (_, workspacePath: string) => {
    if (!toji) {
      throw new Error('Toji not initialized')
    }
    // TODO: Re-implement clearWorkspaceSettings
    // await toji.clearWorkspaceSettings(workspacePath)
  })

  ipcMain.handle('core:get-all-workspace-settings', async () => {
    if (!toji) {
      throw new Error('Toji not initialized')
    }
    // TODO: Re-implement getAllWorkspaceSettings
    // return await toji.getAllWorkspaceSettings()
    return {}
  })

  // Get auto-start setting
  ipcMain.handle('core:get-auto-start', () => {
    if (!config) {
      throw new Error('Config not initialized')
    }
    return config.getOpencodeAutoStart()
  })

  // Set auto-start setting
  ipcMain.handle('core:set-auto-start', (_, enabled: boolean) => {
    if (!config) {
      throw new Error('Config not initialized')
    }
    config.setOpencodeAutoStart(enabled)
    return enabled
  })
}

// Setup IPC handlers for Discord service
function setupDiscordHandlers(): void {
  if (!discordService || !config) {
    console.error('setupDiscordHandlers: Discord service or config not initialized')
    return
  }

  console.log('setupDiscordHandlers: Setting up Discord IPC handlers')

  try {
    console.log('setupDiscordHandlers: Registering discord:connect handler...')
    // Connect Discord bot
    ipcMain.handle('discord:connect', async () => {
      console.log('IPC: discord:connect called')
      if (!discordService) {
        throw new Error('Discord service not initialized')
      }
      try {
        await discordService.connect()
        console.log('IPC: discord:connect completed successfully')
      } catch (error) {
        console.error('IPC: discord:connect failed:', error)
        throw error
      }
    })
    console.log('setupDiscordHandlers: discord:connect handler registered')

    console.log('setupDiscordHandlers: Registering discord:disconnect handler...')
    // Disconnect Discord bot
    ipcMain.handle('discord:disconnect', async () => {
      if (!discordService) {
        throw new Error('Discord service not initialized')
      }
      return await discordService.disconnect()
    })
    console.log('setupDiscordHandlers: discord:disconnect handler registered')

    console.log('setupDiscordHandlers: Registering discord:get-status handler...')
    // Get Discord status
    ipcMain.handle('discord:get-status', async () => {
      if (!discordService) {
        throw new Error('Discord service not initialized')
      }
      return discordService.getStatus()
    })
    console.log('setupDiscordHandlers: discord:get-status handler registered')

    console.log('setupDiscordHandlers: Registering discord:set-token handler...')
    // Set Discord token
    ipcMain.handle('discord:set-token', async (_, token: string) => {
      if (!config) {
        throw new Error('Config not initialized')
      }
      config.setDiscordToken(token)
      return { success: true }
    })
    console.log('setupDiscordHandlers: discord:set-token handler registered')

    console.log('setupDiscordHandlers: Registering discord:has-token handler...')
    // Check if token exists
    ipcMain.handle('discord:has-token', async () => {
      if (!config) {
        throw new Error('Config not initialized')
      }
      return config.hasDiscordToken()
    })
    console.log('setupDiscordHandlers: discord:has-token handler registered')

    console.log('setupDiscordHandlers: Registering discord:clear-token handler...')
    // Clear Discord token
    ipcMain.handle('discord:clear-token', async () => {
      if (!config) {
        throw new Error('Config not initialized')
      }
      config.clearDiscordToken()
      return { success: true }
    })
    console.log('setupDiscordHandlers: discord:clear-token handler registered')

    console.log('setupDiscordHandlers: Registering discord:get-debug-info handler...')
    // Get debug info
    ipcMain.handle('discord:get-debug-info', async () => {
      console.log('IPC: discord:get-debug-info called')
      if (!discordService) {
        throw new Error('Discord service not initialized')
      }
      return discordService.getDebugInfo()
    })
    console.log('setupDiscordHandlers: discord:get-debug-info handler registered')

    console.log('setupDiscordHandlers: ✅ All Discord IPC handlers registered successfully')
  } catch (error) {
    console.error('setupDiscordHandlers: ERROR setting up handlers:', error)
    console.error('setupDiscordHandlers: Stack trace:', (error as Error).stack)
  }
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
    // TODO: Re-implement getLogs
    // return await toji.server.getLogs()
    return 'Logs not available yet'
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

  // Select directory dialog
  ipcMain.handle('window:select-directory', async () => {
    const mainWindow = BrowserWindow.getAllWindows()[0]
    if (!mainWindow) {
      throw new Error('No window available')
    }

    const result = await dialog.showOpenDialog(mainWindow, {
      properties: ['openDirectory'],
      title: 'Select Workspace Directory',
      buttonLabel: 'Select Folder'
    })

    if (result.canceled) {
      return null
    }

    return result.filePaths[0]
  })
}

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
        await toji.shutdown()
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
