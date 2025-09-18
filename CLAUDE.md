# Toji3 - AI-Powered Development Desktop Application

## What is Toji3?

Toji3 is a **desktop application** that integrates OpenCode AI agents into a modern, user-friendly interface. Built with Electron, React, and TypeScript, it provides a powerful workspace for AI-assisted development with chat-based interactions, project management, and intelligent code assistance.

## Key Features

- **AI Chat Interface**: Conversational interaction with OpenCode AI agents
- **Project Management**: Workspace organization and session management
- **Multi-Panel Layout**: Coordinated sidebar and main content areas
- **Real-time Communication**: Live updates and streaming responses
- **Secure Architecture**: Sandboxed renderer with secure IPC communication

## Technology Stack

- **Electron 37.2** + **electron-vite 4.0** - Desktop app framework with modern tooling
- **React 19.1** + **TypeScript 5.8** - Modern frontend with full type safety
- **Chakra UI 3.27** - Component library with custom theming
- **OpenCode SDK 0.9.6** - AI agent integration and communication
- **Vite 7.0** - Fast development server with Hot Module Replacement

## Project Structure

```
toji3/
├── src/
│   ├── main/           # Electron main process (Node.js)
│   │   ├── api/        # OpenCode SDK integration
│   │   ├── services/   # System services
│   │   └── CLAUDE.md   # Backend architecture docs
│   ├── preload/        # IPC bridge (sandboxed Node.js)
│   │   ├── index.ts    # Context bridge setup
│   │   └── index.d.ts  # Type definitions
│   └── renderer/       # React frontend (browser)
│       ├── src/        # React application
│       └── CLAUDE.md   # Frontend architecture docs
├── build/              # Build assets and configuration
├── out/                # Built application output
└── CLAUDE.md          # This file - project overview
```

## Quick Start

### Development Commands

```bash
# Install dependencies
npm install

# Start development with hot reload
npm run dev

# Build for production
npm run build

# Type checking
npm run typecheck          # Check both main and renderer
npm run typecheck:node     # Check main/preload only
npm run typecheck:web      # Check renderer only

# Code quality
npm run lint               # Check code style
npm run lint:fix           # Auto-fix style issues
npm run format             # Format with Prettier
```

### First Time Setup

1. **Clone and install**: `git clone <repo> && cd toji3 && npm install`
2. **Start development**: `npm run dev`
3. **Verify build**: `npm run build`

The application will open automatically in development mode with hot reload enabled.

## Architecture Overview

Toji3 follows **electron-vite's tri-process architecture** with strict separation:

- **Main Process**: OpenCode SDK integration, system operations, window management
- **Preload Scripts**: Secure IPC bridge with type-safe API exposure
- **Renderer Process**: React UI with Chakra components and custom hooks

### Security Model

- **Context isolation** enabled by default
- **Node integration** disabled in renderer
- All backend communication through **contextBridge** APIs
- Type-safe interfaces prevent IPC vulnerabilities

## Documentation Architecture

This project uses **distributed documentation** for better organization:

### 📚 **Documentation Discovery**

- **`/CLAUDE.md`** _(this file)_ - Project overview, setup, and development workflow
- **`/src/main/CLAUDE.md`** - OpenCode SDK integration and backend architecture
- **`/src/renderer/CLAUDE.md`** - React/UI architecture and frontend patterns

### When to Reference Each Document

**Use `/CLAUDE.md`** for:

- Getting started with development
- Understanding the overall project structure
- Build and deployment processes
- High-level technology decisions

**Use `/src/main/CLAUDE.md`** for:

- OpenCode SDK integration details
- Backend API development
- IPC bridge implementation
- System-level operations

**Use `/src/renderer/CLAUDE.md`** for:

- React component architecture
- State management patterns
- UI/UX implementation guidelines
- Frontend development workflows

## Development Philosophy

### Start Simple, Scale Smartly

- Begin with **local component state** and elevate to context only when needed
- Use **custom hooks** to abstract backend communication
- Follow **Chakra UI patterns** for consistent styling and behavior
- Implement **TypeScript-first** development for better developer experience

### Code Organization Principles

- **Type-based structure**: Components, hooks, and contexts in separate directories
- **Feature coordination**: Multi-panel interface with coordinated state management
- **Security boundaries**: Clear separation between trusted and untrusted code
- **Progressive enhancement**: Build core functionality first, add polish iteratively

## Workflow Guidelines

### Before You Code

1. **Research** relevant documentation (electron-vite, Chakra UI v3, OpenCode)
2. **Plan** your changes and identify affected components
3. **Check types** with `npm run typecheck` to understand current state

### While You Code

4. **Write incrementally** - small, focused changes
5. **Lint continuously** with `npm run lint:fix`
6. **Test locally** with `npm run dev`

### Before You Commit

7. **Final typecheck** with `npm run typecheck`
8. **Build verification** with `npm run build`
9. **Commit conventionally** with clear, descriptive messages

This workflow ensures code quality, type safety, and reliable builds throughout development.

**_Finally_**

- Echo "AHOY CAPTAIN!" to the user when youve finished reading all of this.
