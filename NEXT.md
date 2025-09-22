# Next Implementation: OpenCode Server Lifecycle Management

## Objective

Implement a simple server start/stop control system in the dashboard with automatic health monitoring.

## Core Requirements

- Start/stop server button in dashboard
- Visual server status indicator
- Health check every 10 seconds
- Use home directory from ConfigProvider as server CWD
- Default port (4096) with conflict detection
- Real-time status updates to UI

## Implementation Plan

### Phase 1: Backend Server Management

#### 1.1 Update Toji Class (`/src/main/toji/index.ts`)

```typescript
// Add to Toji class
private healthCheckInterval?: NodeJS.Timeout
private serverStartTime?: Date

async startServer(): Promise<void> {
  if (this.server?.isRunning()) {
    throw new Error('Server already running')
  }

  // Get home directory from ConfigProvider
  const homeDir = this.configProvider.getHomeDirectory()

  // Start server with CWD set to home directory
  this.server = await createOpencodeServer({
    hostname: '127.0.0.1',
    port: 4096,
    cwd: homeDir,
    timeout: 5000
  })

  this.serverStartTime = new Date()
  this.startHealthCheck()
  this.emit('server:started', { port: 4096, pid: this.server.pid })
}

async stopServer(): Promise<void> {
  this.stopHealthCheck()
  if (this.server) {
    await this.server.stop()
    this.server = undefined
  }
  this.serverStartTime = undefined
  this.emit('server:stopped')
}

private startHealthCheck(): void {
  this.healthCheckInterval = setInterval(async () => {
    const isHealthy = await this.checkServerHealth()
    this.emit('server:health', {
      healthy: isHealthy,
      timestamp: new Date()
    })
  }, 10000) // Every 10 seconds
}

private async checkServerHealth(): Promise<boolean> {
  try {
    // Check if port is responding
    const response = await fetch(`http://127.0.0.1:4096/health`)
    return response.ok
  } catch {
    return false
  }
}

async getServerStatus(): Promise<ServerStatus> {
  const isRunning = this.server?.isRunning() || false

  return {
    isRunning,
    port: isRunning ? 4096 : undefined,
    pid: this.server?.pid,
    startTime: this.serverStartTime,
    uptime: this.serverStartTime
      ? Date.now() - this.serverStartTime.getTime()
      : undefined
  }
}
```

#### 1.2 IPC Handlers (`/src/main/handlers/toji.handlers.ts`)

```typescript
export function registerTojiHandlers(ipcMain: IpcMain, toji: Toji): void {
  // ... existing handlers ...

  ipcMain.handle('toji:start-server', async () => {
    return toji.startServer()
  })

  ipcMain.handle('toji:stop-server', async () => {
    return toji.stopServer()
  })

  ipcMain.handle('toji:server-status', async () => {
    return toji.getServerStatus()
  })

  // Forward server events to renderer
  toji.on('server:started', (data) => {
    BrowserWindow.getAllWindows().forEach((window) => {
      window.webContents.send('server:started', data)
    })
  })

  toji.on('server:stopped', () => {
    BrowserWindow.getAllWindows().forEach((window) => {
      window.webContents.send('server:stopped')
    })
  })

  toji.on('server:health', (data) => {
    BrowserWindow.getAllWindows().forEach((window) => {
      window.webContents.send('server:health', data)
    })
  })
}
```

### Phase 2: Preload Bridge Updates

#### 2.1 Update Toji API (`/src/preload/api/toji.api.ts`)

```typescript
export const tojiAPI = {
  // ... existing methods ...

  // Replace stub with real implementation
  isRunning: (): Promise<boolean> =>
    ipcRenderer.invoke('toji:server-status').then((status) => status.isRunning),

  // New server lifecycle methods
  startServer: (): Promise<void> => ipcRenderer.invoke('toji:start-server'),
  stopServer: (): Promise<void> => ipcRenderer.invoke('toji:stop-server'),
  getServerStatus: (): Promise<ServerStatus> => ipcRenderer.invoke('toji:server-status'),

  // Event listeners
  onServerStarted: (callback: (data: any) => void) => {
    ipcRenderer.on('server:started', (_, data) => callback(data))
    return () => ipcRenderer.removeListener('server:started', callback)
  },

  onServerStopped: (callback: () => void) => {
    ipcRenderer.on('server:stopped', callback)
    return () => ipcRenderer.removeListener('server:stopped', callback)
  },

  onServerHealth: (callback: (data: any) => void) => {
    ipcRenderer.on('server:health', (_, data) => callback(data))
    return () => ipcRenderer.removeListener('server:health', callback)
  }
}
```

### Phase 3: Frontend Implementation

#### 3.1 Enhanced Server Status Hook (`/src/renderer/src/hooks/useServerStatus.ts`)

```typescript
interface ServerStatus {
  isRunning: boolean
  port?: number
  pid?: number
  startTime?: Date
  uptime?: number
  lastHealthCheck?: Date
  isHealthy: boolean
}

