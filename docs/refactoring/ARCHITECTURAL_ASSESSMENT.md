# Toji Electron - Comprehensive Architecture Assessment

**Date:** October 27, 2025
**Version:** 0.2.0
**Assessment Type:** Architecture & Code Quality Review
**Status:** Complete

---

## Executive Summary

This assessment evaluates the Toji Electron project's architecture, identifying critical issues, technical debt, and improvement opportunities. The project demonstrates **solid architectural foundations** with a clear main-process-first design, but suffers from **complexity accumulation**, **tight coupling**, and **inconsistent patterns** that will impede future development.

### Overall Health: **B- (Good with Significant Issues)**

**Strengths:**

- ✅ Clear separation between main/renderer processes
- ✅ Well-documented specifications
- ✅ Comprehensive logging system
- ✅ Type-safe IPC boundaries
- ✅ Modular plugin architecture

**Critical Concerns:**

- ❌ God object anti-pattern in [`Toji`](src/main/toji/index.ts) class (1169 lines)
- ❌ Tight coupling between core and plugins
- ❌ Complex state management with multiple sources of truth
- ❌ Inconsistent error handling patterns
- ❌ Service registry pattern partially implemented

---

## Critical Architectural Issues (P0)

### 1. God Object Anti-Pattern: Toji Class

**File:** [`src/main/toji/index.ts`](src/main/toji/index.ts:1-1169)
**Severity:** P0 - Critical
**Impact:** Maintainability, Testability, Extensibility

**Problem:**
The [`Toji`](src/main/toji/index.ts:60) class has grown to 1169 lines and handles:

- Server management
- Client management
- Session management
- Project management
- Configuration management
- MCP integration
- API key management
- Event emission
- Service registry

**Evidence:**

```typescript
// Lines 60-125: Too many responsibilities
export class Toji extends EventEmitter {
  private currentProjectDirectory?: string
  private currentProjectId?: string
  private _config?: ConfigProvider
  public project: ProjectManager
  public readonly server: ServerManager
  public readonly sessions: SessionManager
  public readonly projectInitializer: ProjectInitializer
  public readonly configManager: ConfigManager
  public readonly clientManager: ClientManager
  public readonly mcp: McpManager
  // ... 1000+ more lines
}
```

**Consequences:**

- Difficult to test individual features
- High risk of regression when modifying
- Unclear boundaries of responsibility
- Hard to understand data flow
- Violates Single Responsibility Principle

**Recommendation:**
Break down into focused coordinators:

```typescript
// Proposed structure
class TojiCore {
  constructor(
    private projectCoordinator: ProjectCoordinator,
    private sessionCoordinator: SessionCoordinator,
    private serverCoordinator: ServerCoordinator
  ) {}
}

class ProjectCoordinator {
  // Handles ONLY project lifecycle
  async switchProject(path: string): Promise<void>
  async closeProject(): Promise<void>
  getCurrentProject(): Project | null
}

class SessionCoordinator {
  // Handles ONLY session management
  async createSession(title?: string): Promise<Session>
  async switchSession(id: string): Promise<void>
}
```

**Files to Refactor:**

- [`src/main/toji/index.ts`](src/main/toji/index.ts) - Split into coordinators
- [`src/main/handlers/toji.handlers.ts`](src/main/handlers/toji.handlers.ts) - Update to use coordinators
- All files importing `Toji` class

---

### 2. Tight Coupling: Discord Plugin → Toji Core

**Files:**

- [`src/plugins/discord/DiscordPlugin.ts`](src/plugins/discord/DiscordPlugin.ts:1-593)
- [`src/plugins/discord/modules/DiscordProjectManager.ts`](src/plugins/discord/modules/DiscordProjectManager.ts)

**Severity:** P0 - Critical
**Impact:** Plugin independence, Testing, Reusability

**Problem:**
The Discord plugin directly depends on the [`Toji`](src/main/toji/index.ts:60) class instance, creating tight coupling:

```typescript
// Line 52-57: Direct dependency on Toji
export class DiscordPlugin extends EventEmitter {
  constructor(
    private toji: Toji, // ❌ Tight coupling
    private config?: { token?: string; clientId?: string; guildId?: string }
  ) {
    super()
  }
}
```

**Consequences:**

- Cannot test plugin without full Toji instance
- Cannot reuse plugin in other contexts
- Changes to Toji break plugin
- Circular dependency risk
- Violates Dependency Inversion Principle

