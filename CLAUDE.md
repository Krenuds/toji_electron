# Toji3 - AI-Powered Development Desktop Application

## Project Overview

Toji3 is an Electron desktop application that exposes the OpenCode AI SDK through multiple plugin interfaces. Built with **Electron 37.2**, **React 19.1**, **TypeScript 5.8**, and **Chakra UI v3**.

## Technology Stack

- **Electron 37.2** + **electron-vite 4.0**: Desktop framework
- **React 19.1** + **TypeScript 5.8**: Frontend with strict typing
- **Chakra UI 3.27**: Component library (v3 composition patterns)
- **OpenCode SDK 0.9.6**: AI agent integration
- **Discord.js 14.22**: Discord bot interface
- **Vite 7.0**: Development server

## Core Architecture

**Plugin-based architecture**: Main process runs OpenCode SDK, exposes through interfaces:

- **Electron Renderer**: React UI (treated as plugin)
- **Discord Bot**: Slash commands and chat
- **Future**: Slack, CLI, Voice, MCP protocols

**Key Principle**: Main process = business logic, interfaces = thin wrappers

## Project Structure

toji3/
├── src/
│ ├── main/ # Electron main process
│ │ ├── toji/ # Core OpenCode integration
│ │ ├── services/ # Supporting services
│ │ ├── config/ # Configuration management
│ │ └── index.ts # IPC handlers
│ ├── preload/ # IPC bridge
│ ├── renderer/ # React UI (plugin interface)
│ │ └── src/
│ │ ├── components/views/ # View-based UI
│ │ ├── hooks/ # Custom React hooks
│ │ └── contexts/ # React Context providers
│ └── plugins/ # Plugin interfaces
│ └── discord/ # Discord bot

## Feature Implementation Order

1. **API Layer** (`/src/main/toji/`) - Business logic in Toji class
2. **IPC Handlers** (`/src/main/index.ts`) - Thin handlers
3. **Preload Bridge** (`/src/preload/`) - Type-safe IPC exposure
4. **UI Components** (`/src/renderer/`) - React hooks abstracting window.api
5. **Testing & Quality** - Format, lint, typecheck workflow

## Development Commands

```bash
npm run format      # Code formatting
npm run lint:fix    # Auto-fix linting issues
npm run lint        # Check for issues
npm run typecheck   # TypeScript validation
npm run dev         # Development server
npm run build       # Production build
```

## Documentation References

- **OpenCode SDK**: <https://opencode.ai/docs/sdk/>
- **Electron-Vite**: <https://electron-vite.org/guide/>
- **Chakra UI v3**: <https://chakra-ui.com/docs/get-started/frameworks/vite>
- **Project Backend**: `/src/main/CLAUDE.md`
- **Project Frontend**: `/src/renderer/CLAUDE.md`

## Key Concepts

- **OpenCode SDK**: Runs in main process only, spawns subprocesses
- **Views System**: Multi-panel UI with state persistence
- **Plugin Architecture**: Renderer has no special privileges
- **Type Safety**: Full typing across IPC boundary
- **Chakra UI v3**: Exclusive styling, no inline styles/CSS files

## Log Location

`C:\donth\AppData\Roaming\toji3\logs\`

## OPENCODE SDK IMPORTANT

# OpenCode SDK

Type-safe JS client for opencode server.

The opencode JS/TS SDK provides a type-safe client for interacting with the server. Use it to build integrations and control opencode programmatically.

Learn more about how the server works.

## Install

Install the SDK from npm:

```bash
npm install @opencode-ai/sdk
```

## Create Client

Create a client instance to connect to your server:

```javascript
import { createOpencodeClient } from '@opencode-ai/sdk'

const client = createOpencodeClient({
  baseUrl: 'http://localhost:4096',
  responseStyle: 'data'
})
```

### Options

| Option          | Type     | Description                    | Default                 |
| --------------- | -------- | ------------------------------ | ----------------------- |
| `baseUrl`       | string   | URL of the server              | `http://localhost:4096` |
| `fetch`         | function | Custom fetch implementation    | `globalThis.fetch`      |
| `parseAs`       | string   | Response parsing method        | `auto`                  |
| `responseStyle` | string   | Return style: data or fields   | `fields`                |
| `throwOnError`  | boolean  | Throw errors instead of return | `false`                 |

