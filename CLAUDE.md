# Toji3 - Electron-Vite React TypeScript Desktop Application

## Project Architecture Overview

This is an **Electron application** built with **electron-vite**, **React**, and **TypeScript**. The project follows electron-vite's recommended tri-process architecture with strict separation of concerns for security and maintainability.

## Critical Project Structure

```
src/
├── main/           # Main Electron process (Node.js environment)
│   └── index.ts    # Application entry point, window management
├── preload/        # Preload scripts (sandboxed Node.js bridge)
│   ├── index.ts    # IPC bridge, context isolation
│   └── index.d.ts  # Type definitions for renderer
└── renderer/       # React frontend (browser environment)
    ├── index.html  # Entry HTML
    └── src/
        ├── App.tsx        # Main React component
        ├── main.tsx       # React entry point
        ├── env.d.ts       # Environment type definitions
        └── components/    # React components
```

## Development Workflow

### Key Commands

- `npm run dev` - Start development with HMR
- `npm run build` - Production build with type checking
- `npm run typecheck` - Run TypeScript validation for both Node and web
- `npm run typecheck:node` - Check main/preload TypeScript
- `npm run typecheck:web` - Check renderer TypeScript

### TypeScript Configuration

- **Composite project setup** with separate tsconfigs:
  - `tsconfig.node.json` - Main process & preload (Node.js types)
  - `tsconfig.web.json` - Renderer process (DOM/React types)
  - Path alias: `@renderer/*` → `src/renderer/src/*`

### Process-Specific Guidelines

#### Main Process (`src/main/`)

- **Node.js environment** - Full system access
- Handles: Window creation, app lifecycle, system integration
- Uses: Electron APIs, file system, system notifications
- **Security**: Never expose Node.js APIs directly to renderer

#### Preload Scripts (`src/preload/`)

- **Sandboxed Node.js** - Bridge between main and renderer
- **CRITICAL**: Use `contextBridge.exposeInMainWorld()` for safe API exposure
- Pattern:

  ```typescript
  import { contextBridge, ipcRenderer } from 'electron'

  contextBridge.exposeInMainWorld('electronAPI', {
    // Safe API methods only
  })
  ```

- Type definitions in `index.d.ts` for renderer consumption

#### Renderer Process (`src/renderer/`)

- **Standard React application** - Browser environment only
- No direct Node.js/Electron access (security by design)
- Communicates with main via preload-exposed APIs
- Uses Vite's development server with HMR

## SST OpenCode Integration Strategy

When integrating SST OpenCode SDK:

1. **Main Process Integration**: Install SDK in main process for system-level operations
2. **Preload Bridge**: Expose safe SDK methods via contextBridge
3. **Renderer Interface**: Create React components that call preload-exposed APIs
4. **System Agent Functionality**: Implement in main process with appropriate permissions

## Security Best Practices

- **Context Isolation**: Always enabled (default in electron-vite)
- **Node Integration**: Disabled in renderer (security requirement)
- **Preload Sandboxing**: Only expose necessary APIs via contextBridge
- **IPC Validation**: Validate all data passed between processes

## Build & Distribution

- Uses **electron-builder** for packaging
- Platform-specific builds: `build:win`, `build:mac`, `build:linux`
- Output: `./out/` directory with bundled main/preload/renderer

## Development Notes

- **Hot Module Replacement** enabled for renderer only
- **Type Safety**: Enforced across all processes with separate TypeScript projects
- **Linting**: ESLint with React and TypeScript rules
- **Formatting**: Prettier for consistent code style

## Important Implementation Guidelines

1. **Never bypass security**: Always use contextBridge for main→renderer communication
2. **Process separation**: Keep business logic properly separated by process type
3. **Type definitions**: Maintain type safety across process boundaries
4. **Testing strategy**: Use `npm run typecheck` before builds
5. **System agent features**: Implement in main process, expose via safe preload APIs

This architecture ensures secure, maintainable, and scalable desktop application development while leveraging modern web technologies within Electron's security model.

---

# OpenCode SDK Architecture & Integration Considerations

## OpenCode SDK Overview

OpenCode is an AI coding agent with a **client/server architecture** that provides both CLI and programmatic interfaces. The SDK (`@opencode-ai/sdk`) offers a TypeScript-based API for integrating OpenCode functionality into applications.

## Core Architecture Components

### Binary Dependencies