**Recommendation:**
Use interface-based dependency injection:

```typescript
// Define interface for what plugin needs
interface ITojiChatService {
  chat(message: string, sessionId?: string): Promise<string>
  chatStreaming(message: string, callbacks: StreamCallbacks, sessionId?: string): Promise<void>
  getCurrentProjectDirectory(): string | undefined
  switchToProject(path: string): Promise<{ success: boolean; projectPath: string }>
}

// Plugin depends on interface, not concrete class
export class DiscordPlugin extends EventEmitter {
  constructor(
    private chatService: ITojiChatService, // ✅ Loose coupling
    private config?: DiscordConfig
  ) {
    super()
  }
}
```

**Files to Refactor:**

- [`src/plugins/discord/DiscordPlugin.ts`](src/plugins/discord/DiscordPlugin.ts) - Use interface
- [`src/plugins/discord/modules/DiscordProjectManager.ts`](src/plugins/discord/modules/DiscordProjectManager.ts) - Use interface
- [`src/main/toji/interfaces.ts`](src/main/toji/interfaces.ts) - Define service interfaces

---

### 3. Multiple Sources of Truth: State Management

**Files:**

- [`src/renderer/src/hooks/useChatCoordinator.ts`](src/renderer/src/hooks/useChatCoordinator.ts:1-436)
- [`src/renderer/src/hooks/chat/useProjectManager.ts`](src/renderer/src/hooks/chat/useProjectManager.ts)
- [`src/renderer/src/hooks/chat/useSessionManager.ts`](src/renderer/src/hooks/chat/useSessionManager.ts)
- [`src/renderer/src/hooks/chat/useMessageManager.ts`](src/renderer/src/hooks/chat/useMessageManager.ts)

**Severity:** P0 - Critical
**Impact:** Data consistency, Race conditions, Debugging

**Problem:**
State is managed in multiple places with different caching strategies:

```typescript
// Lines 77-81: Multiple cache keys
const CACHE_KEYS = {
  LAST_SESSION: 'toji3_last_session',
  CACHED_MESSAGES: 'toji3_cached_messages'
} as const

// Lines 104-106: Loading from cache
projectManager.loadCachedProject()
sessionManager.loadCachedSession()
messageManager.loadCachedMessages()

// Lines 113-136: Loading from backend
const current = await window.api.toji.getCurrentProject()
// ... more state loading
```

**Consequences:**

- Cache can be out of sync with backend
- Race conditions during initialization
- Difficult to debug state issues
- Unclear which source is authoritative
- Potential data loss on cache/backend mismatch

**Recommendation:**
Implement single source of truth with proper synchronization:

```typescript
// Use React Query or similar for server state
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'

function useChatState() {
  const queryClient = useQueryClient()

  // Single source of truth from backend
  const { data: project } = useQuery({
    queryKey: ['current-project'],
    queryFn: () => window.api.toji.getCurrentProject(),
    staleTime: 5000 // Cache for 5 seconds
  })

  const { data: sessions } = useQuery({
    queryKey: ['sessions', project?.path],
    queryFn: () => window.api.toji.listSessions(),
    enabled: !!project?.path
  })

  // Mutations automatically invalidate queries
  const switchProject = useMutation({
    mutationFn: (path: string) => window.api.toji.switchProject(path),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['current-project'] })
      queryClient.invalidateQueries({ queryKey: ['sessions'] })
    }
  })

  return { project, sessions, switchProject }
}
```

**Files to Refactor:**

- [`src/renderer/src/hooks/useChatCoordinator.ts`](src/renderer/src/hooks/useChatCoordinator.ts) - Use React Query
- All `chat/*` hooks - Consolidate state management
- Remove localStorage caching in favor of React Query cache

---

### 4. Inconsistent Error Handling

**Files:** Multiple across codebase
**Severity:** P0 - Critical
**Impact:** User experience, Debugging, Reliability

**Problem:**
Error handling is inconsistent across the codebase:

**Pattern 1: Silent catch in [`useChatCoordinator.ts`](src/renderer/src/hooks/useChatCoordinator.ts:141-143)**

```typescript
// Lines 141-143: Errors silently swallowed
} catch {
  // Backend handles error logging
}
```

**Pattern 2: Error state in [`useChatCoordinator.ts`](src/renderer/src/hooks/useChatCoordinator.ts:246-248)**