## Start Server

You can also programmatically start an opencode server:

```javascript
import { createOpencodeServer } from '@opencode-ai/sdk'

const server = await createOpencodeServer({
  hostname: '127.0.0.1',
  port: 4096
})

console.log(`Server running at ${server.url}`)

server.close()
```

You can pass a configuration object to customize server behavior. The server still picks up your `opencode.json`, but you can override or add configuration inline:

```javascript
import { createOpencodeServer } from '@opencode-ai/sdk'

const server = await createOpencodeServer({
  hostname: '127.0.0.1',
  port: 4096,
  config: {
    model: 'anthropic/claude-3-5-sonnet-20241022'
  }
})

console.log(`Server running at ${server.url}`)

server.close()
```

### Options

| Option     | Type        | Description                    | Default     |
| ---------- | ----------- | ------------------------------ | ----------- |
| `hostname` | string      | Server hostname                | `127.0.0.1` |
| `port`     | number      | Server port                    | `4096`      |
| `signal`   | AbortSignal | Abort signal for cancellation  | `undefined` |
| `timeout`  | number      | Timeout in ms for server start | `5000`      |
| `config`   | Config      | Configuration object           | `{}`        |

## Types

The SDK includes TypeScript definitions for all API types. Import them directly:

```typescript
import type { Session, Message, Part } from '@opencode-ai/sdk'
```

All types are generated from the server's OpenAPI specification and available in the types file.

## Errors

The SDK can throw errors that you can catch and handle:

```javascript
try {
  await client.session.get({ path: { id: "invalid-id" } })
} catch (error) {
  console.error("Failed to get session:", (error as Error).message)
}
```

## APIs

The SDK exposes all server APIs through a type-safe client.

### App

| Method         | Description               | Response  |
| -------------- | ------------------------- | --------- |
| `app.log()`    | Write a log entry         | `boolean` |
| `app.agents()` | List all available agents | `Agent[]` |

#### Examples

```javascript
// Write a log entry
await client.app.log({
  body: {
    service: 'my-app',
    level: 'info',
    message: 'Operation completed'
  }
})

// List available agents
const agents = await client.app.agents()
```

### Project

| Method              | Description         | Response    |
| ------------------- | ------------------- | ----------- |
| `project.list()`    | List all projects   | `Project[]` |
| `project.current()` | Get current project | `Project`   |

#### Examples

```javascript
// List all projects
const projects = await client.project.list()

// Get current project
const currentProject = await client.project.current()
```

### Path

| Method       | Description      | Response |
| ------------ | ---------------- | -------- |
| `path.get()` | Get current path | `Path`   |

#### Examples

```javascript
// Get current path information
const pathInfo = await client.path.get()
```

### Config

| Method               | Description                       | Response                                                        |
| -------------------- | --------------------------------- | --------------------------------------------------------------- |
| `config.get()`       | Get config info                   | `Config`                                                        |
| `config.providers()` | List providers and default models | `{ providers: Provider[], default: { [key: string]: string } }` |

#### Examples

```javascript
const config = await client.config.get()

const { providers, default: defaults } = await client.config.providers()
```

### Sessions

