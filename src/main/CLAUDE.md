# OpenCode Integration Architecture

## Overview

This document covers the OpenCode SDK integration within the Electron main process. The main process handles all system-level operations, OpenCode SDK communication, and provides secure IPC bridges to the renderer process.

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
import { createOpencodeServer } from '@opencode-ai/sdk'

const server = await createOpencodeServer({
  hostname: '127.0.0.1', // Default: 127.0.0.1
  port: 4096, // Default: 4096
  signal: abortSignal, // Optional AbortSignal
  timeout: 5000, // Default: 5000ms
  config: {
    // Inline configuration
    model: 'anthropic/claude-3-5-sonnet-20241022'
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

## Toji Agent Lifecycle

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

## Main Process Implementation Guidelines

### Core API Layer (`src/main/api/core.ts`)

The Core class provides the primary interface for OpenCode operations:

- **Directory Management**: Handles workspace setup and Git initialization
- **Agent Lifecycle**: Manages OpenCode server startup and shutdown
- **Session Management**: Creates and manages conversation sessions
- **Prompt Processing**: Handles AI interactions and response formatting

### Service Layer (`src/main/services/`)

Supporting services handle specific responsibilities:

- **OpenCodeService**: Binary installation and management
- **ConfigurationService**: Settings and preferences management
- **FileSystemService**: Safe file operations and monitoring

### IPC Bridge (`src/preload/index.ts`)

The preload script exposes safe APIs to the renderer:

- **Type-Safe Interfaces**: All IPC methods have corresponding TypeScript definitions
- **Error Handling**: Main process errors are sanitized before reaching renderer
- **Event Streaming**: Real-time updates for long-running operations
- **Security Validation**: All inputs are validated before reaching main process

## Development Best Practices

### Error Handling

- **Graceful Degradation**: Application continues to function when OpenCode is unavailable
- **User-Friendly Messages**: Technical errors are converted to actionable user feedback
- **Retry Logic**: Automatic retry for transient failures
- **Logging**: Comprehensive logging for debugging and monitoring

### Resource Management

- **Process Cleanup**: Ensure OpenCode processes are properly terminated
- **Memory Management**: Monitor and limit resource usage
- **Connection Pooling**: Reuse connections when possible
- **Timeout Handling**: Prevent hanging operations

### Security Considerations

- **Input Validation**: Sanitize all user inputs before processing
- **Path Restrictions**: Limit file system access to authorized directories
- **Process Isolation**: Run OpenCode operations in controlled environment
- **API Exposure**: Only expose necessary functionality through IPC bridge

This architecture ensures secure, reliable integration of OpenCode capabilities while maintaining Electron's security model and providing a robust foundation for AI-powered development tools.