```typescript
// Lines 246-248: Error set but not propagated
} catch {
  projectManager.setProjectError('Failed to switch project')
}
```

**Pattern 3: Throw in [`Toji.chat()`](src/main/toji/index.ts:315-317)**

```typescript
// Lines 315-317: Error thrown
} catch (error) {
  loggerChat.error('Chat failed: %o', error)
  throw error
}
```

**Pattern 4: Callback in [`DiscordPlugin.handleMessage()`](src/plugins/discord/DiscordPlugin.ts:249-267)**

```typescript
// Lines 249-267: Error passed to callback
onError: async (error) => {
  logger.debug('ERROR: Streaming chat failed: %o', error)
  if (progressMessage) {
    const errorEmbed = createErrorEmbed(error, 'Chat')
    await progressMessage.edit({ embeds: [errorEmbed] })
  }
}
```

**Consequences:**

- Users don't see errors consistently
- Debugging is difficult (errors logged in different places)
- Some errors are lost completely
- No centralized error tracking
- Inconsistent user experience

**Recommendation:**
Implement centralized error handling:

```typescript
// src/main/utils/error-handler.ts
export class TojiError extends Error {
  constructor(
    message: string,
    public code: string,
    public context?: Record<string, unknown>,
    public userMessage?: string
  ) {
    super(message)
    this.name = 'TojiError'
  }
}

export class ErrorHandler {
  static handle(error: unknown, context: string): TojiError {
    const tojiError = this.normalize(error, context)

    // Log with context
    logger.error(`[${context}] ${tojiError.message}`, {
      code: tojiError.code,
      context: tojiError.context,
      stack: tojiError.stack
    })

    // Send to error tracking service (future)
    // this.sendToSentry(tojiError)

    return tojiError
  }

  private static normalize(error: unknown, context: string): TojiError {
    if (error instanceof TojiError) return error

    if (error instanceof Error) {
      return new TojiError(
        error.message,
        `${context.toUpperCase()}_ERROR`,
        { originalError: error.name },
        this.getUserMessage(error)
      )
    }

    return new TojiError(
      String(error),
      `${context.toUpperCase()}_UNKNOWN_ERROR`,
      { rawError: error },
      'An unexpected error occurred'
    )
  }

  private static getUserMessage(error: Error): string {
    // Map technical errors to user-friendly messages
    if (error.message.includes('ECONNREFUSED')) {
      return 'Could not connect to the server. Please check if it is running.'
    }
    if (error.message.includes('EPERM')) {
      return 'Permission denied. Please check file permissions.'
    }
    return error.message
  }
}

// Usage
try {
  await toji.chat(message)
} catch (error) {
  const tojiError = ErrorHandler.handle(error, 'chat')
  // Propagate with context
  throw tojiError
}
```

**Files to Refactor:**

- Create [`src/main/utils/error-handler.ts`](src/main/utils/error-handler.ts)
- Update all try-catch blocks to use `ErrorHandler`
- Add error boundaries in React components
- Implement consistent error display in UI

---

## Major Technical Debt (P1)

### 5. Server Manager Complexity

**File:** [`src/main/toji/server.ts`](src/main/toji/server.ts:1-516)
**Severity:** P1 - Major
**Impact:** Maintainability, Resource management

**Problem:**
[`ServerManager`](src/main/toji/server.ts:30) mixes concerns:

- Port allocation
- Process spawning
- Health monitoring
- Lifecycle management
- Legacy compatibility methods

**Evidence:**

```typescript
// Lines 30-516: Too many responsibilities
export class ServerManager {
  private servers: Map<string, ServerInstance> = new Map()
  private readonly BASE_PORT = 4096
  private readonly MAX_SERVERS = 10

  async getOrCreateServer(directory: string, config?: Config): Promise<ServerInstance>
  async stopServerForDirectory(directory: string): Promise<void>
  async stopAllServers(): Promise<void>
  private async forceKillAllOpenCodeProcesses(): Promise<void>
  private async findNextAvailablePort(): Promise<number>
  private async checkServerHealth(instance: ServerInstance): Promise<boolean>
  private startHealthMonitoring(instance: ServerInstance): void
  private async spawnOpenCodeServer(options?: ServerOptions): Promise<{...}>
  // ... plus legacy methods for backward compatibility
}
```

**Recommendation:**
Split into focused classes:

```typescript
// src/main/toji/server/port-allocator.ts
class PortAllocator {
  private readonly BASE_PORT = 4096
  private usedPorts = new Set<number>()

  async allocate(): Promise<number>
  release(port: number): void
  private async isPortAvailable(port: number): Promise<boolean>
}

// src/main/toji/server/process-spawner.ts
class ProcessSpawner {
  async spawn(options: SpawnOptions): Promise<ChildProcess>
  private buildArgs(options: SpawnOptions): string[]
  private setupEnvironment(options: SpawnOptions): NodeJS.ProcessEnv
}

// src/main/toji/server/health-monitor.ts
class HealthMonitor {
  private intervals = new Map<string, NodeJS.Timeout>()

  startMonitoring(instance: ServerInstance): void
  stopMonitoring(instanceId: string): void
  async checkHealth(instance: ServerInstance): Promise<boolean>
}

// src/main/toji/server/server-manager.ts
class ServerManager {
  constructor(
    private portAllocator: PortAllocator,
    private spawner: ProcessSpawner,
    private healthMonitor: HealthMonitor
  ) {}

  async getOrCreateServer(directory: string): Promise<ServerInstance>
  async stopServer(directory: string): Promise<void>
}
```

---

### 6. MCP Manager Service Registry Incomplete

**File:** [`src/main/toji/mcp/mcp-manager.ts`](src/main/toji/mcp/mcp-manager.ts:1-425)
**Severity:** P1 - Major
**Impact:** Extensibility, Maintainability

**Problem:**
Service registry pattern is partially implemented but still uses switch statements:

```typescript
// Lines 119-148: Switch statement defeats purpose of registry
private registerServiceWithServer(server: McpServer, name: string, service: unknown): void {
  switch (name) {
    case 'discord:messages':
      registerDiscordMessageTool(server, service as DiscordMessageFetcher)
      break
    case 'discord:upload':
      registerDiscordUploadTool(server, service as DiscordFileUploader)
      break
    // ... 8 more cases
    default:
      logger.debug('Unknown service name: %s', name)
  }
}
```

**Recommendation:**
Complete the registry pattern:

```typescript
// src/main/toji/mcp/service-registry.ts
interface McpServiceRegistration<T = unknown> {
  name: string
  register: (server: McpServer, service: T) => void
  validate?: (service: unknown) => service is T
}

class McpServiceRegistry {
  private registrations = new Map<string, McpServiceRegistration>()

  registerType<T>(registration: McpServiceRegistration<T>): void {
    this.registrations.set(registration.name, registration)
  }

  registerService(server: McpServer, name: string, service: unknown): void {
    const registration = this.registrations.get(name)
    if (!registration) {
      throw new Error(`Unknown service type: ${name}`)
    }

    if (registration.validate && !registration.validate(service)) {
      throw new Error(`Invalid service for type: ${name}`)
    }

    registration.register(server, service)
  }
}

// Usage
const registry = new McpServiceRegistry()

// Register service types once
registry.registerType({
  name: 'discord:messages',
  register: registerDiscordMessageTool,
  validate: (s): s is DiscordMessageFetcher => typeof s === 'object' && 'fetchMessages' in s
})

// Register service instances
registry.registerService(server, 'discord:messages', messageFetcher)
```

---

### 7. React Hook Composition Complexity

**File:** [`src/renderer/src/hooks/useChatCoordinator.ts`](src/renderer/src/hooks/useChatCoordinator.ts:1-436)
**Severity:** P1 - Major
**Impact:** Maintainability, Performance, Testing

**Problem:**
[`useChatCoordinator`](src/renderer/src/hooks/useChatCoordinator.ts:87) composes 4 hooks with complex interdependencies:

```typescript
// Lines 88-96: Complex composition
export function useChatCoordinator(): UseChatCoordinatorReturn {
  const projectManager = useProjectManager()
  const sessionManager = useSessionManager(projectManager.currentProject)
  const serverStatus = useServerStatus()
  const messageManager = useMessageManager(
    sessionManager.currentSessionId,
    serverStatus.setServerStatus,
    serverStatus.checkServerStatus
  )
  // ... 350 more lines
}
```

**Issues:**

- Passing setters between hooks creates tight coupling
- Difficult to test individual hooks
- Re-renders cascade through all hooks
- Unclear data flow
- 436 lines in a single hook

**Recommendation:**
Use React Context for shared state:

