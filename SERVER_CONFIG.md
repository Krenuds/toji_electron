# Server Configuration Architecture

## Core Principle: One Server Per Workspace

Each workspace gets its own dedicated OpenCode server instance with workspace-specific configuration.

## Architecture Overview

### 1. Server Lifecycle Management

```typescript
// When changing workspace
async changeWorkspace(directory: string) {
  // 1. Stop current server if running
  if (this.server.isRunning()) {
    await this.server.stop();
  }

  // 2. Load workspace config
  const workspaceConfig = this.config.getWorkspaceSettings(directory);

  // 3. Start new server with workspace config
  await this.server.start({
    port: await this.getAvailablePort(),
    config: workspaceConfig.opencodeConfig || defaultConfig
  });

  // 4. Connect client to new server
  await this.client.connect(this.server.getUrl());
}
```

### 2. Configuration Storage Structure

```typescript
interface WorkspaceSettings {
  // OpenCode Server Config (passed to createOpencodeServer)
  opencodeConfig?: {
    model?: string
    theme?: string
    username?: string
    agent?: Record<string, any>
    provider?: Record<string, any>
    instructions?: string[]
    permission?: {
      edit?: boolean
      bash?: boolean
      webFetch?: boolean
    }
  }

  // Toji UI Settings
  ui?: {
    sidebarWidth?: number
    sidebarCollapsed?: boolean
    lastActiveView?: string
    customLabel?: string
    customIcon?: string
  }

  // Session Management
  session?: {
    preferredSessionId?: string
    autoCreate?: boolean
    preserveOnRestart?: boolean
  }
}
```

### 3. Configuration Update Flow

When user changes configuration mid-session:

```typescript
async updateWorkspaceConfig(path: string, newConfig: Partial<WorkspaceSettings>) {
  // 1. Save config
  this.config.setWorkspaceSettings(path, newConfig);

  // 2. Get current session ID (if preserving)
  const currentSessionId = this.session.getCurrentSession()?.id;

  // 3. Stop server
  await this.server.stop();

  // 4. Restart with new config
  await this.server.start({
    port: await this.getAvailablePort(),
    config: newConfig.opencodeConfig
  });

  // 5. Reconnect client
  await this.client.connect(this.server.getUrl());

  // 6. Resume session if configured
  if (currentSessionId && newConfig.session?.preserveOnRestart) {
    await this.session.setCurrentSession(currentSessionId);
  }
}
```

## Implementation Requirements

### Phase 1: Minimal Stub (For PLAN.md Step 3)

1. **ConfigProvider.ts**

   ```typescript
   getWorkspaceSettings(path: string): WorkspaceSettings
   setWorkspaceSettings(path: string, settings: WorkspaceSettings): void
   ```

2. **ServerManager.ts**
   - Add config parameter to `start()` method
   - Store current workspace path

3. **Toji API**
   - `getWorkspaceSettings(path: string)`
   - `setWorkspaceSettings(path: string, settings: WorkspaceSettings)`

### Phase 2: Full Implementation (Post-PLAN.md)

1. **Dynamic Server Management**
   - Port allocation strategy
   - Server health monitoring
   - Graceful shutdown/restart

2. **Configuration UI**
   - Model selector per workspace
   - Permission toggles
   - Agent configuration

3. **Session Preservation**
   - Save session state before restart
   - Restore after configuration change
   - Handle interrupted operations

## Key Design Decisions

### Why One Server Per Workspace?

1. **Isolation** - Each workspace has completely independent configuration
2. **Simplicity** - No complex config merging or switching logic
3. **Performance** - Server optimized for specific workspace needs
4. **Security** - Workspace permissions don't leak between projects

### Configuration Precedence

1. Programmatic config (passed to `createOpencodeServer`)
2. Workspace `opencode.json` file (if exists)
3. Global config (`~/.config/opencode/opencode.json`)
4. Built-in defaults

### Port Management Strategy

- Base port: 2048
- Workspace ports: 2049-2148 (100 workspace slots)
- Fallback: Find next available port
- Store port assignments in ConfigProvider

## Testing Strategy

1. **Unit Tests**
   - Config storage/retrieval
   - Port allocation
   - Server lifecycle

2. **Integration Tests**
   - Workspace switching with server restart
   - Config updates mid-session
   - Session preservation

3. **Manual Testing**
   - Multiple workspaces with different models
   - Config changes during active chat
   - Server crash recovery

## Migration Path

### From Current Single-Server Architecture

1. **Step 1**: Add config parameter to ServerManager.start()
2. **Step 2**: Store workspace settings in ConfigProvider
3. **Step 3**: Restart server on workspace change
4. **Step 4**: Add UI for configuration

### Backward Compatibility

- If no workspace config exists, use defaults
- Existing workspaces continue working
- Gradual opt-in to workspace configs

## Future Enhancements

1. **Config Templates**
   - Pre-defined configs for different project types
   - Team-shared configuration presets

2. **Hot Reload**
   - Some config changes without server restart
   - Intelligent restart detection

3. **Multi-Server Optimization**
   - Lazy server startup
   - Server pooling for quick switching
   - Resource management for many workspaces

## Summary

The server configuration architecture enables true workspace isolation by:

- Creating dedicated server instances per workspace
- Storing workspace-specific OpenCode configurations
- Seamlessly restarting servers when configs change
- Preserving session context across restarts

This approach aligns with PLAN.md while setting up a robust foundation for advanced workspace management.
