# Toji Class Refactoring Design

## Executive Summary

This document outlines the architectural design for refactoring the 1169-line [`Toji`](src/main/toji/index.ts:60) god object into focused coordinators following the Single Responsibility Principle. The refactoring maintains backward compatibility while improving maintainability, testability, and extensibility.

**Current State:** Monolithic class handling 8+ responsibilities
**Target State:** Thin facade delegating to 5 focused coordinators
**Lines of Code:** 1169 → ~250 (facade) + coordinators

---

## Table of Contents

1. [Current Architecture Analysis](#current-architecture-analysis)
2. [Proposed Architecture](#proposed-architecture)
3. [Coordinator Designs](#coordinator-designs)
4. [Toji Facade Design](#toji-facade-design)
5. [Migration Strategy](#migration-strategy)
6. [Testing Strategy](#testing-strategy)
7. [Risk Assessment](#risk-assessment)
8. [Code Examples](#code-examples)

---

## Current Architecture Analysis

### Responsibilities in Current Toji Class

The [`Toji`](src/main/toji/index.ts:60) class currently handles:

1. **Session Management** (Lines 256-584)
   - Chat operations with streaming
   - Session lifecycle (create, delete, switch)
   - Message history retrieval
   - Active session tracking

2. **Project Management** (Lines 602-799)
   - Project discovery and listing
   - Project switching
   - Project initialization
   - Project status tracking
   - Working directory management

3. **Server Lifecycle** (Lines 157-194, 734-799)
   - Server creation and connection
   - Multi-server coordination
   - Health monitoring delegation
   - Server restart logic

4. **Client Management** (Lines 162-200)
   - Client connection lifecycle
   - Client-server mapping
   - Client retrieval

5. **Configuration Management** (Lines 596-1102)
   - Project configuration CRUD
   - Permission management
   - Model selection
   - API key synchronization
   - Default permissions

6. **MCP Service Registry** (Lines 131-155)
   - Service registration
   - Service retrieval
   - MCP server coordination

7. **Event Emission** (Lines 55-79, 242-247, 794-798)
   - Type-safe event system
   - Project lifecycle events

8. **State Management**
   - Current project tracking
   - Current session tracking
   - Configuration provider access

### Existing Manager Classes

Good news: Some separation already exists!

- [`SessionManager`](src/main/toji/sessions.ts:8) - Session CRUD, caching, message retrieval
- [`ServerManager`](src/main/toji/server.ts:30) - Multi-server process management
- [`ProjectManager`](src/main/toji/project.ts:16) - Project listing from SDK
- [`ClientManager`](src/main/toji/client-manager.ts:11) - Client lifecycle
- [`ConfigManager`](src/main/toji/config-manager.ts:20) - Configuration persistence
- [`McpManager`](src/main/toji/mcp/mcp-manager.ts:65) - MCP server lifecycle
- [`ProjectInitializer`](src/main/toji/project-initializer.ts) - Git/config initialization

### Dependency Graph

```
Current Dependencies (Circular & Tight Coupling):

Toji
├─> ServerManager
├─> SessionManager
├─> ClientManager ──> ServerManager (circular!)
├─> ConfigManager ──> Toji methods (callbacks)
├─> ProjectManager
├─> ProjectInitializer
├─> McpManager ──> Toji (via ITojiCore)
└─> ConfigProvider
```

---

## Proposed Architecture

### High-Level Design

```
┌─────────────────────────────────────────────────────────────┐
│                         Toji Facade                          │
│                    (Thin Delegation Layer)                   │
│                         ~250 lines                           │
└─────────────────────────────────────────────────────────────┘
                              │
        ┌─────────────────────┼─────────────────────┐
        │                     │                     │
        ▼                     ▼                     ▼
┌──────────────┐    ┌──────────────┐    ┌──────────────┐
│   Session    │    │   Project    │    │    Server    │
│ Coordinator  │    │ Coordinator  │    │ Coordinator  │
└──────────────┘    └──────────────┘    └──────────────┘
        │                     │                     │
        ▼                     ▼                     ▼
┌──────────────┐    ┌──────────────┐    ┌──────────────┐
│    Config    │    │     MCP      │    │   Existing   │
│ Coordinator  │    │ Coordinator  │    │   Managers   │
└──────────────┘    └──────────────┘    └──────────────┘
```

### Coordinator Responsibilities

| Coordinator            | Single Responsibility                                   | Lines (Est.) |
| ---------------------- | ------------------------------------------------------- | ------------ |
| **SessionCoordinator** | Orchestrate chat operations and session lifecycle       | ~300         |
| **ProjectCoordinator** | Manage project discovery, switching, and initialization | ~350         |
| **ServerCoordinator**  | Coordinate server-client lifecycle and health           | ~250         |
| **ConfigCoordinator**  | Manage all configuration operations                     | ~200         |
| **McpCoordinator**     | Coordinate MCP services and server lifecycle            | ~150         |
| **Toji (Facade)**      | Delegate to coordinators, maintain compatibility        | ~250         |

---

## Coordinator Designs

### 1. SessionCoordinator

**Single Responsibility:** Orchestrate all chat and session operations

**Public Interface:**

```typescript
interface ISessionCoordinator {
  // Chat operations
  chat(message: string, sessionId?: string): Promise<string>
  chatStreaming(message: string, callbacks: StreamCallbacks, sessionId?: string): Promise<void>

  // Session lifecycle
  createSession(title?: string): Promise<Session>
  deleteSession(sessionId: string): Promise<void>
  switchSession(sessionId: string): Promise<void>
  listSessions(): Promise<Session[]>

  // Session state
  getCurrentSession(): Promise<{ id: string; directory?: string } | null>
  getCurrentSessionId(): string | undefined
  clearSession(): void

  // Message operations
  getSessionMessages(
    sessionId?: string,
    useCache?: boolean
  ): Promise<Array<{ info: Message; parts: Part[] }>>
  loadMostRecentSession(): Promise<void>
}
```

**Dependencies:**

- [`SessionManager`](src/main/toji/sessions.ts:8) (existing) - Delegates to for actual operations
- [`ClientManager`](src/main/toji/client-manager.ts:11) (via ServerCoordinator) - Gets client for operations
- `ProjectCoordinator` - Gets current project directory
- `ConfigProvider` - Saves active session

**Key Methods to Extract:**

- [`chat()`](src/main/toji/index.ts:257) - Lines 257-319
- [`chatStreaming()`](src/main/toji/index.ts:322) - Lines 322-387
- [`subscribeToSessionEvents()`](src/main/toji/index.ts:390) - Lines 390-531 (private)
- [`clearSession()`](src/main/toji/index.ts:534) - Lines 534-544
- [`getSessionMessages()`](src/main/toji/index.ts:547) - Lines 547-576
- [`getCurrentSessionId()`](src/main/toji/index.ts:579) - Lines 579-584
- [`getCurrentSession()`](src/main/toji/index.ts:693) - Lines 693-731
- [`listSessions()`](src/main/toji/index.ts:802) - Lines 802-810
- [`createSession()`](src/main/toji/index.ts:812) - Lines 812-830
- [`deleteSession()`](src/main/toji/index.ts:832) - Lines 832-839
- [`switchSession()`](src/main/toji/index.ts:841) - Lines 841-878
- [`loadMostRecentSession()`](src/main/toji/index.ts:883) - Lines 883-938

**State Management:**

- Delegates session tracking to [`SessionManager`](src/main/toji/sessions.ts:8)
- Queries project directory from `ProjectCoordinator`
- No internal state beyond dependencies

---

### 2. ProjectCoordinator

**Single Responsibility:** Manage project discovery, switching, and lifecycle

**Public Interface:**

```typescript
interface IProjectCoordinator {
  // Project discovery
  getAvailableProjects(): Promise<Array<Project>>
  getAllProjects(): Promise<ProjectInfo[]>

  // Project switching
  switchToProject(projectPath: string): Promise<{ success: boolean; projectPath: string }>
  closeCurrentProject(): Promise<void>

  // Project initialization
  initializeProject(config?: OpencodeConfig): Promise<InitializationResult>
  getProjectStatus(): Promise<ProjectStatus | null>

  // Directory management
  changeWorkingDirectory(directory: string): Promise<void>
  getCurrentProjectDirectory(): string | undefined
  getCurrentWorkingDirectory(): string

  // Project state
  getCurrentProjectId(): string | undefined
}
```

**Dependencies:**

- [`ProjectManager`](src/main/toji/project.ts:16) (existing) - Delegates project listing
- [`ProjectInitializer`](src/main/toji/project-initializer.ts) (existing) - Delegates initialization
- `ServerCoordinator` - Server lifecycle coordination
- `McpCoordinator` - MCP server creation
- `ConfigProvider` - Project path persistence
- `EventEmitter` - Project lifecycle events

**Key Methods to Extract:**

- [`getAvailableProjects()`](src/main/toji/index.ts:602) - Lines 602-611
- [`switchToProject()`](src/main/toji/index.ts:614) - Lines 614-690
- [`changeWorkingDirectory()`](src/main/toji/index.ts:203) - Lines 203-248
- [`getCurrentProjectDirectory()`](src/main/toji/index.ts:587) - Lines 587-589
- [`getCurrentWorkingDirectory()`](src/main/toji/index.ts:592) - Lines 592-594
- [`closeCurrentProject()`](src/main/toji/index.ts:734) - Lines 734-799
- [`getProjectStatus()`](src/main/toji/index.ts:941) - Lines 941-950
- [`initializeProject()`](src/main/toji/index.ts:953) - Lines 953-997

**State Management:**

- `currentProjectDirectory: string | undefined`
- `currentProjectId: string | undefined`
- Emits events: `project:opened`, `project:closed`

---

### 3. ServerCoordinator

**Single Responsibility:** Coordinate server-client lifecycle and connectivity

**Public Interface:**

```typescript
interface IServerCoordinator {
  // Server lifecycle
  getOrCreateServer(directory: string, config?: Config): Promise<ServerInstance>
  stopServerForDirectory(directory: string): Promise<void>
  stopAllServers(): Promise<void>

  // Client management
  connectClient(directory?: string): Promise<OpencodeClient>
  getClient(directory?: string): OpencodeClient | undefined
  disconnectClient(directory: string): void

  // Server status
  getServerStatus(): Promise<ServerStatus>
  isReady(): boolean
  getAllServers(): Array<{ directory: string; port: number; url: string; isHealthy: boolean }>

  // API key management
  syncApiKeys(): Promise<void>
  registerApiKey(providerId: string, apiKey: string): Promise<void>
}
```

**Dependencies:**

- [`ServerManager`](src/main/toji/server.ts:30) (existing) - Delegates server operations
- [`ClientManager`](src/main/toji/client-manager.ts:11) (existing) - Delegates client operations
- `ConfigProvider` - API key retrieval

**Key Methods to Extract:**

- [`connectClient()`](src/main/toji/index.ts:162) - Lines 162-194
- [`getClient()`](src/main/toji/index.ts:197) - Lines 197-200 (private)
- [`isReady()`](src/main/toji/index.ts:251) - Lines 251-254
- [`getServerStatus()`](src/main/toji/index.ts:157) - Lines 157-159
- [`getAllServers()`](src/main/toji/index.ts:1000) - Lines 1000-1002
- [`syncApiKeys()`](src/main/toji/index.ts:1138) - Lines 1138-1166
- [`registerApiKey()`](src/main/toji/index.ts:1112) - Lines 1112-1132

**State Management:**

- No internal state (delegates to managers)
- Coordinates between [`ServerManager`](src/main/toji/server.ts:30) and [`ClientManager`](src/main/toji/client-manager.ts:11)

---

### 4. ConfigCoordinator

**Single Responsibility:** Manage all configuration operations

**Public Interface:**

```typescript
interface IConfigCoordinator {
  // Project configuration
  getProjectConfig(): Promise<OpencodeConfig>
  updateProjectConfig(config: OpencodeConfig): Promise<void>

  // Permissions
  getPermissions(): Promise<PermissionConfig>
  updatePermissions(permissions: Partial<PermissionConfig>): Promise<void>
  setPermission(type: PermissionType, level: PermissionLevel): Promise<void>

  // Model configuration
  getModelConfig(): Promise<ModelConfig>
  updateModelConfig(selection: Partial<ModelConfig>): Promise<void>
  getModelProviders(): Promise<ConfigProvidersResponse>

  // Default permissions
  getDefaultPermissions(): Promise<PermissionConfig>
  updateDefaultPermissions(permissions: Partial<PermissionConfig>): Promise<PermissionConfig>
}
```

**Dependencies:**

- [`ConfigManager`](src/main/toji/config-manager.ts:20) (existing) - Delegates operations
- `ServerCoordinator` - For server restart after config changes
- `ConfigProvider` - For default permissions

**Key Methods to Extract:**

- [`getProjectConfig()`](src/main/toji/index.ts:1005) - Lines 1005-1007
- [`updateProjectConfig()`](src/main/toji/index.ts:1010) - Lines 1010-1012
- [`getPermissions()`](src/main/toji/index.ts:1015) - Lines 1015-1017
- [`updatePermissions()`](src/main/toji/index.ts:1020) - Lines 1020-1022
- [`setPermission()`](src/main/toji/index.ts:1025) - Lines 1025-1027
- [`getModelProviders()`](src/main/toji/index.ts:1030) - Lines 1030-1057
- [`getModelConfig()`](src/main/toji/index.ts:1060) - Lines 1060-1070
- [`updateModelConfig()`](src/main/toji/index.ts:1073) - Lines 1073-1082
- [`getDefaultPermissions()`](src/main/toji/index.ts:1085) - Lines 1085-1091
- [`updateDefaultPermissions()`](src/main/toji/index.ts:1094) - Lines 1094-1102

**State Management:**

- No internal state (delegates to [`ConfigManager`](src/main/toji/config-manager.ts:20))

---

### 5. McpCoordinator

**Single Responsibility:** Coordinate MCP services and server lifecycle

**Public Interface:**

```typescript
interface IMcpCoordinator {
  // Service registry
  registerMCPService<T>(name: string, service: T): void
  getMCPService<T>(name: string): T | undefined
  hasMCPService(name: string): boolean

  // MCP server lifecycle
  createServerForProject(directory: string): Promise<void>
  closeServerForProject(directory: string): Promise<void>

  // Dependencies configuration
  setSessionDependencies(
    getClient: () => OpencodeClient | null,
    getCurrentProjectPath: () => string | undefined,
    sessionManager: SessionManager
  ): void
  setTojiInstance(getToji: () => ITojiCore | null): void
}
```

**Dependencies:**

- [`McpManager`](src/main/toji/mcp/mcp-manager.ts:65) (existing) - Delegates operations
- `SessionCoordinator` - For session dependencies
- `ProjectCoordinator` - For Toji instance reference

**Key Methods to Extract:**

- [`registerMCPService()`](src/main/toji/index.ts:137) - Lines 137-141
- [`getMCPService()`](src/main/toji/index.ts:146) - Lines 146-148
- [`hasMCPService()`](src/main/toji/index.ts:153) - Lines 153-155
- MCP server creation logic from [`connectClient()`](src/main/toji/index.ts:167) - Lines 167-175
- MCP server closure from [`closeCurrentProject()`](src/main/toji/index.ts:751) - Lines 751-756

**State Management:**

- `mcpServices: Map<string, unknown>` - Service registry
- Delegates server tracking to [`McpManager`](src/main/toji/mcp/mcp-manager.ts:65)

---

## Toji Facade Design

### Facade Responsibilities

The new [`Toji`](src/main/toji/index.ts:60) class becomes a **thin facade** that:

1. **Maintains backward compatibility** - All existing public methods remain
2. **Delegates to coordinators** - No business logic in facade
3. **Manages coordinator lifecycle** - Creates and wires coordinators
4. **Provides convenience methods** - Simple pass-through to coordinators
5. **Handles events** - Extends EventEmitter for project events

### Facade Structure (~250 lines)

```typescript
export class Toji extends EventEmitter {
  // Coordinators (public for advanced usage)
  public readonly session: SessionCoordinator
  public readonly project: ProjectCoordinator
  public readonly server: ServerCoordinator
  public readonly config: ConfigCoordinator
  public readonly mcp: McpCoordinator

  // Legacy public properties (for backward compatibility)
  public readonly sessions: SessionManager
  public readonly projectInitializer: ProjectInitializer
  public readonly configManager: ConfigManager
  public readonly clientManager: ClientManager

  constructor(opencodeService: OpenCodeService, config?: ConfigProvider) {
    super()

    // Create coordinators with proper dependency injection
    this.server = new ServerCoordinator(opencodeService, config)
    this.project = new ProjectCoordinator(this.server, config, this)
    this.session = new SessionCoordinator(this.server, this.project, config)
    this.config = new ConfigCoordinator(this.server, this.project, config)
    this.mcp = new McpCoordinator(this.session, this.project)

    // Expose legacy managers for backward compatibility
    this.sessions = this.session.sessionManager
    this.projectInitializer = this.project.projectInitializer
    this.configManager = this.config.configManager
    this.clientManager = this.server.clientManager
  }

  // ============================================================
  // Session Operations (delegate to SessionCoordinator)
  // ============================================================

  async chat(message: string, sessionId?: string): Promise<string> {
    return this.session.chat(message, sessionId)
  }

  async chatStreaming(
    message: string,
    callbacks: StreamCallbacks,
    sessionId?: string
  ): Promise<void> {
    return this.session.chatStreaming(message, callbacks, sessionId)
  }

  // ... more delegation methods ...

  // ============================================================
  // Project Operations (delegate to ProjectCoordinator)
  // ============================================================

  async switchToProject(projectPath: string): Promise<{ success: boolean; projectPath: string }> {
    return this.project.switchToProject(projectPath)
  }

  // ... more delegation methods ...

  // ============================================================
  // Configuration Operations (delegate to ConfigCoordinator)
  // ============================================================

  async getProjectConfig(): Promise<OpencodeConfig> {
    return this.config.getProjectConfig()
  }

  // ... more delegation methods ...
}
```

### Backward Compatibility Strategy

**100% backward compatible** through:

1. **Method delegation** - All existing public methods delegate to coordinators
2. **Property exposure** - Legacy managers exposed as public properties
3. **Event preservation** - EventEmitter functionality maintained
4. **Type compatibility** - All return types and signatures unchanged

---

## Migration Strategy

### Phase 1: Create Coordinator Interfaces (Week 1)

**Goal:** Define contracts without breaking existing code

**Steps:**

1. Create `src/main/toji/coordinators/interfaces.ts` with all coordinator interfaces
2. Create `src/main/toji/coordinators/types.ts` for shared types
3. Review interfaces with team
4. No code changes to existing [`Toji`](src/main/toji/index.ts:60) class yet

**Validation:**

- All interfaces compile
- No breaking changes to existing code
- Team approval on design

---

### Phase 2: Implement SessionCoordinator (Week 2)

**Why first?** Most isolated, clear boundaries, high test coverage potential

**Steps:**

1. Create `src/main/toji/coordinators/session-coordinator.ts`
2. Extract session-related methods from [`Toji`](src/main/toji/index.ts:60)
3. Implement `ISessionCoordinator` interface
4. Add comprehensive unit tests
5. Keep original methods in [`Toji`](src/main/toji/index.ts:60) as wrappers (delegate to coordinator)

**Code Example:**

```typescript
// In Toji class (temporary dual implementation)
async chat(message: string, sessionId?: string): Promise<string> {
  // New path (can be feature-flagged)
  if (this.session) {
    return this.session.chat(message, sessionId)
  }
  // Old path (fallback during migration)
  return this.legacyChat(message, sessionId)
}

private async legacyChat(message: string, sessionId?: string): Promise<string> {
  // Original implementation (renamed)
  // ... existing code ...
}
```

**Validation:**

- All session tests pass
- Integration tests pass
- Manual testing of chat functionality
- Performance benchmarks unchanged

**Rollback Plan:**

- Remove coordinator
- Restore original method names
- Delete coordinator tests

---

### Phase 3: Implement ServerCoordinator (Week 3)

**Why second?** Foundation for other coordinators, clear dependencies

**Steps:**

1. Create `src/main/toji/coordinators/server-coordinator.ts`
2. Extract server/client management from [`Toji`](src/main/toji/index.ts:60)
3. Wire to existing [`ServerManager`](src/main/toji/server.ts:30) and [`ClientManager`](src/main/toji/client-manager.ts:11)
4. Add unit tests
5. Update `SessionCoordinator` to use `ServerCoordinator`

**Validation:**

- Server lifecycle tests pass
- Client connection tests pass
- Multi-server scenarios work
- Health monitoring functional

---

### Phase 4: Implement ProjectCoordinator (Week 4)

**Why third?** Depends on `ServerCoordinator`, complex state management

**Steps:**

1. Create `src/main/toji/coordinators/project-coordinator.ts`
2. Extract project management from [`Toji`](src/main/toji/index.ts:60)
3. Wire to `ServerCoordinator` for lifecycle coordination
4. Implement event emission
5. Add comprehensive tests

**Validation:**

- Project switching works
- Events fire correctly
- State management correct
- Integration with server lifecycle

---

### Phase 5: Implement ConfigCoordinator (Week 5)

**Why fourth?** Simpler, mostly delegation to [`ConfigManager`](src/main/toji/config-manager.ts:20)

**Steps:**

1. Create `src/main/toji/coordinators/config-coordinator.ts`
2. Extract configuration methods from [`Toji`](src/main/toji/index.ts:60)
3. Wire to existing [`ConfigManager`](src/main/toji/config-manager.ts:20)
4. Add tests

**Validation:**

- Configuration CRUD works
- Permission updates work
- Model selection works
- Server restarts on config change

---

### Phase 6: Implement McpCoordinator (Week 6)

**Why last?** Depends on other coordinators, optional functionality

**Steps:**

1. Create `src/main/toji/coordinators/mcp-coordinator.ts`
2. Extract MCP service registry from [`Toji`](src/main/toji/index.ts:60)
3. Wire to [`McpManager`](src/main/toji/mcp/mcp-manager.ts:65)
4. Add tests

**Validation:**

- MCP services register correctly
- MCP servers create successfully
- Tools work through MCP

---

### Phase 7: Refactor Toji to Facade (Week 7)

**Goal:** Convert [`Toji`](src/main/toji/index.ts:60) to pure delegation

**Steps:**

1. Remove all business logic from [`Toji`](src/main/toji/index.ts:60)
2. Keep only delegation methods
3. Remove `legacy*` methods
4. Update constructor to wire coordinators
5. Comprehensive integration testing

**Validation:**

- All existing tests pass
- No behavioral changes
- Performance unchanged
- Code coverage maintained

---

### Phase 8: Documentation & Cleanup (Week 8)

**Steps:**

1. Update all documentation
2. Add coordinator usage examples
3. Create migration guide for extensions
4. Remove deprecated code
5. Final code review

---

## Testing Strategy

### Unit Testing

**Per Coordinator:**

- Mock all dependencies
- Test each public method
- Test error handling
- Test edge cases
- Target: 90%+ coverage per coordinator

**Example Test Structure:**

```typescript
describe('SessionCoordinator', () => {
  let coordinator: SessionCoordinator
  let mockServerCoordinator: jest.Mocked<ServerCoordinator>
  let mockProjectCoordinator: jest.Mocked<ProjectCoordinator>
  let mockSessionManager: jest.Mocked<SessionManager>

  beforeEach(() => {
    mockServerCoordinator = createMockServerCoordinator()
    mockProjectCoordinator = createMockProjectCoordinator()
    mockSessionManager = createMockSessionManager()

    coordinator = new SessionCoordinator(
      mockServerCoordinator,
      mockProjectCoordinator,
      mockSessionManager,
      mockConfig
    )
  })

  describe('chat', () => {
    it('should send message to active session', async () => {
      // Arrange
      mockProjectCoordinator.getCurrentProjectDirectory.mockReturnValue('/test')
      mockSessionManager.getActiveSession.mockReturnValue('session-123')
      mockServerCoordinator.getClient.mockReturnValue(mockClient)

      // Act
      const result = await coordinator.chat('Hello')

      // Assert
      expect(mockClient.session.prompt).toHaveBeenCalledWith({
        path: { id: 'session-123' },
        body: { parts: [{ type: 'text', text: 'Hello' }] },
        query: { directory: '/test' }
      })
    })

    it('should create new session if none active', async () => {
      // ... test implementation
    })

    it('should throw error if client not connected', async () => {
      // ... test implementation
    })
  })
})
```

### Integration Testing

**Cross-Coordinator Tests:**

- Test coordinator interactions
- Test full workflows (e.g., project switch → session creation → chat)
- Test event propagation
- Use real managers, mock only external dependencies

**Example:**

```typescript
describe('Project Switch Integration', () => {
  it('should switch project and maintain session state', async () => {
    // Arrange
    const toji = new Toji(opencodeService, config)
    await toji.project.switchToProject('/project-a')
    await toji.session.createSession('Test Session')

    // Act
    await toji.project.switchToProject('/project-b')

    // Assert
    expect(toji.project.getCurrentProjectDirectory()).toBe('/project-b')
    expect(toji.session.getCurrentSessionId()).toBeUndefined() // New project, no session
  })
})
```

### Regression Testing

**Existing Test Suite:**

- Run all existing tests after each phase
- No test should break
- Add new tests for coordinator-specific functionality
- Maintain or improve code coverage

### Performance Testing

**Benchmarks:**

- Chat latency (should not increase)
- Project switch time (should not increase)
- Memory usage (should decrease with better separation)
- Server startup time (should not change)

**Tools:**

- Jest performance tests
- Memory profiling
- Load testing for multi-project scenarios

---

## Risk Assessment

### High Risk Areas

#### 1. State Management Complexity

**Risk:** Coordinators need shared state (current project, active session)

**Mitigation:**

- Use dependency injection for state access
- `ProjectCoordinator` owns project state
- `SessionCoordinator` queries project state via interface
- Clear ownership boundaries documented

**Rollback:** Revert to monolithic state management

#### 2. Circular Dependencies

**Risk:** Coordinators might need each other, creating cycles

**Mitigation:**

- Use interfaces for dependencies
- Dependency injection in constructor
- Clear dependency hierarchy:
  ```
  ServerCoordinator (no coordinator deps)
    ↑
  ProjectCoordinator (depends on Server)
    ↑
  SessionCoordinator (depends on Server, Project)
    ↑
  ConfigCoordinator (depends on Server, Project)
    ↑
  McpCoordinator (depends on Session, Project)
  ```

**Rollback:** Merge coordinators that have circular deps

#### 3. Event Handling

**Risk:** Events might not propagate correctly through coordinators

**Mitigation:**

- `ProjectCoordinator` emits events directly (has EventEmitter reference)
- Other coordinators don't emit, they call project methods
- Document event flow clearly

**Rollback:** Move event emission back to facade

#### 4. Backward Compatibility

**Risk:** Breaking existing code that uses [`Toji`](src/main/toji/index.ts:60)

**Mitigation:**

- Maintain all public methods in facade
- Expose legacy managers as public properties
- Comprehensive integration tests
- Gradual migration with feature flags

**Rollback:** Keep facade methods, remove coordinators

### Medium Risk Areas

#### 5. Performance Overhead

**Risk:** Extra delegation layer might slow operations

**Mitigation:**

- Coordinators are thin wrappers
- No extra async operations
- Benchmark critical paths
- Optimize hot paths if needed

**Rollback:** Inline coordinator methods if performance degrades

#### 6. Testing Complexity

**Risk:** More classes = more tests to maintain

**Mitigation:**

- Clear test structure per coordinator
- Shared test utilities
- Mock factories for dependencies
- Focus on integration tests for workflows

**Rollback:** Reduce test coverage if maintenance burden too high

### Low Risk Areas

#### 7. Documentation Drift

**Risk:** Docs might not reflect new architecture

**Mitigation:**

- Update docs in same PR as code
- Add architecture diagrams
- Create migration guide
- Code examples in docs

---

## Code Examples

### Before: Monolithic Chat Method

```typescript
// Current: In Toji class (Lines 257-319)
async chat(message: string, sessionId?: string): Promise<string> {
  loggerChat.debug('Chat request: message="%s", sessionId=%s', message, sessionId || 'auto')

  const client = this.getClient()
  if (!client) {
    const error = new Error('Client not connected to server')
    loggerChat.error('Chat failed - no client connected: %s', error.message)
    throw error
  }

  try {
    // Get or create session using SessionManager
    let activeSessionId = sessionId
    if (!activeSessionId && this.currentProjectDirectory) {
      activeSessionId = this.sessions.getActiveSession(this.currentProjectDirectory)
    }

    if (!activeSessionId) {
      loggerChat.debug(
        'Creating new session for project: %s',
        this.currentProjectDirectory || 'unknown'
      )
      const sessionInfo = await this.sessions.createSession(
        client,
        undefined,
        this.currentProjectDirectory
      )
      activeSessionId = sessionInfo.id
      if (this.currentProjectDirectory) {
        this.sessions.setActiveSession(activeSessionId, this.currentProjectDirectory)
      }
      loggerChat.debug('Created session: %s', activeSessionId)
    }

    // Send message to session
    loggerChat.debug('Sending message to session %s', activeSessionId)
    const response = await client.session.prompt({
      path: { id: activeSessionId },
      body: {
        parts: [{ type: 'text', text: message }]
      },
      query: this.currentProjectDirectory
        ? { directory: this.currentProjectDirectory }
        : undefined
    })

    // Extract text from response parts
    let responseText = ''
    if (response && 'parts' in response) {
      const parts = (response as { parts: Part[] }).parts
      responseText = parts
        .filter((part: Part) => part.type === 'text')
        .map((part: Part) => (part as { text: string }).text)
        .join('')
    }

    loggerChat.debug('Chat response received: %d characters', responseText.length)
    return responseText
  } catch (error) {
    loggerChat.error('Chat failed: %o', error)
    throw error
  }
}
```

### After: Coordinator-Based Architecture

```typescript
// ============================================================
// SessionCoordinator (src/main/toji/coordinators/session-coordinator.ts)
// ============================================================

export class SessionCoordinator implements ISessionCoordinator {
  private readonly logger = createLogger('toji:session-coordinator')

  constructor(
    private readonly server: ServerCoordinator,
    private readonly project: ProjectCoordinator,
    private readonly sessionManager: SessionManager,
    private readonly config?: ConfigProvider
  ) {}

  async chat(message: string, sessionId?: string): Promise<string> {
    this.logger.debug('Chat request: message="%s", sessionId=%s', message, sessionId || 'auto')

    const client = this.server.getClient()
    if (!client) {
      throw new Error('Client not connected to server')
    }

    const activeSessionId = await this.getOrCreateSession(client, sessionId)
    const projectDir = this.project.getCurrentProjectDirectory()

    this.logger.debug('Sending message to session %s', activeSessionId)
    const response = await client.session.prompt({
      path: { id: activeSessionId },
      body: { parts: [{ type: 'text', text: message }] },
      query: projectDir ? { directory: projectDir } : undefined
    })

    return this.extractTextFromResponse(response)
  }

  private async getOrCreateSession(client: OpencodeClient, sessionId?: string): Promise<string> {
    const projectDir = this.project.getCurrentProjectDirectory()

    // Try provided session ID
    if (sessionId) {
      return sessionId
    }

    // Try active session for current project
    if (projectDir) {
      const activeSession = this.sessionManager.getActiveSession(projectDir)
      if (activeSession) {
        return activeSession
      }
    }

    // Create new session
    this.logger.debug('Creating new session for project: %s', projectDir || 'unknown')
    const sessionInfo = await this.sessionManager.createSession(client, undefined, projectDir)

    if (projectDir) {
      this.sessionManager.setActiveSession(sessionInfo.id, projectDir)
    }

    this.logger.debug('Created session: %s', sessionInfo.id)
    return sessionInfo.id
  }

  private extractTextFromResponse(response: unknown): string {
    if (!response || typeof response !== 'object' || !('parts' in response)) {
      return ''
    }

    const parts = (response as { parts: Part[] }).parts
    return parts
      .filter((part: Part) => part.type === 'text')
      .map((part: Part) => (part as { text: string }).text)
      .join('')
  }
}

// ============================================================
// Toji Facade (src/main/toji/index.ts)
// ============================================================

export class Toji extends EventEmitter {
  public readonly session: SessionCoordinator
  public readonly project: ProjectCoordinator
  public readonly server: ServerCoordinator
  public readonly config: ConfigCoordinator
  public readonly mcp: McpCoordinator

  // Legacy properties for backward compatibility
  public readonly sessions: SessionManager
  public readonly projectInitializer: ProjectInitializer
  public readonly configManager: ConfigManager
  public readonly clientManager: ClientManager

  constructor(opencodeService: OpenCodeService, config?: ConfigProvider) {
    super()

    // Create coordinators
    this.server = new ServerCoordinator(opencodeService, config)
    this.project = new ProjectCoordinator(this.server, config, this)
    this.session = new SessionCoordinator(this.server, this.project, new SessionManager(), config)
    this.config = new ConfigCoordinator(this.server, this.project, config)
    this.mcp = new McpCoordinator(this.session, this.project)

    // Expose legacy managers
    this.sessions = this.session.sessionManager
    this.projectInitializer = this.project.projectInitializer
    this.configManager = this.config.configManager
    this.clientManager = this.server.clientManager
  }

  // ============================================================
  // Delegation Methods (Backward Compatible)
  // ============================================================

  async chat(message: string, sessionId?: string): Promise<string> {
    return this.session.chat(message, sessionId)
  }

  async chatStreaming(
    message: string,
    callbacks: StreamCallbacks,
    sessionId?: string
  ): Promise<void> {
    return this.session.chatStreaming(message, callbacks, sessionId)
  }

  async switchToProject(projectPath: string): Promise<{ success: boolean; projectPath: string }> {
    return this.project.switchToProject(projectPath)
  }

  async getProjectConfig(): Promise<OpencodeConfig> {
    return this.config.getProjectConfig()
  }

  registerMCPService<T>(name: string, service: T): void {
    this.mcp.registerMCPService(name, service)
  }

  // ... more delegation methods ...
}
```

### Usage Example: No Breaking Changes

```typescript
// Before and After: Identical usage
const toji = new Toji(opencodeService, config)

// All existing code works unchanged
await toji.switchToProject('/my-project')
const response = await toji.chat('Hello, world!')
const config = await toji.getProjectConfig()

// New: Can also access coordinators directly for advanced usage
await toji.session.createSession('My Session')
await toji.project.initializeProject()
await toji.config.updatePermissions({ edit: 'ask' })
```

---

## Implementation Checklist

### Phase 1: Interfaces ✓

- [ ] Create `coordinators/interfaces.ts`
- [ ] Create `coordinators/types.ts`
- [ ] Define all coordinator interfaces
- [ ] Team review and approval

### Phase 2: SessionCoordinator

- [ ] Create `session-coordinator.ts`
- [ ] Implement `ISessionCoordinator`
- [ ] Extract methods from [`Toji`](src/main/toji/index.ts:60)
- [ ] Add unit tests (90%+ coverage)
- [ ] Add integration tests
- [ ] Update [`Toji`](src/main/toji/index.ts:60) to delegate
- [ ] Manual testing
- [ ] Performance benchmarks

### Phase 3: ServerCoordinator

- [ ] Create `server-coordinator.ts`
- [ ] Implement `IServerCoordinator`
- [ ] Extract methods from [`Toji`](src/main/toji/index.ts:60)
- [ ] Add unit tests
- [ ] Update `SessionCoordinator` dependency
- [ ] Integration tests
- [ ] Manual testing

### Phase 4: ProjectCoordinator

- [ ] Create `project-coordinator.ts`
- [ ] Implement `IProjectCoordinator`
- [ ] Extract methods from [`Toji`](src/main/toji/index.ts:60)
- [ ] Implement event emission
- [ ] Add unit tests
- [ ] Integration tests
- [ ] Manual testing

### Phase 5: ConfigCoordinator

- [ ] Create `config-coordinator.ts`
- [ ] Implement `IConfigCoordinator`
- [ ] Extract methods from [`Toji`](src/main/toji/index.ts:60)
- [ ] Add unit tests
- [ ] Integration tests
- [ ] Manual testing

### Phase 6: McpCoordinator

- [ ] Create `mcp-coordinator.ts`
- [ ] Implement `IMcpCoordinator`
- [ ] Extract methods from [`Toji`](src/main/toji/index.ts:60)
- [ ] Add unit tests
- [ ] Integration tests
- [ ] Manual testing

### Phase 7: Facade Refactor

- [ ] Remove business logic from [`Toji`](src/main/toji/index.ts:60)
- [ ] Keep only delegation
- [ ] Remove legacy methods
- [ ] Full integration test suite
- [ ] Performance validation
- [ ] Code review

### Phase 8: Documentation

- [ ] Update architecture docs
- [ ] Add coordinator usage examples
- [ ] Create migration guide
- [ ] Update API documentation
- [ ] Final code review
- [ ] Release notes

---

## Success Metrics

### Code Quality

- **Lines of Code:** 1169 → ~250 (facade) + ~1250 (coordinators) = ~1500 total
- **Cyclomatic Complexity:** Reduce from 45+ to <10 per method
- **Test Coverage:** Maintain or improve from current baseline
- **Code Duplication:** Eliminate duplicated logic

### Maintainability

- **Single Responsibility:** Each coordinator has one clear purpose
- **Dependency Clarity:** Clear dependency graph, no cycles
- **Testability:** Each coordinator independently testable
- **Documentation:** Complete interface documentation

### Performance

- **Chat Latency:** No increase (< 5ms overhead)
- **Project Switch:** No increase (< 10ms overhead)
- **Memory Usage:** Potential 10-15% reduction
- **Startup Time:** No change

### Developer Experience

- **Onboarding:** New developers understand architecture faster
- **Feature Development:** Easier to add features to specific coordinators
- **Bug Fixing:** Easier to isolate and fix issues
- **Code Review:** Smaller, focused PRs

---

## Conclusion

This refactoring design provides a clear path to transform the monolithic [`Toji`](src/main/toji/index.ts:60) class into a maintainable, testable architecture while maintaining 100% backward compatibility. The phased approach allows for incremental progress with rollback points at each phase.

**Key Benefits:**

- ✅ Single Responsibility Principle enforced
- ✅ Clear separation of concerns
- ✅ Improved testability
- ✅ Better maintainability
- ✅ No breaking changes
- ✅ Reduced complexity per class
- ✅ Clear dependency hierarchy

**Next Steps:**

1. Review and approve this design
2. Create GitHub issues for each phase
3. Begin Phase 1: Interface definitions
4. Proceed with incremental implementation

---

## Appendix: Dependency Injection Pattern

### Constructor Injection Example

```typescript
export class SessionCoordinator implements ISessionCoordinator {
  constructor(
    private readonly server: ServerCoordinator,
    private readonly project: ProjectCoordinator,
    private readonly sessionManager: SessionManager,
    private readonly config?: ConfigProvider
  ) {
    // All dependencies injected, no hidden dependencies
    // Easy to mock for testing
    // Clear what this coordinator needs
  }
}
```

### Benefits:

- **Testability:** Easy to inject mocks
- **Clarity:** Dependencies explicit in constructor
- **Flexibility:** Can swap implementations
- **No Hidden State:** All dependencies visible

### Testing Example:

```typescript
const mockServer = createMockServerCoordinator()
const mockProject = createMockProjectCoordinator()
const mockSessionManager = createMockSessionManager()

const coordinator = new SessionCoordinator(mockServer, mockProject, mockSessionManager, mockConfig)

// Now test coordinator with full control over dependencies
```

---

**Document Version:** 1.0
**Last Updated:** 2025-10-27
**Author:** Kilo Code (Architect Mode)
**Status:** Ready for Review