```typescript
// src/renderer/src/contexts/ChatStateContext.tsx
interface ChatState {
  project: Project | null
  sessions: Session[]
  messages: ChatMessage[]
  serverStatus: ServerStatus
}

const ChatStateContext = createContext<ChatState | null>(null)
const ChatActionsContext = createContext<ChatActions | null>(null)

export function ChatStateProvider({ children }: { children: React.ReactNode }) {
  const [state, dispatch] = useReducer(chatReducer, initialState)

  const actions = useMemo(() => ({
    switchProject: (path: string) => dispatch({ type: 'SWITCH_PROJECT', path }),
    createSession: (name: string) => dispatch({ type: 'CREATE_SESSION', name }),
    sendMessage: (text: string) => dispatch({ type: 'SEND_MESSAGE', text })
  }), [])

  return (
    <ChatStateContext.Provider value={state}>
      <ChatActionsContext.Provider value={actions}>
        {children}
      </ChatActionsContext.Provider>
    </ChatStateContext.Provider>
  )
}

// Individual hooks become simple
export function useProject() {
  const state = useContext(ChatStateContext)
  const actions = useContext(ChatActionsContext)
  return {
    project: state.project,
    switchProject: actions.switchProject
  }
}
```

---

### 8. Discord Service Initialization Timing

**File:** [`src/main/services/discord-service.ts`](src/main/services/discord-service.ts:1-334)
**Severity:** P1 - Major
**Impact:** Reliability, User experience

**Problem:**
Plugin initialization happens during connection, creating race conditions:

```typescript
// Lines 106-130: Plugin initialized during connect
async connect(): Promise<void> {
  // ... token validation

  // Initialize plugin before connecting
  logger.debug('Initializing Discord plugin')
  await this.initializePlugin()  // ❌ Can fail mid-connection

  // Create Discord client
  this.client = new Client({...})

  // Login
  await this.client.login(token)
}
```

**Consequences:**

- If plugin init fails, client is partially created
- Cleanup is complex
- Error recovery is difficult
- State is inconsistent on failure

**Recommendation:**
Separate initialization from connection:

```typescript
class DiscordService {
  private plugin?: DiscordPlugin
  private client?: Client
  private state: 'uninitialized' | 'initialized' | 'connected' = 'uninitialized'

  async initialize(): Promise<void> {
    if (this.state !== 'uninitialized') return

    this.plugin = await this.createPlugin()
    await this.plugin.initialize()
    this.state = 'initialized'
  }

  async connect(): Promise<void> {
    if (this.state !== 'initialized') {
      throw new Error('Must initialize before connecting')
    }

    this.client = new Client({...})
    await this.client.login(token)
    this.state = 'connected'
  }

  async disconnect(): Promise<void> {
    if (this.client) {
      this.client.destroy()
      this.client = undefined
    }
    this.state = 'initialized'
  }
}
```

---

## Minor Improvements (P2)

### 9. Configuration Management Scattered

**Files:**

- [`src/main/config/ConfigProvider.ts`](src/main/config/ConfigProvider.ts)
- [`src/main/toji/config-manager.ts`](src/main/toji/config-manager.ts)
- [`src/main/toji/config.ts`](src/main/toji/config.ts)

**Severity:** P2 - Minor
**Impact:** Maintainability

**Problem:**
Configuration logic is split across multiple files with overlapping responsibilities.

**Recommendation:**
Consolidate into single configuration module with clear layers:

- Storage layer (file I/O)
- Schema layer (validation)
- Access layer (getters/setters)

---

### 10. Logging Namespace Inconsistency

**Files:** Multiple
**Severity:** P2 - Minor
**Impact:** Debugging

**Problem:**
Logger namespaces are inconsistent:

- `'toji:core'`, `'toji:client'`, `'toji:chat'` (colon separator)
- `'discord:plugin'`, `'discord:service'` (colon separator)
- `'mcp:manager'` (colon separator)

But some use different patterns or are too generic.

**Recommendation:**
Standardize namespace convention:

```typescript
// Pattern: <domain>:<component>:<subcomponent>
'toji:core:session'
'toji:core:project'
'discord:plugin:voice'
'discord:service:connection'
'mcp:manager:registry'
```

---

### 11. Type Definitions Scattered

**Files:**