| Method                                                     | Description                      | Notes                                              |
| ---------------------------------------------------------- | -------------------------------- | -------------------------------------------------- |
| `session.list()`                                           | List sessions                    | Returns `Session[]`                                |
| `session.get({ path })`                                    | Get session                      | Returns `Session`                                  |
| `session.children({ path })`                               | List child sessions              | Returns `Session[]`                                |
| `session.create({ body })`                                 | Create session                   | Returns `Session`                                  |
| `session.delete({ path })`                                 | Delete session                   | Returns `boolean`                                  |
| `session.update({ path, body })`                           | Update session properties        | Returns `Session`                                  |
| `session.init({ path, body })`                             | Analyze app and create AGENTS.md | Returns `boolean`                                  |
| `session.abort({ path })`                                  | Abort a running session          | Returns `boolean`                                  |
| `session.share({ path })`                                  | Share session                    | Returns `Session`                                  |
| `session.unshare({ path })`                                | Unshare session                  | Returns `Session`                                  |
| `session.summarize({ path, body })`                        | Summarize session                | Returns `boolean`                                  |
| `session.messages({ path })`                               | List messages in a session       | Returns `{ info: Message, parts: Part[]}[]`        |
| `session.message({ path })`                                | Get message details              | Returns `{ info: Message, parts: Part[]}`          |
| `session.prompt({ path, body })`                           | Send prompt message              | Returns `{ info: AssistantMessage, parts: Part[]}` |
| `session.command({ path, body })`                          | Send command to session          | Returns `{ info: AssistantMessage, parts: Part[]}` |
| `session.shell({ path, body })`                            | Run a shell command              | Returns `AssistantMessage`                         |
| `session.revert({ path, body })`                           | Revert a message                 | Returns `Session`                                  |
| `session.unrevert({ path })`                               | Restore reverted messages        | Returns `Session`                                  |
| `postSessionByIdPermissionsByPermissionId({ path, body })` | Respond to a permission request  | Returns `boolean`                                  |

#### Examples

```javascript
// Create and manage sessions
const session = await client.session.create({
  body: { title: 'My session' }
})

const sessions = await client.session.list()

// Send a prompt message
const result = await client.session.prompt({
  path: { id: session.id },
  body: {
    model: { providerID: 'anthropic', modelID: 'claude-3-5-sonnet-20241022' },
    parts: [{ type: 'text', text: 'Hello!' }]
  }
})
```

### Files

| Method                    | Description                  | Response                                                                          |
| ------------------------- | ---------------------------- | --------------------------------------------------------------------------------- |
| `find.text({ query })`    | Search for text in files     | Array of match objects with path, lines, line_number, absolute_offset, submatches |
| `find.files({ query })`   | Find files by name           | `string[]` (file paths)                                                           |
| `find.symbols({ query })` | Find workspace symbols       | `Symbol[]`                                                                        |
| `file.read({ query })`    | Read a file                  | `{ type: "raw" \| "patch", content: string }`                                     |
| `file.status({ query? })` | Get status for tracked files | `File[]`                                                                          |

#### Examples

```javascript
// Search and read files
const textResults = await client.find.text({
  query: { pattern: 'function.*opencode' }
})

const files = await client.find.files({
  query: { query: '*.ts' }
})

const content = await client.file.read({
  query: { path: 'src/index.ts' }
})
```

### TUI

| Method                         | Description               | Response  |
| ------------------------------ | ------------------------- | --------- |
| `tui.appendPrompt({ body })`   | Append text to the prompt | `boolean` |
| `tui.openHelp()`               | Open the help dialog      | `boolean` |
| `tui.openSessions()`           | Open the session selector | `boolean` |
| `tui.openThemes()`             | Open the theme selector   | `boolean` |
| `tui.openModels()`             | Open the model selector   | `boolean` |
| `tui.submitPrompt()`           | Submit the current prompt | `boolean` |
| `tui.clearPrompt()`            | Clear the prompt          | `boolean` |
| `tui.executeCommand({ body })` | Execute a command         | `boolean` |
| `tui.showToast({ body })`      | Show toast notification   | `boolean` |

#### Examples

```javascript
// Control TUI interface
await client.tui.appendPrompt({
  body: { text: 'Add this to prompt' }
})

await client.tui.showToast({
  body: { message: 'Task completed', variant: 'success' }
})
```

### Auth

| Method              | Description                    | Response  |
| ------------------- | ------------------------------ | --------- |
| `auth.set({ ... })` | Set authentication credentials | `boolean` |

#### Examples

```javascript
await client.auth.set({
  path: { id: 'anthropic' },
  body: { type: 'api', key: 'your-api-key' }
})
```

### Events

| Method              | Description               | Response                  |
| ------------------- | ------------------------- | ------------------------- |
| `event.subscribe()` | Server-sent events stream | Server-sent events stream |

#### Examples

```javascript
// Listen to real-time events
const events = await client.event.subscribe()
for await (const event of events.stream) {
  console.log('Event:', event.type, event.properties)
}
```

## ELECTRON VITE REACT

# CLAUDE.md - Electron-Vite Critical Points Guide

## Overview

