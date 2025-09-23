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

```
toji3/
├── src/
│   ├── main/               # Electron main process
│   │   ├── toji/          # Core OpenCode integration
│   │   ├── services/      # Supporting services
│   │   ├── config/        # Configuration management
│   │   └── index.ts       # IPC handlers
│   ├── preload/           # IPC bridge
│   ├── renderer/          # React UI (plugin interface)
│   │   └── src/
│   │       ├── components/views/  # View-based UI
│   │       ├── hooks/     # Custom React hooks
│   │       └── contexts/  # React Context providers
│   └── plugins/           # Plugin interfaces
│       └── discord/       # Discord bot
```

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

- **OpenCode SDK**: https://opencode.ai/docs/sdk/
- **Electron-Vite**: https://electron-vite.org/guide/
- **Chakra UI v3**: https://chakra-ui.com/docs/get-started/frameworks/vite
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