- [`src/main/toji/types.ts`](src/main/toji/types.ts)
- [`src/main/toji/interfaces.ts`](src/main/toji/interfaces.ts)
- [`src/main/toji/config.ts`](src/main/toji/config.ts)
- [`src/plugins/discord/interfaces.ts`](src/plugins/discord/interfaces.ts)

**Severity:** P2 - Minor
**Impact:** Developer experience

**Problem:**
Type definitions are scattered across multiple files with unclear organization.

**Recommendation:**
Organize types by domain:

```
src/main/types/
├── core.ts          # Core Toji types
├── session.ts       # Session-related types
├── project.ts       # Project-related types
├── server.ts        # Server-related types
└── index.ts         # Re-exports

src/plugins/discord/types/
├── plugin.ts        # Plugin types
├── commands.ts      # Command types
├── voice.ts         # Voice types
└── index.ts         # Re-exports
```

---

### 12. Magic Numbers and Constants

**Files:** Multiple
**Severity:** P2 - Minor
**Impact:** Maintainability

**Problem:**
Magic numbers scattered throughout codebase:

```typescript
// server.ts:32
private readonly BASE_PORT = 4096
private readonly MAX_SERVERS = 10

// mcp-manager.ts:49
const BASE_PORT = 3100

// useChatCoordinator.ts:78-81
const CACHE_KEYS = {
  LAST_SESSION: 'toji3_last_session',
  CACHED_MESSAGES: 'toji3_cached_messages'
}
```

**Recommendation:**
Centralize configuration:

```typescript
// src/main/config/constants.ts
export const SERVER_CONFIG = {
  BASE_PORT: 4096,
  MAX_SERVERS: 10,
  HEALTH_CHECK_INTERVAL: 30000,
  STARTUP_TIMEOUT: 10000
} as const

export const MCP_CONFIG = {
  BASE_PORT: 3100,
  MAX_SERVERS: 10
} as const

// src/renderer/src/config/constants.ts
export const CACHE_KEYS = {
  LAST_SESSION: 'toji3_last_session',
  CACHED_MESSAGES: 'toji3_cached_messages',
  LAST_PROJECT: 'toji3_last_project'
} as const
```

---

## Architecture Patterns Analysis

### Current State vs. Intended Architecture

#### ✅ **Well-Implemented Patterns**

1. **Main-Process-First Architecture**
   - Business logic correctly resides in main process
   - Renderer is thin presentation layer
   - IPC handlers are minimal wrappers

2. **Module Organization**
   - Clear separation of concerns in file structure
   - Logical grouping of related functionality
   - Good use of subdirectories

3. **Type Safety**
   - Full TypeScript coverage
   - Type-safe IPC boundaries via preload
   - Proper use of interfaces

4. **Logging System**
   - Unified logger implementation
   - Consistent usage across codebase
   - File and console output

#### ❌ **Violated Patterns**

1. **Single Responsibility Principle**
   - [`Toji`](src/main/toji/index.ts:60) class violates SRP (1169 lines)
   - [`ServerManager`](src/main/toji/server.ts:30) mixes multiple concerns
   - [`useChatCoordinator`](src/renderer/src/hooks/useChatCoordinator.ts:87) does too much (436 lines)

2. **Dependency Inversion Principle**
   - [`DiscordPlugin`](src/plugins/discord/DiscordPlugin.ts:37) depends on concrete [`Toji`](src/main/toji/index.ts:60) class
   - Services depend on concrete implementations
   - No interface-based contracts

3. **Open/Closed Principle**
   - [`McpManager`](src/main/toji/mcp/mcp-manager.ts:65) uses switch statements for service registration
   - Adding new services requires modifying existing code

---

## Comparison with Specifications

### SPEC Compliance Analysis

#### ✅ **Compliant Areas**

1. **[`FRONTEND.md`](SPEC/FRONTEND.md)**
   - ✅ Chakra UI v3 exclusively used
   - ✅ Theme tokens properly implemented
   - ✅ No CSS files or inline styles
   - ✅ Hooks abstract window.api
   - ✅ Type safety across IPC boundary

2. **[`LOGGER.md`](SPEC/LOGGER.md)**
   - ✅ Unified logger implementation
   - ✅ Consistent usage across codebase
   - ✅ File and console output
   - ✅ Namespace-based organization

3. **[`DISCORD_EMBED_SYSTEM.md`](SPEC/DISCORD_EMBED_SYSTEM.md)**
   - ✅ Progress embeds implemented
   - ✅ Tool activity tracking
   - ✅ Throttling to respect rate limits
   - ✅ Color constants used