electron-vite is a next-generation Electron build tooling based on Vite that provides a faster and leaner development experience for Electron applications. It's designed to work out-of-the-box with minimal configuration.

## Core Features

### 1. Five Major Components

- **Vite-based bundling** for Electron's unique environment (Node.js + browser)
- **Centralized configuration** for main process, renderers, and preload scripts
- **Fast HMR** for renderers + hot reloading for main/preload scripts
- **Optimized asset handling** for Electron main process
- **V8 bytecode compilation** for source code protection

### 2. Key Advantages

- Pre-configured for Electron - minimal setup required
- Extremely fast development with HMR/hot reloading
- Easy debugging in VSCode/WebStorm
- TypeScript decorator support via SWC
- Node.js worker threads support

## Installation & Setup

### Prerequisites

- **Node.js**: 20.19+ or 22.12+
- **Vite**: 5.0+

### Quick Start

```bash
# Install electron-vite
npm i electron-vite -D

# Create new project with templates
npm create @quick-start/electron@latest

# Or using specific template
npm create @quick-start/electron@latest my-app -- --template vue
```

### Available Templates

- JavaScript: `vanilla`, `vue`, `react`, `svelte`, `solid`
- TypeScript: `vanilla-ts`, `vue-ts`, `react-ts`, `svelte-ts`, `solid-ts`

## Project Structure

### Recommended Structure

```
├── src/
│   ├── main/           # Main process
│   │   └── index.ts
│   ├── preload/        # Preload scripts
│   │   └── index.ts
│   └── renderer/       # Renderer process
│       └── index.html
├── electron.vite.config.js
├── package.json
└── out/               # Build output (default)
```

### Default Entry Points

- **Main**: `<root>/src/main/{index|main}.{js|ts|mjs|cjs}`
- **Preload**: `<root>/src/preload/{index|preload}.{js|ts|mjs|cjs}`
- **Renderer**: `<root>/src/renderer/index.html`

## Configuration

### Basic Config (electron.vite.config.js)

```javascript
export default {
  main: {
    // Vite config for main process
  },
  preload: {
    // Vite config for preload scripts
  },
  renderer: {
    // Vite config for renderer process
  }
}
```

### Advanced Config Patterns

#### Conditional Configuration

```javascript
import { defineConfig } from 'electron-vite'

export default defineConfig(({ command, mode }) => {
  if (command === 'serve') {
    return {
      /* dev config */
    }
  } else {
    return {
      /* build config */
    }
  }
})
```

#### Mixed Configuration

```javascript
import { defineConfig, defineViteConfig } from 'electron-vite'

export default defineConfig({
  main: {
    /* static config */
  },
  renderer: defineViteConfig(({ command, mode }) => {
    // Dynamic renderer config
  })
})
```

## Development Features

### Hot Module Replacement (HMR)

- **Renderers**: Full HMR support via Vite
- **Main/Preload**: Hot reloading (rebuilds & restarts)

#### Enabling HMR in Renderer

```javascript
// In main process
if (process.env.VITE_DEV_SERVER_URL) {
  win.loadURL(process.env.VITE_DEV_SERVER_URL)
} else {
  win.loadFile('path/to/index.html')
}
```

### Hot Reloading for Main/Preload

Enable with either:

1. **CLI option**: `electron-vite dev --watch`
2. **Config option**: Set `build.watch: {}` in config

## Building for Production

### Build Command

```bash
# Build all processes
electron-vite build

# Specify output directory
electron-vite build --outDir=dist
```

### Output Structure

```
out/
├── main/
├── preload/
└── renderer/
```

### Package.json Configuration

```json
{
  "main": "./out/main/index.js",
  "scripts": {
    "dev": "electron-vite dev",
    "build": "electron-vite build",
    "preview": "electron-vite preview"
  }
}
```

## Critical Configuration Options

### External Dependencies

```javascript
import { defineConfig, externalizeDepsPlugin } from 'electron-vite'

export default defineConfig({
  main: {
    plugins: [externalizeDepsPlugin()],
    build: {
      rollupOptions: {
        external: ['sqlite3', 'serialport']
      }
    }
  }
})
```

### ES Modules Support (Electron 28+)

#### Method 1: Package.json