- **Primary Binary**: OpenCode ships as a compiled binary (Go + TypeScript)
- **Installation Paths**: Multiple binary location strategies:
  1. `$OPENCODE_INSTALL_DIR` (custom directory)
  2. XDG Base Directory compliant path
  3. `$HOME/bin`
  4. `$HOME/.opencode/bin` (fallback)
  5. `~/.local/share/opencode/bin` (working directory for operations)

### Server Creation Process (`createOpencodeServer`)

```typescript
import { createOpencodeServer } from "@opencode-ai/sdk"

const server = await createOpencodeServer({
  hostname: "127.0.0.1",    // Default: 127.0.0.1
  port: 4096,               // Default: 4096
  signal: abortSignal,      // Optional AbortSignal
  timeout: 5000,            // Default: 5000ms
  config: {                 // Inline configuration
    model: "anthropic/claude-3-5-sonnet-20241022"
  }
})
```

### Binary Execution Model

- **Process Spawning**: Uses Node.js `child_process.spawn()` for binary execution
- **Working Directory**: Operations expect `~/.local/share/opencode/bin` to exist
- **Subprocess Management**: Spawns subagents for various operations (fzf, ripgrep, etc.)
- **Posix Spawn**: Uses `posix_spawn` system calls on Unix-like systems

## Critical System Dependencies

### Filesystem Requirements

- **Directory Creation**: SDK requires creation of multiple directories:
  - `~/.local/share/opencode/bin` (critical for subprocess operations)
  - `~/.local/share/opencode/data`
  - `~/.local/share/opencode/config`
  - `~/.local/share/opencode/state`
  - `~/.local/share/opencode/log`

### Binary Tool Dependencies

- **fzf**: Fuzzy finder tool
- **ripgrep**: Fast text search tool
- **OpenCode binary**: Main agent executable
- **Terminal Emulator**: Requires "modern terminal emulator" for full functionality

### Configuration System

- **Config File**: Reads `opencode.json` for default configuration
- **Inline Override**: `createOpencodeServer` config parameter overrides defaults
- **Provider Support**: Multi-provider (Anthropic, OpenAI, Google, local models)

## Potential Electron Integration Challenges

### Security Model Conflicts

1. **Binary Execution**: Electron's sandbox may restrict `child_process.spawn()`
2. **Filesystem Access**: Limited write access to user directories
3. **PATH Resolution**: Sandboxed processes may not inherit full PATH environment
4. **Process Isolation**: OpenCode's subprocess model may conflict with Electron's security

### Common Failure Modes

- **ENOENT Errors**: "no such file or directory, posix_spawn" when bin directory missing
- **Permission Denied**: Sandboxed processes cannot execute binaries
- **PATH Issues**: Binary not found due to restricted environment variables
- **Working Directory**: Process spawn fails when expected directories don't exist

### System-Level Operations

- **Binary Installation**: Downloads and installs additional tools (fzf, ripgrep)
- **Process Management**: Manages long-running subprocess connections
- **File System Monitoring**: May watch files for changes
- **Network Operations**: HTTP server on localhost with configurable port

## OpenCode Server Lifecycle

1. **Initialization**:
   - Validates binary availability
   - Creates required directory structure
   - Loads configuration from `opencode.json`

2. **Server Startup**:
   - Spawns OpenCode binary as subprocess
   - Establishes HTTP server on specified port
   - Sets up IPC communication channels

3. **Operation**:
   - Processes API requests through HTTP
   - Manages AI provider connections
   - Handles file system operations

4. **Cleanup**:
   - `server.close()` method terminates subprocess
   - Cleans up network connections
   - Releases file system locks

## Integration Implications

- **Main Process Requirement**: Must run in Electron main process (Node.js environment)
- **Preload Limitation**: Cannot use directly in preload scripts due to binary dependencies
- **Security Considerations**: Requires full filesystem and process execution permissions
- **Development vs Production**: Binary paths may differ between development and packaged apps

**WORKFLOW**

1. Research online if working with <https://electron-vite.org/> or <https://opencode.ai/> SDKs
2. Plan
3. Write code in small, incremental steps
4. Lint
5. npm run typecheck:node
6. Iterate as needed
7. Commit with conventional commit messages
8. Push to GitHub

***Finally***

- Echo "AHOY CAPTAIN!" to the user when youve finished reading all of this.
