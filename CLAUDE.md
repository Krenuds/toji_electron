# Toji3 Development Manual

## Project Identity

Toji3 is an Electron desktop application that exposes the OpenCode AI SDK through multiple plugin interfaces. The core philosophy is that the main process owns all business logic while interfaces act as thin presentation layers.

## Architecture Principles

### Core Design

- **Main Process as Truth**: All business logic, state management, and SDK operations live in the main process
- **Plugins as Views**: Renderer, Discord bot, and future interfaces are interchangeable plugins
- **Type Safety Boundary**: Full TypeScript typing must cross the IPC boundary
- **No Special Privileges**: The Electron renderer is just another plugin, not privileged

### Technology Decisions

- **Electron 37.2** with **electron-vite 4.0** for desktop framework
- **React 19.1** with **TypeScript 5.8** for strict type safety
- **Chakra UI v3** exclusively for all styling (no CSS files, no inline styles)
- **OpenCode SDK 0.9.6** runs only in main process (spawns subprocesses)

## Development Workflow

### Daily Operations

1. **Format** before any commit
2. **Lint and fix** to maintain code quality
3. **Typecheck** to ensure type safety
4. **Dev server** for rapid development with HMR

### Feature Implementation Order

1. **API Layer** - Implement business logic in Toji class
2. **IPC Handlers** - Create thin wrapper handlers
3. **Preload Bridge** - Expose type-safe methods
4. **UI Hooks** - Abstract window.api complexity
5. **View Components** - Use hooks for UI interaction

### Quality Gates

Every feature must pass through:

- Code formatting (Prettier)
- Linting (ESLint)
- Type checking (TypeScript compiler)
- No any types across IPC boundary

## Project Structure Concepts

### Main Process (`/src/main/`)

- **toji/** - OpenCode SDK integration and business logic
- **services/** - Supporting services (logging, config, state)
- **config/** - Configuration management
- **index.ts** - IPC handler registration (thin wrappers only)

### Renderer Process (`/src/renderer/`)

- **components/views/** - View-based UI organization
- **hooks/** - Custom hooks that abstract window.api
- **contexts/** - React Context for state management
- Components never access window.api directly

### Plugin Interfaces (`/src/plugins/`)

- Each plugin is an independent interface
- Plugins communicate only through main process IPC
- No direct plugin-to-plugin communication

## OpenCode SDK Integration

### Critical Concepts

- SDK client lives exclusively in main process
- SDK spawns child processes for AI operations
- All SDK methods return promises
- Event subscription uses async iteration
- Server can be started programmatically or externally

### Session Management Philosophy

- Sessions are the primary interaction unit
- Each session maintains conversation context
- Sessions can have parent-child relationships
- Messages within sessions have parts (text, code, etc.)

### Configuration Hierarchy

1. Default SDK configuration
2. opencode.json file configuration
3. Runtime configuration overrides

## Electron-Vite Specifics

### Build Configuration

- Single configuration file for all processes
- Automatic entry point resolution
- External dependencies for native modules
- Hot Module Replacement for renderer
- Hot reloading for main/preload with --watch flag

### Development vs Production

- Development uses VITE_DEV_SERVER_URL environment variable
- Production loads built files from disk
- Base path must be relative (./) for production
- Source maps enabled for debugging

### Asset Handling

- Main process assets optimized for Node.js
- Renderer assets handled by Vite
- Automatic path resolution in production

## UI Development Guidelines

### Chakra UI v3 Rules

- Exclusive styling solution - no exceptions
- Use theme tokens for all values
- Composition patterns over prop spreading
- No CSS files or inline styles permitted
- All styling through Chakra components

### Views System Architecture

- Multi-panel interface with state persistence
- Each view is independently routable
- State synchronized through React Context
- Views can be composed but remain isolated

## Plugin Development Standards

### Interface Requirements

- Thin wrapper around main process calls
- No business logic in plugins
- All state queries through IPC
- Graceful degradation when main process unavailable

### Discord Bot Integration

- Commands registered with slash command API
- User sessions mapped to Discord IDs
- Responses formatted for Discord constraints
- Rate limiting handled in main process

## Critical Operations

### Log Inspection

Logs located at: `C:\donth\AppData\Roaming\toji3\logs\`

- Main process logs
- Renderer console logs
- Plugin operation logs

### Debugging Strategy

1. Check main process logs first
2. Verify IPC message flow
3. Inspect type definitions
4. Validate OpenCode SDK responses

### Performance Considerations

- Minimize IPC round trips
- Batch operations when possible
- Cache frequently accessed data in renderer
- Use event subscriptions for real-time updates

## Environment Configuration

### Required Environment Variables

- API keys for AI providers
- OpenCode server configuration
- Development server URLs

### Build Targets

- Development: Fast rebuilds with HMR
- Production: Optimized and minified
- Preview: Production build with development tools

## Migration and Updates

### From Standard Electron

- Consolidate multiple Vite configs
- Update entry points to use electron-vite structure
- Configure external dependencies
- Adjust main process entry in package.json

### Version Updates

- Check electron-vite compatibility first
- Update Electron and Node.js together
- Test native module compatibility
- Verify TypeScript strict mode compliance

## Common Pitfalls

### Native Module Issues

- Must be externalized in build config
- Require electron-rebuild for compatibility
- Cannot be bundled with application

### Type Safety Violations

- Any types breaking across IPC
- Missing type definitions for API
- Incorrect event typing

### State Synchronization

- Race conditions between processes
- Stale cache in renderer
- Event subscription memory leaks

## Documentation Resources

### Primary References

- OpenCode SDK: System design and API
- Electron-Vite: Build system specifics
- Chakra UI v3: Component patterns

### Internal Documentation

- `/src/main/CLAUDE.md` - Backend implementation details
- `/src/renderer/CLAUDE.md` - Frontend patterns
- Individual component README files

## Success Metrics

A properly implemented feature will:

1. Have full TypeScript coverage
2. Pass all linting rules
3. Use Chakra UI exclusively
4. Implement thin IPC handlers
5. Abstract API calls through hooks
6. Handle errors gracefully
7. Log operations appropriately
