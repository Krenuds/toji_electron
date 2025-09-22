# Backend Architecture - Main Process

## Overview

The Electron main process serves as the **central authority** for all business logic and OpenCode SDK integration. This document details the backend architecture, API design, and service management patterns.

## Core Philosophy

**"Business Logic Lives Here"** - The main process is the single source of truth for all operations. Plugin interfaces (including the renderer) are thin wrappers that call main process APIs.

## Code Quality Standards - MANDATORY

**WE RUN A TIGHT SHIP** - Every line of code must meet these standards:

### The Sacred Workflow

```bash
# BEFORE writing ANY code
npm run format
npm run typecheck

# AFTER every change
npm run format
npm run lint:fix
npm run lint         # MUST show 0 errors
npm run typecheck    # MUST pass completely

# BEFORE committing
npm run format && npm run lint && npm run typecheck
```

### TypeScript Requirements

- **NO `any` TYPES**: Use proper interfaces or generics
- **EXPLICIT RETURN TYPES**: Every function needs one
- **NO UNUSED VARIABLES**: Remove or prefix with `_`
- **STRICT NULL CHECKS**: Handle null/undefined properly
- **EXHAUSTIVE SWITCHES**: Cover all cases

## Architecture Layers

### 1. Toji Core API (`/src/main/toji/`)

The `Toji` class is the primary interface for all OpenCode operations:

```typescript
class Toji {
  private server?: OpencodeServer
  private currentSession?: Session
  private currentWorkspace?: string

  // Core lifecycle methods
  async initialize(config?: TojiConfig): Promise<void>
  async shutdown(): Promise<void>

  // Workspace management
  async changeWorkspace(directory: string): Promise<WorkspaceInfo>
  async inspectWorkspace(directory: string): Promise<WorkspaceStatus>

  // Chat operations
  async ensureReadyForChat(directory?: string): Promise<ChatReadyStatus>
  async chat(message: string): Promise<string>

  // Session management
  async listSessions(): Promise<Session[]>
  async createSession(options?: SessionOptions): Promise<Session>
  async deleteSession(sessionId: string): Promise<void>
}
```

### 2. Service Layer (`/src/main/services/`)

Supporting services handle specific responsibilities:

#### OpenCodeService

- Binary installation and verification
- Process lifecycle management
- Health monitoring

#### ConfigProvider

- Settings persistence with electron-store
- Environment variable management
- Default configuration values

#### DiscordService

- Bot lifecycle management
- Command registration
- Event handling

### 3. IPC Handler Layer (`/src/main/index.ts`)

Thin handlers that expose Toji API to renderer:

```typescript
// Pattern: Direct pass-through with error handling
ipcMain.handle('core:chat', async (_, message: string) => {
  try {
    return await toji.chat(message)
  } catch (error) {
    console.error('Chat error:', error)
    throw error
  }
})
```

## OpenCode SDK Integration

### Binary Management

The OpenCode SDK requires careful binary management:

1. **Installation Path Resolution**:

   ```typescript
   const paths = [
     process.env.OPENCODE_INSTALL_DIR,
     path.join(os.homedir(), '.local', 'share', 'opencode', 'bin'),
     path.join(os.homedir(), '.opencode', 'bin'),
     path.join(os.homedir(), 'bin')
   ]
   ```

2. **Directory Creation**:

   ```typescript
   // Required directories for OpenCode operation
   const requiredDirs = [
     '~/.local/share/opencode/bin',
     '~/.local/share/opencode/data',
     '~/.local/share/opencode/config',
     '~/.local/share/opencode/state',
     '~/.local/share/opencode/log'
   ]
   ```

3. **Process Spawning**:
   ```typescript
   const server = await createOpencodeServer({
     hostname: '127.0.0.1',
     port: 4096,
     timeout: 5000,
     signal: abortController.signal
   })
   ```

### Error Handling Patterns