#### ⚠️ **Partial Compliance**

1. **Main-Process-First Architecture**
   - ✅ Business logic in main process
   - ⚠️ But [`Toji`](src/main/toji/index.ts:60) class is too large
   - ⚠️ Unclear boundaries between modules

2. **Plugin Architecture**
   - ✅ Plugins are separate modules
   - ⚠️ But tightly coupled to core
   - ⚠️ No clear plugin interface

#### ❌ **Non-Compliant Areas**

1. **Error Handling**
   - ❌ No specification exists
   - ❌ Inconsistent patterns across codebase
   - ❌ No centralized error handling

2. **State Management**
   - ❌ No specification for renderer state
   - ❌ Multiple sources of truth
   - ❌ Cache synchronization issues

---

## Dependency Analysis

### Circular Dependencies

**Status:** ✅ No circular dependencies detected

The codebase maintains a clean dependency graph:

```
main/index.ts
  ↓
main/toji/index.ts
  ↓
main/toji/server.ts, sessions.ts, project.ts, etc.
  ↓
main/services/*
```

### Coupling Analysis

**High Coupling Areas:**

1. **[`Toji`](src/main/toji/index.ts:60) ↔ Everything**
   - Almost every module depends on [`Toji`](src/main/toji/index.ts:60) class
   - Changes to [`Toji`](src/main/toji/index.ts:60) ripple through entire codebase

2. **[`DiscordPlugin`](src/plugins/discord/DiscordPlugin.ts:37) ↔ [`Toji`](src/main/toji/index.ts:60)**
   - Direct dependency on concrete class
   - Cannot test or reuse independently

3. **React Hooks ↔ Each Other**
   - [`useChatCoordinator`](src/renderer/src/hooks/useChatCoordinator.ts:87) tightly couples 4 hooks
   - Passing setters creates implicit dependencies

**Low Coupling Areas:**

1. **Utilities**
   - [`logger.ts`](src/main/utils/logger.ts), [`path.ts`](src/main/utils/path.ts) are independent
   - Can be reused anywhere

2. **MCP Tools**
   - Individual tool files are independent
   - Clean registration pattern

---

## Performance Considerations

### Identified Issues

1. **Excessive Re-renders in React**
   - [`useChatCoordinator`](src/renderer/src/hooks/useChatCoordinator.ts:87) causes cascading re-renders
   - Every state change triggers all composed hooks
   - No memoization of expensive computations

2. **Synchronous File Operations**
   - Some file operations block event loop
   - Should use async variants

3. **Health Check Intervals**
   - 30-second health checks for all servers
   - Could be optimized with exponential backoff

### Recommendations

1. Use React.memo and useMemo for expensive components
2. Implement virtual scrolling for message lists
3. Debounce user input in search/filter operations
4. Use Web Workers for heavy computations

---

## Security Considerations

### Identified Issues

1. **Token Storage**
   - Discord tokens stored in config
   - Should use OS keychain (electron-store supports this)

2. **IPC Validation**
   - Limited input validation on IPC handlers
   - Should validate all user input

3. **Process Spawning**
   - OpenCode binary spawned with user input
   - Should sanitize directory paths

### Recommendations

1. Implement input validation layer for all IPC handlers
2. Use OS keychain for sensitive data
3. Sanitize all file paths before use
4. Add rate limiting to IPC handlers

---

## Testing Strategy Recommendations

### Current State

- No test files found in codebase
- No testing framework configured

### Recommended Approach

1. **Unit Tests**

   ```typescript
   // Example: Test ServerManager port allocation
   describe('ServerManager', () => {
     it('should allocate sequential ports', async () => {
       const manager = new ServerManager(mockService)
       const port1 = await manager['findNextAvailablePort']()
       const port2 = await manager['findNextAvailablePort']()
       expect(port2).toBe(port1 + 1)
     })
   })
   ```

2. **Integration Tests**

   ```typescript
   // Example: Test Toji → OpenCode integration
   describe('Toji Integration', () => {
     it('should create session and send message', async () => {
       const toji = new Toji(mockService, mockConfig)
       await toji.connectClient('/test/project')
       const response = await toji.chat('Hello')
       expect(response).toBeDefined()
     })
   })
   ```

3. **E2E Tests**
   - Use Playwright for renderer testing
   - Test full user workflows
   - Verify IPC communication

