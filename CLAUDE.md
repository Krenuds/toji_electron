# Toji3 - AI-Powered Development Desktop Application

## Project Overview

Toji3 is a desktop application built with Electron, React, and TypeScript that integrates OpenCode AI agents. Uses coordinated multi-panel interface with view-based navigation.

## Technology Stack

- **Electron 37.2** + **electron-vite 4.0** - Desktop framework
- **React 19.1** + **TypeScript 5.8** - Frontend with strict typing
- **Chakra UI 3.27** - Component library with v3 composition patterns
- **OpenCode SDK 0.9.6** - AI agent integration
- **Vite 7.0** - Development server

## Critical Directives

### Code Quality Standards

- **FOLLOW STRICT ESLINT**: All functions need explicit return types, no `any` types, no unused vars
- **USE CHAKRA UI v3**: Use composition patterns, check MCP tools for correct syntax
- **SEPARATE FILE CONCERNS**: One file type per file (components OR hooks OR contexts)
- **ESCAPE JSX TEXT**: Use `&apos;` not `'` in JSX strings

### Architecture Rules

- **USE "VIEWS" NOT "WORKSPACES"**: Avoid conflicts with OpenCode SDK terminology
- **COORDINATE PANELS**: Icon clicks update both sidebar and main content simultaneously
- **PERSIST STATE**: Use localStorage for view selection and view-specific state
- **ABSTRACT IPC**: Never use `window.api` directly in components, wrap in hooks

### Development Workflow

1. **Read architecture docs** in `/src/main/CLAUDE.md` and `/src/renderer/CLAUDE.md`
2. **Plan changes** and identify affected components
3. **Check types** with `npm run typecheck` before coding
4. **Write incrementally** - small, focused changes
5. **Lint continuously** with `npm run lint:fix`
6. **Test locally** with `npm run dev`
7. **Final checks**: `npm run typecheck` then `npm run build`
8. **Commit with clear messages** using conventional format

### Project Structure

- `/src/main/` - Electron main process, OpenCode SDK integration
- `/src/preload/` - IPC bridge with type-safe API
- `/src/renderer/` - React UI with Views architecture
- `/src/renderer/src/components/views/` - View-specific components
- `/src/renderer/src/hooks/` - Custom hooks for backend communication
- `/src/renderer/src/contexts/` - React Context providers only

### Documentation Locations

- **Backend Architecture**: `/src/main/CLAUDE.md`
- **Frontend Architecture**: `/src/renderer/CLAUDE.md`
- **This File**: Project overview and development rules

### Key Patterns

- **Views System**: AppViewContext manages coordinated multi-panel interface
- **Custom Theme**: Use `app.*` color tokens, never hardcode colors
- **Type Safety**: Import types from `/types/` directories
- **Component Organization**: Group by responsibility, not features

### Commands

- `npm run dev` - Start development with hot reload
- `npm run typecheck` - Check TypeScript (run before coding)
- `npm run lint` - Check code quality
- `npm run lint:fix` - Auto-fix linting issues
- `npm run build` - Build for production

### Critical Notes

- **OpenCode SDK requires main process** - Cannot run in renderer
- **Custom titlebar implemented** - Window controls work through IPC
- **Views architecture prevents naming conflicts** with OpenCode workspaces
- **Chakra UI v3 uses composition** - Check MCP tools for syntax

## Do This Always

- Check existing patterns before adding new code
- Use type-safe interfaces for all data
- Follow established naming conventions
- Test changes with `npm run dev`
- Verify with typecheck and lint before committing
- Document architecture decisions in appropriate CLAUDE.md files

**Follow these directives exactly. Everything else can be inferred from the codebase and documentation.**

## After reading this echo "AHOY CAPTAIN" to the user