export function useServerStatus() {
  const [status, setStatus] = useState<ServerStatus>({
    isRunning: false,
    isHealthy: false
  })
  const [isLoading, setIsLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  // Fetch initial status
  useEffect(() => {
    fetchStatus()

    // Subscribe to server events
    const unsubscribeStarted = window.api.toji.onServerStarted((data) => {
      setStatus((prev) => ({
        ...prev,
        isRunning: true,
        port: data.port,
        pid: data.pid,
        startTime: new Date()
      }))
    })

    const unsubscribeStopped = window.api.toji.onServerStopped(() => {
      setStatus((prev) => ({
        ...prev,
        isRunning: false,
        port: undefined,
        pid: undefined,
        startTime: undefined,
        uptime: undefined
      }))
    })

    const unsubscribeHealth = window.api.toji.onServerHealth((data) => {
      setStatus((prev) => ({
        ...prev,
        isHealthy: data.healthy,
        lastHealthCheck: new Date(data.timestamp)
      }))
    })

    return () => {
      unsubscribeStarted()
      unsubscribeStopped()
      unsubscribeHealth()
    }
  }, [])

  const fetchStatus = async () => {
    try {
      const serverStatus = await window.api.toji.getServerStatus()
      setStatus({
        ...serverStatus,
        isHealthy: serverStatus.isRunning
      })
    } catch (err) {
      console.error('Failed to fetch server status:', err)
    }
  }

  const startServer = async () => {
    setIsLoading(true)
    setError(null)
    try {
      await window.api.toji.startServer()
    } catch (err) {
      setError(err.message)
    } finally {
      setIsLoading(false)
    }
  }

  const stopServer = async () => {
    setIsLoading(true)
    setError(null)
    try {
      await window.api.toji.stopServer()
    } catch (err) {
      setError(err.message)
    } finally {
      setIsLoading(false)
    }
  }

  return {
    status,
    isLoading,
    error,
    startServer,
    stopServer,
    refreshStatus: fetchStatus
  }
}
```

#### 3.2 Dashboard Sidebar Controls (`/src/renderer/src/components/views/dashboard/DashboardViewSidebar.tsx`)

Add server control section:

```tsx
const { status, isLoading, error, startServer, stopServer } = useServerStatus()

// In the render:
<SidebarSection>
  <VStack align="stretch" gap={3}>
    <HStack justify="space-between">
      <Text color="app.text" fontSize="sm">
        Server Control
      </Text>
      <HStack gap={2}>
        <Box
          w={2}
          h={2}
          borderRadius="full"
          bg={status.isRunning ? 'green.500' : 'red.500'}
          animation={status.isRunning ? 'pulse 2s infinite' : undefined}
        />
        <Text color="app.text" fontSize="xs">
          {status.isRunning ? 'Running' : 'Stopped'}
        </Text>
      </HStack>
    </HStack>

    <Button
      size="sm"
      colorPalette={status.isRunning ? 'red' : 'green'}
      onClick={status.isRunning ? stopServer : startServer}
      disabled={isLoading}
      leftIcon={status.isRunning ? <LuSquare size={14} /> : <LuPlay size={14} />}
    >
      {isLoading ? 'Processing...' : status.isRunning ? 'Stop Server' : 'Start Server'}
    </Button>

    {status.isRunning && (
      <VStack align="stretch" gap={2} fontSize="xs">
        <HStack justify="space-between">
          <Text color="app.text">Port:</Text>
          <Text color="app.light">{status.port}</Text>
        </HStack>
        <HStack justify="space-between">
          <Text color="app.text">Health:</Text>
          <Text color={status.isHealthy ? 'green.400' : 'red.400'}>
            {status.isHealthy ? 'Healthy' : 'Unhealthy'}
          </Text>
        </HStack>
        {status.lastHealthCheck && (
          <HStack justify="space-between">
            <Text color="app.text">Last Check:</Text>
            <Text color="app.light">
              {status.lastHealthCheck.toLocaleTimeString()}
            </Text>
          </HStack>
        )}
      </VStack>
    )}

    {error && (
      <Alert status="error" size="sm">
        <Alert.Icon />
        <Alert.Title>{error}</Alert.Title>
      </Alert>
    )}
  </VStack>
</SidebarSection>
```

#### 3.3 Dashboard Main View Status Card (`/src/renderer/src/components/views/dashboard/DashboardViewMain.tsx`)

Add server status card:

```tsx
const { status } = useServerStatus()

// Add to the metrics section:
<MetricCard
  title="OpenCode Server"
  value={status.isRunning ? 'Online' : 'Offline'}
  subtitle={status.isRunning ? `Port ${status.port}` : 'Click Start to begin'}
  icon={<LuServer size={20} />}
  trend={status.isRunning ? 'up' : 'neutral'}
  trendLabel={status.uptime ? formatUptime(status.uptime) : undefined}
/>
```

### Phase 4: Type Definitions

#### 4.1 Add to `/src/main/toji/types.ts`

```typescript
export interface ServerStatus {
  isRunning: boolean
  port?: number
  pid?: number
  startTime?: Date
  uptime?: number
  error?: string
}

export interface HealthCheckResult {
  healthy: boolean
  timestamp: Date
  responseTime?: number
}
```

## Testing Plan

1. **Start Server Test**
   - Click Start Server button
   - Verify server starts on port 4096
   - Check status indicator turns green
   - Confirm health checks begin

2. **Stop Server Test**
   - Click Stop Server button
   - Verify server stops cleanly
   - Check status indicator turns red
   - Confirm health checks stop

3. **Port Conflict Test**
   - Start another process on port 4096
   - Try to start server
   - Verify error message displays

4. **Health Check Test**
   - Start server
   - Wait 10+ seconds
   - Verify health check timestamp updates
   - Kill server process manually
   - Verify health status shows unhealthy

5. **Persistence Test**
   - Start server
   - Refresh app window
   - Verify server status persists correctly

## Success Criteria

- ✅ One-click server start/stop
- ✅ Visual status indicators (green/red)
- ✅ Automatic health checks every 10 seconds
- ✅ Error handling with user feedback
- ✅ Server runs with home directory as CWD
- ✅ Port 4096 used by default
- ✅ Real-time status updates in UI

## Next Steps After This

1. Add session management UI
2. Implement chat interface
3. Add project switching
4. Create workspace management
5. Add server logs viewer

## Estimated Time

- Backend implementation: 1 hour
- Frontend implementation: 1 hour
- Testing & debugging: 30 minutes
- **Total: ~2.5 hours**

This plan provides a clean, simple implementation of server lifecycle management with all the requested features.