---

## Refactoring Priority Matrix

### Immediate (Next Sprint)

1. **Break down [`Toji`](src/main/toji/index.ts:60) class** (P0)
   - Estimated effort: 3-5 days
   - High impact on maintainability
   - Enables parallel development

2. **Implement centralized error handling** (P0)
   - Estimated effort: 2-3 days
   - Improves user experience
   - Simplifies debugging

3. **Fix state management in renderer** (P0)
   - Estimated effort: 3-4 days
   - Eliminates race conditions
   - Improves reliability

### Short Term (Next Month)

4. **Decouple Discord plugin** (P0)
   - Estimated effort: 2-3 days
   - Enables plugin reusability
   - Improves testability

5. **Refactor [`ServerManager`](src/main/toji/server.ts:30)** (P1)
   - Estimated effort: 2-3 days
   - Improves maintainability
   - Simplifies testing

6. **Complete MCP service registry** (P1)
   - Estimated effort: 1-2 days
   - Enables extensibility
   - Removes switch statements

### Medium Term (Next Quarter)

7. **Consolidate configuration** (P2)
   - Estimated effort: 2-3 days
   - Improves organization
   - Reduces confusion

8. **Standardize logging** (P2)
   - Estimated effort: 1 day
   - Improves debugging
   - Better log filtering

9. **Organize type definitions** (P2)
   - Estimated effort: 1-2 days
   - Improves developer experience
   - Better IDE support

---

## Recommended Refactoring Sequence

### Phase 1: Foundation (Week 1-2)

1. Create error handling infrastructure
2. Define service interfaces
3. Set up testing framework

### Phase 2: Core Refactoring (Week 3-5)

4. Break down [`Toji`](src/main/toji/index.ts:60) class into coordinators
5. Implement interface-based plugin system
6. Refactor state management in renderer

### Phase 3: Service Layer (Week 6-7)

7. Refactor [`ServerManager`](src/main/toji/server.ts:30)
8. Complete MCP service registry
9. Decouple Discord plugin

### Phase 4: Polish (Week 8)

10. Consolidate configuration
11. Standardize logging
12. Organize type definitions
13. Add comprehensive tests

---

## Metrics & KPIs

### Code Quality Metrics

| Metric                   | Current | Target | Priority |
| ------------------------ | ------- | ------ | -------- |
| Largest file (lines)     | 1169    | <500   | P0       |
| Largest function (lines) | ~200    | <50    | P1       |
| Cyclomatic complexity    | High    | Medium | P1       |
| Test coverage            | 0%      | >70%   | P1       |
| Type safety              | 100%    | 100%   | ✅       |
| Linting errors           | 0       | 0      | ✅       |

### Architecture Metrics

| Metric                | Current | Target | Priority |
| --------------------- | ------- | ------ | -------- |
| Circular dependencies | 0       | 0      | ✅       |
| God objects           | 1       | 0      | P0       |
| Interface usage       | Low     | High   | P0       |
| Coupling (avg)        | High    | Low    | P0       |
| Cohesion (avg)        | Medium  | High   | P1       |

---

## Conclusion

The Toji Electron project demonstrates **solid architectural foundations** with clear separation of concerns and comprehensive documentation. However, **complexity has accumulated** in key areas, particularly the [`Toji`](src/main/toji/index.ts:60) class, creating a **god object anti-pattern** that will impede future development.

### Key Takeaways

1. **Immediate action required** on P0 issues to prevent further technical debt
2. **Refactoring is feasible** - no fundamental architectural flaws
3. **Strong foundation** - good patterns exist, just need to be applied consistently
4. **Clear path forward** - specific recommendations with file references provided

### Success Criteria

After implementing recommendations:

- ✅ No file exceeds 500 lines
- ✅ All plugins use interface-based dependencies
- ✅ Single source of truth for state
- ✅ Consistent error handling across codebase
- ✅ Test coverage >70%
- ✅ Clear separation of concerns

### Next Steps

1. Review this assessment with the team
2. Prioritize issues based on business impact
3. Create detailed implementation plan for Phase 1
4. Begin refactoring with error handling infrastructure
5. Establish testing practices before major refactoring

---

**Document Version:** 1.0
**Last Updated:** October 27, 2025
**Reviewed By:** Kilo Code (Architect Mode)
**Status:** Complete - Ready for Team Review
