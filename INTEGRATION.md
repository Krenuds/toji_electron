# OpenCode + Electron Integration Guide

## Overview

This document outlines the essential steps for integrating the OpenCode AI coding agent SDK into an Electron application. The primary challenges are:

1. **Module System Mismatch**: OpenCode SDK is ES modules, Electron main process uses CommonJS
2. **Binary Distribution**: SDK expects `opencode` command in PATH, but Electron apps need embedded distribution
3. **Environment Configuration**: Multiple environment variables must be set correctly

## Critical Issue #1: ES Modules vs CommonJS

**Problem**: The `@opencode-ai/sdk` package uses ES modules, but Electron's main process runs in CommonJS mode.

**Solution**: Use electron-vite's bundling approach - exclude the SDK from externalization so it gets bundled into CommonJS format:

```typescript
// electron.vite.config.ts
export default defineConfig({
  main: {
    plugins: [externalizeDepsPlugin({ exclude: ['@opencode-ai/sdk'] })],
    resolve: {
      conditions: ['import', 'module', 'node', 'default']
    }
  }
})
```

**In Your Code**:
```typescript
// ✅ This works - static import, bundled by electron-vite
import { createOpencodeServer } from '@opencode-ai/sdk'

async startServer(): Promise<ServerStatus> {
  // Direct usage - no dynamic import needed
  this.server = await createOpencodeServer({
    hostname: this.config.hostname,
    port: this.config.port,
    config: { model: this.config.model }
  })
}
```

## Critical Issue #2: Binary Path Resolution

**Problem**: SDK calls `spawn('opencode', ...)` expecting the binary in PATH, but Electron apps need embedded distribution.

**Solution**: Set `OPENCODE_BIN_PATH` environment variable to direct binary path:

```typescript
// Download binary to app directory
const userData = app.getPath('userData')
const binaryName = process.platform === 'win32' ? 'opencode.exe' : 'opencode'
const binaryPath = join(userData, 'opencode-bin', binaryName)

// Tell SDK exactly where to find it
process.env.OPENCODE_BIN_PATH = binaryPath
```

## Critical Issue #3: Environment Configuration

**These environment variables are required**:

```typescript
const binaryName = process.platform === 'win32' ? 'opencode.exe' : 'opencode'
process.env.OPENCODE_BIN_PATH = `/path/to/${binaryName}`       // Direct binary path
process.env.OPENCODE_INSTALL_DIR = '/path/to/bin/dir'          // Tool installation
process.env.XDG_DATA_HOME = '/path/to/data/dir'                // Working directory
```

**Why Each Matters**:

- `OPENCODE_BIN_PATH`: SDK's primary binary lookup (bypasses PATH completely)
- `OPENCODE_INSTALL_DIR`: Where OpenCode installs additional tools (fzf, ripgrep)
- `XDG_DATA_HOME`: Working directory for sessions, config, logs

## Required Directory Structure

```text
userData/
├── opencode-bin/          (OPENCODE_INSTALL_DIR)
│   └── opencode(.exe)     (the binary - .exe on Windows)
└── opencode-data/         (XDG_DATA_HOME)
    ├── bin/               (CRITICAL - SDK expects this)
    ├── data/
    ├── config/
    ├── state/
    └── log/
```

**Critical**: The `bin/` subdirectory under `XDG_DATA_HOME` must exist or SDK fails.

## Implementation Template

```typescript
import { app } from 'electron'
import { join } from 'path'
import { existsSync, mkdirSync } from 'fs'
import { createOpencodeServer } from '@opencode-ai/sdk'

class OpenCodeManager {
  private binDir: string
  private dataDir: string

  constructor() {
    const userData = app.getPath('userData')
    this.binDir = join(userData, 'opencode-bin')
    this.dataDir = join(userData, 'opencode-data')
    this.setupEnvironment()
  }

  private setupEnvironment(): void {
    // Create ALL required directories
    const dirs = [
      this.binDir,
      join(this.dataDir, 'bin'),    // SDK expects this!
      join(this.dataDir, 'data'),
      join(this.dataDir, 'config'),
      join(this.dataDir, 'state'),
      join(this.dataDir, 'log')
    ]

    dirs.forEach(dir => {
      if (!existsSync(dir)) {
        mkdirSync(dir, { recursive: true })
      }
    })

    // Set environment variables BEFORE any SDK calls
    const binaryName = process.platform === 'win32' ? 'opencode.exe' : 'opencode'
    process.env.OPENCODE_BIN_PATH = join(this.binDir, binaryName)
    process.env.OPENCODE_INSTALL_DIR = this.binDir
    process.env.XDG_DATA_HOME = this.dataDir

    // CRITICAL: Add to PATH - SDK spawns 'opencode' command, not direct file path
    const currentPath = process.env.PATH || ''
    const pathSeparator = process.platform === 'win32' ? ';' : ':'
    if (!currentPath.includes(this.binDir)) {
      process.env.PATH = this.binDir + pathSeparator + currentPath
    }
  }

  async startServer(): Promise<{ url: string; close: () => void }> {
    await this.ensureBinary()

    // Static import - bundled by electron-vite
    return createOpencodeServer({
      hostname: '127.0.0.1',
      port: 4096,
      config: {
        model: 'anthropic/claude-3-5-sonnet-20241022'
      }
    })
  }

  private async downloadBinary(): Promise<void> {
    // Download from GitHub releases
    const platform = process.platform === 'win32' ? 'windows' : process.platform
    const arch = process.arch === 'x64' ? 'x64' : process.arch
    const url = `https://github.com/sst/opencode/releases/latest/download/opencode-${platform}-${arch}.zip`

    // Extract to this.binDir
    // Handle .exe vs no extension based on platform
  }
}
```

## Common Pitfalls

1. **Missing bin directory**: SDK expects `XDG_DATA_HOME/bin` to exist
2. **Wrong binary name**: Windows needs `.exe`, Unix doesn't
3. **Environment timing**: Set env vars BEFORE any SDK calls
4. **Binary permissions**: Ensure downloaded binary is executable on Unix systems

## The Three Critical Steps

1. **Use electron-vite bundling** to handle ES module compatibility
2. **Set `OPENCODE_BIN_PATH`** to your binary location
3. **Create the `bin/` subdirectory** under your data directory

Everything else is standard binary download and Electron app structure.
