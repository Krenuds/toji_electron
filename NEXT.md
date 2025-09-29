# Toji3 Development Session - Configuration & Permissions

## Session Overview: Runtime Configuration Management

This session focused on building the foundation for runtime configuration management in Toji3, with a specific emphasis on permission controls. The work establishes a clean backend API that both the Electron UI and Discord bot can use to manage OpenCode's behavior.

## The Configuration Problem

### What We Discovered

When we started looking at how configuration flows through Toji3, we found something interesting: **we weren't actually passing configuration to OpenCode servers**. Here's what was happening:

```typescript
// src/main/index.ts:136
await toji.server.start(undefined, lastProject)  // ← undefined config!

// src/main/toji/server.ts:424
OPENCODE_CONFIG_CONTENT: JSON.stringify(opts.config ?? {})  // ← always "{}"
```

The OpenCode binary was falling back to its own configuration hierarchy:
1. Check for `opencode.json` in project directory
2. Use global config at `~/.config/opencode/opencode.json`
3. Use internal defaults

This worked, but meant Toji3 had no programmatic control over OpenCode's behavior.

### The SDK Already Has Everything

The breakthrough came when we checked the OpenCode SDK's type definitions. The `@opencode-ai/sdk` package exports a complete `Config` type with **everything** we need:

```typescript
// From node_modules/@opencode-ai/sdk/dist/gen/types.gen.d.ts
export type Config = {
  model?: string;
  small_model?: string;
  instructions?: Array<string>;
  share?: 'manual' | 'auto' | 'disabled';
  autoupdate?: boolean;
  permission?: {
    edit?: "ask" | "allow" | "deny";
    bash?: ("ask" | "allow" | "deny") | {
      [key: string]: "ask" | "allow" | "deny";
    };
    webfetch?: "ask" | "allow" | "deny";
  };
  // ... plus theme, keybinds, formatters, lsp, mcp, agents, etc.
}
```

We were reinventing the wheel with our custom `OpencodeConfig` interface. The SDK already provides the complete type definition.

## Understanding OpenCode Permissions

### The Three Permission Types

OpenCode controls AI agent behavior through three permission categories:

1. **`permission.edit`** - Controls file editing operations
   - `"allow"` - AI can edit files without asking
   - `"ask"` - Prompt user before each edit
   - `"deny"` - **Hides** editing tools from AI completely

2. **`permission.bash`** - Controls shell command execution
   - Simple form: `"allow" | "ask" | "deny"`
   - Granular form: Pattern-based rules
   ```json
   {
     "bash": {
       "git status": "allow",
       "git push": "ask",
       "terraform *": "deny",
       "*": "ask"  // default for unmatched commands
     }
   }
   ```

3. **`permission.webfetch`** - Controls network requests
   - Same three levels: allow/ask/deny

### How Permissions Work

**Key insight**: Setting a permission to `"deny"` doesn't just block the action - it **completely hides the tool from the AI**. The AI model never even sees that the tool exists. This is more secure than just blocking at execution time.

**Hierarchical Configuration**: Permissions can be set globally or overridden per-agent:

```json
{
  "permission": {
    "edit": "ask",      // Global: ask before all edits
    "bash": "allow"
  },
  "agent": {
    "plan": {
      "permission": {
        "edit": "deny"  // Planning agent can't edit files at all
      }
    }
  }
}
```

Agent-level permissions **merge over** global settings, not replace them.

## Implementation Architecture

### Backend-First Design

Following Toji3's architecture principles, all business logic lives in the backend:

**Main Process (Backend)**
- `src/main/toji/config.ts` - Type definitions (using SDK types)
- `src/main/toji/index.ts` - Business logic methods
- `src/main/handlers/toji.handlers.ts` - IPC handlers

**Plugins (Frontend)**
- Electron UI - Will render routing matrix with radio buttons
- Discord Bot - Will provide text-based permission commands
- Both call the **same IPC handlers** - no duplicate logic

### What We Built

**1. Type System Cleanup** (`src/main/toji/config.ts`)

```typescript
import type { Config } from '@opencode-ai/sdk'

// Re-export SDK type for convenience
export type { Config as OpencodeConfig }

// Helper types for permission management
export type PermissionLevel = 'ask' | 'allow' | 'deny'
export type PermissionType = 'edit' | 'bash' | 'webfetch'
export type PermissionConfig = NonNullable<Config['permission']>
```

Removed our custom interface and used the SDK's native types. This ensures type safety and keeps us aligned with OpenCode's actual schema.

**2. Toji Class Methods** (`src/main/toji/index.ts`)

```typescript
// Get current configuration from OpenCode
async getProjectConfig(): Promise<Config>

// Update full configuration and restart server
async updateProjectConfig(config: Config): Promise<void>

// Permission-specific methods
async getPermissions(): Promise<PermissionConfig>
async updatePermissions(permissions: Partial<PermissionConfig>): Promise<void>
async setPermission(type: PermissionType, level: PermissionLevel): Promise<void>
```