```typescript
// Graceful degradation pattern
async ensureServerRunning(): Promise<boolean> {
  if (this.server?.isRunning()) return true

  try {
    await this.startServer()
    return true
  } catch (error) {
    console.error('Failed to start server:', error)
    // Emit status event for UI feedback
    this.emit('server:error', error.message)
    return false
  }
}
```

## Plugin Interface Design

### Discord Plugin Integration

The Discord plugin demonstrates the plugin pattern:

```typescript
class DiscordPlugin {
  constructor(private toji: Toji) {}

  async handleChat(message: string, context: DiscordContext) {
    // Thin wrapper around Toji API
    const response = await this.toji.chat(message)
    return this.formatForDiscord(response)
  }
}
```

### IPC Plugin Pattern (Renderer)

The renderer acts as another plugin through IPC:

```typescript
// Main process exposes API
ipcMain.handle('core:chat', (_, msg) => toji.chat(msg))

// Renderer consumes through preload bridge
window.api.core.chat(message)
```

## State Management

### Workspace State

```typescript
interface WorkspaceState {
  path: string
  hasGit: boolean
  hasOpenCodeConfig: boolean
  sessions: Session[]
  lastActivity: Date
}
```

### Session State

```typescript
interface SessionState {
  id: string
  workspacePath: string
  title?: string
  created: Date
  updated: Date
}
```

### Persistence Strategy

- **Workspace Settings**: electron-store for persistence
- **Recent Workspaces**: Stored in user preferences
- **Session Data**: Managed by OpenCode SDK
- **Runtime State**: In-memory with event emissions

## Event System

### Internal Events

```typescript
// Server lifecycle events
toji.on('server:started', () => {})
toji.on('server:stopped', () => {})
toji.on('server:error', (error) => {})

// Session events
toji.on('session:created', (session) => {})
toji.on('session:deleted', (sessionId) => {})

// Workspace events
toji.on('workspace:changed', (path) => {})
```

### IPC Event Broadcasting

```typescript
// Broadcast to all renderer windows
BrowserWindow.getAllWindows().forEach((window) => {
  window.webContents.send('server:status', status)
})
```

## Security Considerations

### Process Isolation

- OpenCode runs in controlled subprocess
- Limited filesystem access through path validation
- Sandboxed execution environment

### Input Validation

```typescript
async changeWorkspace(directory: string) {
  // Validate path exists and is accessible
  if (!fs.existsSync(directory)) {
    throw new Error('Directory does not exist')
  }

  // Ensure absolute path
  const absolutePath = path.resolve(directory)

  // Check permissions
  try {
    await fs.promises.access(absolutePath, fs.constants.R_OK)
  } catch {
    throw new Error('No read access to directory')
  }

  return this.setWorkspace(absolutePath)
}
```

### IPC Security

- Context isolation enabled
- Preload script validates all inputs
- No direct exposure of Node.js APIs

## Resource Management

### Process Lifecycle

```typescript
class ProcessManager {
  private processes: Map<string, ChildProcess> = new Map()

  async spawn(name: string, command: string) {
    const process = spawn(command)
    this.processes.set(name, process)

    process.on('exit', () => {
      this.processes.delete(name)
    })
  }

  async cleanup() {
    for (const [name, process] of this.processes) {
      process.kill('SIGTERM')
    }
  }
}
```

### Memory Management

- Stream large responses instead of buffering
- Implement connection pooling
- Regular garbage collection hints

## Error Recovery

### Retry Strategies

```typescript
async withRetry<T>(
  operation: () => Promise<T>,
  maxAttempts = 3,
  delay = 1000
): Promise<T> {
  for (let attempt = 1; attempt <= maxAttempts; attempt++) {
    try {
      return await operation()
    } catch (error) {
      if (attempt === maxAttempts) throw error
      await new Promise(resolve => setTimeout(resolve, delay * attempt))
    }
  }
}
```

### Graceful Degradation

