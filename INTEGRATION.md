# OpenCode + Electron Integration Guide

## Overview

This document outlines the essential steps for integrating the OpenCode AI coding agent SDK into an Electron application. The primary challenges are:

1. **Module System Mismatch**: OpenCode SDK is ES modules, Electron main process uses CommonJS
2. **Binary Distribution**: SDK expects `opencode` command in PATH, but Electron apps need embedded distribution
3. **Environment Configuration**: Multiple environment variables must be set correctly

## Critical Issue #1: ES Modules vs CommonJS

**Problem**: The `@opencode-ai/sdk` package uses ES modules, but Electron's main process runs in CommonJS mode.

**Solution**: Use electron-vite's bundling approach - exclude the SDK from externalization so it gets bundled into CommonJS format. Additionally, add an alias to resolve the SDK's exact path:

```typescript
// electron.vite.config.ts
export default defineConfig({
  main: {
    plugins: [externalizeDepsPlugin({ exclude: ['@opencode-ai/sdk'] })],
    resolve: {
      conditions: ['import', 'module', 'node', 'default'],
      alias: {
        '@opencode-ai/sdk': resolve(__dirname, 'node_modules/@opencode-ai/sdk/dist/index.js')
      }
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
process.env.OPENCODE_INSTALL_DIR = '/path/to/bin/dir'          // Binary directory
process.env.XDG_DATA_HOME = '/path/to/data/dir'                // Working directory
// Also add binary directory to PATH for spawn() fallback
process.env.PATH = binDir + pathSeparator + process.env.PATH
```

**Why Each Matters**:

- `OPENCODE_BIN_PATH`: SDK's primary binary lookup (tells SDK exactly where the binary is)
- `OPENCODE_INSTALL_DIR`: Directory containing the OpenCode binary
- `XDG_DATA_HOME`: Working directory for sessions, config, logs
- `PATH`: Important fallback - SDK still uses spawn('opencode') in some cases

## Required Directory Structure

```text
userData/
├── opencode-bin/          (OPENCODE_INSTALL_DIR - stores the binary)
│   └── opencode(.exe)     (the binary - .exe on Windows)
└── opencode-data/         (XDG_DATA_HOME/opencode - working directory)
    ├── bin/               (CRITICAL - Must be created manually due to bug)
    ├── data/              (Created automatically by OpenCode)
    ├── config/            (Created automatically by OpenCode)
    ├── state/             (Created automatically by OpenCode)
    └── log/               (Created automatically by OpenCode)
```

**Known Issue**: OpenCode has a bug ([Issue #1856](https://github.com/sst/opencode/issues/1856)) where it fails to create the `bin/` directory even though it's required for operations like LSP server installations and tool downloads. This causes ENOENT errors.

**Our Workaround**: The implementation explicitly creates ALL directories including `bin/` to work around this bug. This is necessary until the upstream issue is fixed.

## Implementation Template (Based on Actual Code)

```typescript
import { app } from 'electron'
import { join } from 'path'
import { existsSync, mkdirSync } from 'fs'
import { chmod, stat } from 'fs/promises'
import { createOpencodeServer } from '@opencode-ai/sdk'

export interface OpenCodeConfig {
  model?: string
  hostname?: string
  port?: number
  timeout?: number
}

export class OpenCodeManager {
  private binDir: string
  private dataDir: string
  private server: any = null
  private config: OpenCodeConfig

  constructor(config: OpenCodeConfig = {}) {
    this.config = {
      hostname: '127.0.0.1',
      port: 4096,
      timeout: 5000,
      model: 'anthropic/claude-3-5-sonnet-20241022',
      ...config
    }

    const userData = app.getPath('userData')
    this.binDir = join(userData, 'opencode-bin')
    this.dataDir = join(userData, 'opencode-data')
    this.setupEnvironment()
  }

  private setupEnvironment(): void {
    // Create binary directory for our downloaded OpenCode executable
    if (!existsSync(this.binDir)) {
      mkdirSync(this.binDir, { recursive: true })
    }

    // WORKAROUND: Create bin/ directory due to OpenCode bug #1856
    // OpenCode fails to create this directory but requires it for operations
    const opencodeBindir = join(this.dataDir, 'bin')
    if (!existsSync(opencodeBindir)) {
      mkdirSync(opencodeBindir, { recursive: true })
    }

    // Set environment variables BEFORE any SDK calls
    process.env.OPENCODE_INSTALL_DIR = this.binDir
    process.env.XDG_DATA_HOME = this.dataDir

    // CRITICAL: Set OPENCODE_BIN_PATH to tell SDK exactly where our binary is
    const binaryName = process.platform === 'win32' ? 'opencode.exe' : 'opencode'
    process.env.OPENCODE_BIN_PATH = join(this.binDir, binaryName)

    // PATH fallback required - SDK spawns 'opencode' command via Node.js spawn()
    const currentPath = process.env.PATH || ''
    const pathSeparator = process.platform === 'win32' ? ';' : ':'
    if (!currentPath.includes(this.binDir)) {
      process.env.PATH = this.binDir + pathSeparator + currentPath
    }
  }

  async startServer(): Promise<ServerStatus> {
    await this.ensureBinary()

    // Create OpenCode server with config
    this.server = await createOpencodeServer({
      hostname: this.config.hostname,
      port: this.config.port,
      timeout: this.config.timeout,
      config: {
        model: this.config.model
      }
    })

    return {
      running: true,
      url: `http://${this.config.hostname}:${this.config.port}`
    }
  }

  private async downloadBinary(): Promise<void> {
    const platformMap = {
      'win32': 'windows',
      'darwin': 'darwin',
      'linux': 'linux'
    }

    const platform = platformMap[process.platform]
    const arch = process.arch === 'x64' ? 'x64' : process.arch
    const zipName = `opencode-${platform}-${arch}.zip`
    const url = `https://github.com/sst/opencode/releases/latest/download/${zipName}`

    // Download, extract to this.binDir
    // Make executable on Unix systems with chmod('755')
  }
}
```

## Common Pitfalls

1. **Missing bin directory**: OpenCode has a bug where it doesn't create the required `bin/` directory (Issue #1856). You MUST create it manually or operations will fail with ENOENT errors
2. **Wrong binary name**: Windows needs `.exe`, Unix doesn't
3. **Environment timing**: Set env vars BEFORE any SDK calls
4. **Binary permissions**: Ensure downloaded binary is executable on Unix systems (chmod 755)
5. **PATH configuration**: Must add binary directory to PATH even with OPENCODE_BIN_PATH set
6. **Module resolution**: Need both externalizeDepsPlugin exclusion AND alias in electron-vite config
7. **Binary extraction**: Use adm-zip or similar to extract from GitHub release ZIP files

## The Four Critical Steps

1. **Configure electron-vite properly**:
   - Exclude `@opencode-ai/sdk` from externalization
   - Add alias to resolve SDK's exact path
2. **Set ALL required environment variables**:
   - `OPENCODE_BIN_PATH` for direct binary location
   - `OPENCODE_INSTALL_DIR` for binary directory
   - `XDG_DATA_HOME` for working directory
   - Add binary directory to `PATH`
3. **Create only what's necessary**:
   - **Must manually create the `bin/` subdirectory** under XDG_DATA_HOME - OpenCode bug #1856 prevents automatic creation
   - Let OpenCode create its own directories (data/, config/, state/, log/) as needed
4. **Handle binary downloads properly**:
   - Download correct platform/architecture ZIP from GitHub releases
   - Extract and set executable permissions on Unix

Everything else is standard binary download and Electron app structure.