```json
{
  "type": "module"
}
```

#### Method 2: Config

```javascript
export default defineConfig({
  main: {
    build: {
      rollupOptions: {
        output: { format: 'es' }
      }
    }
  }
})
```

## Asset Handling

### Main Process Assets

- Optimized for Electron's unique requirements
- Automatic path resolution
- Support for Node.js `__dirname` and `__filename`

### Production Asset Loading

```javascript
// Use relative base path in Vite config
export default {
  base: './',
  build: {
    outDir: 'dist'
  }
}
```

## Environment Variables

### Modes

- **dev command**: `development` mode
- **build/preview**: `production` mode
- Override with: `--mode` flag

### Built-in Variables

- `process.env.VITE_DEV_SERVER_URL`: Dev server URL (renderer)
- `import.meta.env`: Vite environment variables

## CLI Commands

### Core Commands

```bash
# Start dev server with Electron
electron-vite dev

# Build for production
electron-vite build

# Preview production build
electron-vite preview

# With options
electron-vite dev --watch     # Enable hot reloading
electron-vite build --outDir=dist  # Custom output
```

## Best Practices

### 1. Dependencies Management

- **dependencies**: Runtime packages (will be bundled with app)
- **devDependencies**: Build-time packages (for fully bundled renderers)

### 2. External Modules

- Externalize native Node modules
- Bundle ESM-only modules (lowdb, execa, node-fetch)

### 3. Multiple Windows

- Separate entry points for each window
- Individual preload scripts per window

### 4. Source Code Protection

- Use V8 bytecode compilation for sensitive code
- Available via built-in configuration

## Common Patterns

### Loading Different Content in Dev/Prod

```javascript
// Main process
if (process.env.VITE_DEV_SERVER_URL) {
  // Development
  mainWindow.loadURL(process.env.VITE_DEV_SERVER_URL)
} else {
  // Production
  mainWindow.loadFile(path.join(__dirname, '../renderer/index.html'))
}
```

### Handling Native Modules

```javascript
export default defineConfig({
  main: {
    build: {
      rollupOptions: {
        external: ['better-sqlite3', 'serialport']
      }
    }
  }
})
```

### TypeScript Decorators

```javascript
import { defineConfig, swcPlugin } from 'electron-vite'

export default defineConfig({
  main: {
    plugins: [swcPlugin()]
  }
})
```

## Migration from Standard Vite

### Key Differences

1. **Single config file** instead of multiple Vite configs
2. **Built-in Electron optimizations**
3. **Automatic entry point resolution**
4. **Preconfigured for Node.js and browser environments**

### Migration Steps

1. Consolidate Vite configs into `electron.vite.config.js`
2. Update build scripts in `package.json`
3. Adjust main entry point to output directory
4. Configure external dependencies

## Debugging Tips

1. **VSCode**: Automatic source map support
2. **Chrome DevTools**: For renderer debugging
3. **Environment inspection**: Check `process.env.VITE_DEV_SERVER_URL`
4. **Build analysis**: Use `--sourcemap` flag

## Performance Optimization

### Development

- Use `--watch` for main/preload hot reloading
- Leverage HMR for instant renderer updates
- Minimize external dependencies

### Production

- Enable V8 bytecode compilation
- Properly externalize native modules
- Use code splitting for large renderers

## Common Issues & Solutions

### Issue: HMR Not Working

- Ensure correct environment variable usage
- Check for named exports breaking HMR
- Verify dev server URL loading

### Issue: Native Module Errors

- Add to external dependencies
- Ensure correct Node.js version
- Check electron-rebuild compatibility

### Issue: Build Path Problems

- Use relative base path: `base: './'`
- Verify output directory structure
- Check main entry in package.json

## Key Commands Summary

```bash
# Development
npx electron-vite dev --watch

# Build
npx electron-vite build

# Preview
npx electron-vite preview

# Help
npx electron-vite -h
```

## Resources

- [Official Documentation](https://electron-vite.org)
- [GitHub Repository](https://github.com/alex8088/electron-vite)
- [Template Repository](https://github.com/alex8088/electron-vite-boilerplate)
- [Create Electron Tool](https://github.com/alex8088/quick-start/tree/master/packages/create-electron)