- Application continues without OpenCode
- Cached data for offline operation
- Queue operations for later execution

## Development Patterns

### Adding New Features

1. **Define in Toji class** - Business logic
2. **Add IPC handler** - Expose to renderer
3. **Update preload** - Type-safe bridge
4. **Emit events** - Status updates
5. **Handle errors** - User feedback

### Testing Strategies

- Unit tests for Toji methods
- Integration tests for IPC communication
- E2E tests with Playwright
- Manual testing with `npm run dev`

## Performance Optimization

### Lazy Loading

```typescript
private _server?: OpencodeServer

get server(): OpencodeServer {
  if (!this._server) {
    throw new Error('Server not initialized')
  }
  return this._server
}
```

### Caching

```typescript
private workspaceCache = new Map<string, WorkspaceInfo>()

async getWorkspaceInfo(path: string) {
  if (this.workspaceCache.has(path)) {
    return this.workspaceCache.get(path)
  }

  const info = await this.inspectWorkspace(path)
  this.workspaceCache.set(path, info)
  return info
}
```

## Monitoring & Logging

### Debug Logging

```typescript
const debug = require('debug')('toji:main')

debug('Starting server with config:', config)
```

### Performance Monitoring

```typescript
const startTime = performance.now()
const result = await operation()
const duration = performance.now() - startTime

if (duration > 1000) {
  console.warn(`Slow operation: ${duration}ms`)
}
```

## Common Patterns

### Singleton Pattern

```typescript
class Toji {
  private static instance: Toji

  static getInstance(): Toji {
    if (!this.instance) {
      this.instance = new Toji()
    }
    return this.instance
  }
}
```

### Factory Pattern

```typescript
function createService(type: ServiceType) {
  switch (type) {
    case 'opencode':
      return new OpenCodeService()
    case 'discord':
      return new DiscordService()
  }
}
```

### Observer Pattern

```typescript
class EventBus extends EventEmitter {
  emit(event: string, ...args: any[]) {
    debug(`Event: ${event}`, args)
    return super.emit(event, ...args)
  }
}
```

## Best Practices - ENFORCED

### Development Workflow (NEVER SKIP)

```bash
# Step 1: Format and check BEFORE coding
npm run format
npm run typecheck

# Step 2: Write your code

# Step 3: Format and fix IMMEDIATELY
npm run format
npm run lint:fix

# Step 4: Verify quality
npm run lint         # MUST be 0 errors
npm run typecheck    # MUST pass

# Step 5: Test thoroughly
npm run dev
```

### Non-Negotiable Rules

1. **FORMAT FIRST**: Always run `npm run format` before changes
2. **TYPE EVERYTHING**: No `any` types, explicit returns required
3. **VALIDATE INPUTS**: Check all inputs before processing
4. **HANDLE ERRORS**: Every async operation needs try/catch
5. **EMIT EVENTS**: Status changes must emit events
6. **LOG CONTEXT**: Include relevant data in error logs
7. **CLEAN UP**: Resources must be released on shutdown
8. **LINT CONSTANTLY**: Zero tolerance for lint errors
9. **TEST PATHS**: Error cases need explicit testing
10. **DOCUMENT COMPLEXITY**: Add comments for non-obvious logic

### TypeScript Strict Mode

```typescript
// tsconfig.node.json must have:
{
  "compilerOptions": {
    "strict": true,
    "noImplicitAny": true,
    "strictNullChecks": true,
    "strictFunctionTypes": true,
    "strictBindCallApply": true,
    "strictPropertyInitialization": true,
    "noImplicitThis": true,
    "alwaysStrict": true
  }
}
```

### Before EVERY Commit

```bash
# The holy trinity - ALL must pass
npm run format && npm run lint && npm run typecheck
```

**REMEMBER**: Code quality is not optional. Every commit must pass all checks.

This architecture ensures reliable, secure, and maintainable backend operations while providing a clean API for all plugin interfaces.
