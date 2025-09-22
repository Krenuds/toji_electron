# Toji3 - AI-Powered Development Desktop Application

## Project Overview

Toji3 is an Electron desktop application that exposes the OpenCode AI SDK through multiple plugin interfaces. Built with **Electron 37.2**, **React 19.1**, **TypeScript 5.8**, and **Chakra UI v3**, it provides a sophisticated multi-interface system for AI-powered development tools.

## Core Architecture

The application follows a **plugin-based architecture** where the Electron main process runs the OpenCode SDK and exposes its functionality through various interfaces:

- **Electron Renderer**: React-based UI treated as a plugin interface
- **Discord Bot**: Slash commands and chat integration
- **Future Interfaces**: Slack, CLI, Voice, MCP protocols

## Technology Stack

### Core Dependencies

- **Electron 37.2** + **electron-vite 4.0**: Desktop framework with modern build tools
- **React 19.1** + **TypeScript 5.8**: Frontend with strict typing
- **Chakra UI 3.27**: Component library using v3 composition patterns
- **OpenCode SDK 0.9.6**: AI agent integration (https://opencode.ai/docs/sdk/)
- **Discord.js 14.22**: Discord bot interface
- **Vite 7.0**: Development server with HMR

## Critical Directives

### 🔴 ALWAYS START WITH DOCUMENTATION

Before ANY coding session:

1. **Read OpenCode Docs**: https://opencode.ai/docs/sdk/
2. **Read Electron-Vite Guide**: https://electron-vite.org/guide/
3. **Read Chakra UI Vite Guide**: https://chakra-ui.com/docs/get-started/frameworks/vite
4. **Review Recent Commits**: `git log --oneline -4`

### Code Quality Standards - NON-NEGOTIABLE

**WE RUN A TIGHT SHIP** - Code quality is enforced at every step:

1. **FORMAT FIRST**: `npm run format` - Run before ANY code changes
2. **LINT ALWAYS**: `npm run lint` - Check for issues
3. **FIX IMMEDIATELY**: `npm run lint:fix` - Auto-fix all fixable issues
4. **TYPECHECK CONSTANTLY**: `npm run typecheck` - Must pass before ANY commit

#### Strict TypeScript Rules

- **NO `any` TYPES**: Every variable must be typed
- **EXPLICIT RETURN TYPES**: All functions need return type declarations
- **NO UNUSED VARIABLES**: Remove or prefix with `_`
- **STRICT MODE**: Full TypeScript strict mode enabled

#### Chakra UI v3 - EXCLUSIVE STYLING

- **NO INLINE STYLES**: Use Chakra UI exclusively
- **NO CSS FILES**: All styling through Chakra tokens
- **NO TAILWIND**: Chakra UI v3 only
- **USE MCP TOOLS**: Check syntax with Chakra MCP tools
- **COMPOSITION PATTERNS**: Follow v3 patterns exactly

#### Code Standards

- **NO HARDCODED VALUES**: Use config files and environment variables
- **ESCAPE JSX TEXT**: Use `&apos;` not `'` in JSX strings
- **ONE COMPONENT PER FILE**: Maintain separation of concerns

### Architecture Rules

- **MAIN PROCESS ONLY**: OpenCode SDK runs in Electron main process only
- **PLUGIN ARCHITECTURE**: Renderer is a plugin, not privileged UI
- **IPC ABSTRACTION**: Never use `window.api` directly in components
- **BUSINESS LOGIC IN MAIN**: All logic in `/src/main/toji/`, interfaces are thin
- **TYPE SAFETY**: Full typing across IPC boundary

## Feature Implementation Workflow

When adding ANY new feature, follow this exact order:

### 1. API Layer (`/src/main/toji/`)

```typescript
// Add methods to Toji class for compound operations
class Toji {
  async ensureReadyForChat(directory?: string) {
    // ALL business logic here
  }
}
```

### 2. IPC Handlers (`/src/main/index.ts`)

```typescript
// Thin handlers that call Toji API
ipcMain.handle('core:chat', async (_, message) => {
  return toji.chat(message)
})
```

### 3. Preload Bridge (`/src/preload/`)

```typescript
// Update index.ts to expose IPC methods
chat: (message: string): Promise<string> => ipcRenderer.invoke('core:chat', message)

// Update index.d.ts with TypeScript definitions
```

### 4. UI Components (`/src/renderer/`)

```typescript
// Create hooks to abstract window.api calls
const useChat = () => {
  const chat = async (message: string) => {
    return window.api.core.chat(message)
  }
  return { chat }
}
```

### 5. Testing & Refinement

**MANDATORY CODE QUALITY WORKFLOW:**

```bash
# Step 1: Format FIRST (always)
npm run format

# Step 2: Fix linting issues
npm run lint:fix

# Step 3: Check for remaining issues
npm run lint

# Step 4: Validate TypeScript
npm run typecheck

# Step 5: Test in development
npm run dev

# Step 6: Final build (only if all above pass)
npm run build
```

**If ANY step fails, DO NOT proceed to the next step!**

## Project Structure

```
toji3/
├── src/
│   ├── main/               # Electron main process
│   │   ├── toji/          # Core OpenCode integration
│   │   │   ├── index.ts   # Toji class with business logic
│   │   │   └── types.ts   # Core type definitions
│   │   ├── services/      # Supporting services
│   │   ├── config/        # Configuration management
│   │   └── index.ts       # IPC handlers
│   │
│   ├── preload/           # IPC bridge
│   │   ├── index.ts       # API exposure
│   │   └── index.d.ts     # TypeScript definitions
│   │
│   ├── renderer/          # React UI (plugin interface)
│   │   └── src/
│   │       ├── components/
│   │       │   └── views/ # View-based UI architecture
│   │       ├── hooks/     # Custom React hooks
│   │       ├── contexts/  # React Context providers
│   │       └── App.tsx    # Main React app
│   │
│   └── plugins/           # Plugin interfaces
│       └── discord/       # Discord bot integration
│           ├── DiscordPlugin.ts
│           ├── commands/  # Slash commands
│           └── modules/   # Bot modules
```

## Key Concepts

### Plugin Architecture

The Electron renderer is treated as a plugin interface, not the primary UI:

1. **Main Process Authority**: All business logic in `/src/main/toji/`
2. **Plugin Interfaces**: Discord, Electron renderer, future: Slack, CLI
3. **Shared API**: All plugins use the same Toji API methods
4. **No Privilege**: Renderer has no special access beyond other plugins

### Views System (Renderer)

The UI uses a **coordinated multi-panel interface**:

- **Icon Bar**: Navigation triggers synchronized content updates
- **Sidebar Panel**: View-specific contextual content
- **Main Panel**: Primary interaction area
- **State Persistence**: localStorage for view and settings

### OpenCode SDK Integration

Critical understanding:

- **Binary Dependency**: OpenCode is a compiled binary (Go + TypeScript)
- **Process Model**: Spawns subprocesses for operations (fzf, ripgrep)
- **Directory Requirements**: Needs specific directories created
- **Main Process Only**: Cannot run in renderer or web worker

## Development Commands

### Daily Development Workflow

```bash
# BEFORE writing any code
npm run format       # Format existing code
npm run typecheck    # Check current type safety

# WHILE developing
npm run dev          # Start with hot reload
# Make changes...
npm run format       # Format your changes
npm run lint:fix     # Fix any issues
npm run lint         # Verify no issues remain
npm run typecheck    # Ensure types are correct

# BEFORE committing
npm run format       # Final format
npm run lint         # Must show 0 errors
npm run typecheck    # Must pass completely

# Building (only after all checks pass)
npm run build        # Production build
npm run build:win    # Windows build
npm run build:mac    # macOS build
npm run build:linux  # Linux build
```

### Code Quality Commands (USE CONSTANTLY)

- `npm run format` - **RUN FIRST, ALWAYS**
- `npm run lint:fix` - **RUN SECOND**
- `npm run lint` - **MUST PASS**
- `npm run typecheck` - **MUST PASS**

## Common Pitfalls & Solutions

### OpenCode SDK Issues

**Problem**: "ENOENT: no such file or directory, posix_spawn"
**Solution**: Ensure required directories exist in main process initialization

**Problem**: Binary not found
**Solution**: Check `OPENCODE_INSTALL_DIR` environment variable

### Chakra UI v3 Issues

**Problem**: Component not rendering correctly
**Solution**: Use MCP tools to check v3 composition syntax

### IPC Communication

**Problem**: `window.api` is undefined
**Solution**: Ensure preload script is loaded and types are updated

## Documentation Locations

- **This File**: Project overview and workflow
- `/src/main/CLAUDE.md`: Backend architecture details
- `/src/renderer/CLAUDE.md`: Frontend UI architecture
- `https://opencode.ai/docs/sdk/`: OpenCode SDK reference
- `https://electron-vite.org/guide/`: Electron-Vite documentation

## Commit Message Convention

Use conventional commits:

```
feat: add new feature
fix: resolve bug
refactor: restructure code
docs: update documentation
test: add tests
chore: maintenance tasks
```

## Important Notes

1. **NEVER** commit without running `npm run typecheck` and `npm run lint`
2. **ALWAYS** test with `npm run dev` before committing
3. **DOCUMENT** architectural decisions in appropriate CLAUDE.md files
4. **FOLLOW** the feature implementation workflow exactly
5. **CHECK** documentation before starting any session

## Do This IMMEDIATELY When Starting

1. Read latest 4 commit messages: `git log --oneline -4`
2. Check OpenCode docs for any API you'll use
3. Review the Feature Implementation Workflow above
4. Create a TODO list for your tasks
5. Follow the workflow step by step

**Remember**: Business logic in main process, interfaces are thin wrappers!