**How it works:**
1. `getProjectConfig()` calls `client.config.get()` to retrieve current config from OpenCode
2. `updateProjectConfig()` restarts the server with new config via `OPENCODE_CONFIG_CONTENT` env var
3. Permission methods are convenience wrappers that merge changes with existing config

**3. IPC Handlers** (`src/main/handlers/toji.handlers.ts`)

```typescript
ipcMain.handle('toji:getConfig', ...)
ipcMain.handle('toji:updateConfig', ...)
ipcMain.handle('toji:getPermissions', ...)
ipcMain.handle('toji:updatePermissions', ...)
ipcMain.handle('toji:setPermission', ...)
```

Each handler:
- Checks if `toji.isReady()` (has active project)
- Calls corresponding Toji method
- Returns result or throws error

## Configuration Flow

### How Config Actually Reaches OpenCode

The configuration hierarchy OpenCode uses (highest to lowest precedence):

1. **Runtime config via `OPENCODE_CONFIG_CONTENT`** ← This is what Toji3 controls
2. Custom config path via `OPENCODE_CONFIG` environment variable
3. Project config - `opencode.json` in project root
4. Global config - `~/.config/opencode/opencode.json`
5. SDK defaults - Built into OpenCode binary

When Toji3 calls `server.restart(config)`, here's what happens:

```typescript
// src/main/toji/server.ts:419-426
const proc = spawn(binaryPath, ['serve', '--hostname=...', '--port=...'], {
  cwd: opts.cwd,  // Project directory
  env: {
    ...process.env,
    OPENCODE_CONFIG_CONTENT: JSON.stringify(opts.config ?? {})  // ← Config passed here
  }
})
```

The OpenCode binary reads `OPENCODE_CONFIG_CONTENT` on startup and merges it with other config sources. This gives us **runtime control** without requiring file modifications.

## Why This Matters

### Before This Session
- No programmatic config control
- Relied entirely on OpenCode finding `opencode.json` files
- No way to change settings without restarting app
- Custom config types that didn't match SDK reality

### After This Session
- Full runtime configuration management
- Type-safe using SDK's native types
- Can query current config from OpenCode
- Can update config and restart server seamlessly
- Foundation for permission management UI
- Same backend API for both Electron and Discord

## Simple Configuration Options (Testing Candidates)

During research, we identified configuration options that **don't require API keys** - perfect for testing:

**Simplest:**
1. `autoupdate: boolean` - Control automatic updates
2. `share: "manual" | "auto" | "disabled"` - Session sharing behavior
3. `permission.edit: "ask" | "allow" | "deny"` - File editing permissions

**More Complex:**
- `instructions: string[]` - Additional instruction files
- `permission.bash` - Granular command patterns
- Per-agent configurations

## Next Steps

### Immediate: UI Implementation

**Electron UI** - Routing matrix component:
```
             Allow    Ask    Deny
Edit          ( )     (•)    ( )
Bash          (•)     ( )    ( )
WebFetch      ( )     (•)    ( )
```

Using Chakra UI v3 components with:
- Custom hook `usePermissions()` to call IPC handlers
- Radio button group for each permission type
- Real-time updates (server restart on change)

**Discord Bot** - Text commands:
```
/permissions view
/permissions set edit ask
/permissions set bash deny
```

Same IPC handlers, different presentation.

### Future Enhancements

**Model Management**
- Query available models: `client.config.providers()`
- Switch models without app restart
- Per-project model preferences

**Advanced Permissions**
- Granular bash command patterns
- Per-agent permission overrides
- Permission presets (strict/balanced/permissive)

**Configuration Profiles**
- Save/load configuration presets
- Project templates with default configs
- Team-shared configurations

## Technical Notes

### Config Updates Restart Servers

When you call `updateProjectConfig()` or `updatePermissions()`, the server **restarts**. This is necessary because OpenCode reads config on startup. The restart is fast (~1-2 seconds) but there's a brief disconnection.

Future optimization: Check if config change actually requires restart. Some settings (like theme) might not need it.

### Bash Permission Complexity

For the initial UI, we're using simple string form for bash permissions (`"allow" | "ask" | "deny"`). The granular pattern-based rules are more complex:

```json
{
  "bash": {
    "git status": "allow",
    "npm install": "ask",
    "rm -rf *": "deny",
    "*": "ask"
  }
}
```

This will be a "Phase 2" feature with a dedicated rule editor UI.

### SDK Type Alignment

By using the SDK's native `Config` type, we get:
- Automatic updates when SDK updates
- IntelliSense for all config options
- Type safety across the entire stack
- No drift between our types and OpenCode's reality

This was a key architectural decision that saved us from future maintenance headaches.

## Conclusion

This session established the foundation for configuration management in Toji3. The backend API is complete, type-safe, and ready for both UI and Discord implementations. The permission system is our first use case, but the infrastructure supports **any** OpenCode configuration option.

The architecture maintains Toji3's principles:
- Backend owns business logic
- Plugins are thin presentation layers
- Type safety throughout
- Clean separation of concerns

Next session will focus on building the routing matrix UI component and integrating it into the Electron interface.