# NEXT.md - Toji API Implementation Plan

## What We Built Today

**✅ Complete Toji API Structure**

We created the full API folder structure that will house the entire OpenCode SDK plus our custom orchestration:

```
src/main/api/
├── index.ts           # Main barrel export - exposes EVERYTHING
├── types.ts           # Custom types + re-export all SDK types
├── toji.ts            # Main orchestrator class
│
├── server/            # OpenCode server lifecycle management
├── client/            # OpenCode client management
├── workspace/         # Directory/workspace operations
├── session/           # Session management
├── project/           # Project management
├── tts/               # Future: Text-to-speech
└── stt/               # Future: Speech-to-text
```

**✅ Architecture Clarity**

- **API Layer**: Orchestrates and exposes (no implementations)
- **Services Layer**: Actual implementations (injected dependencies)
- **The Toji Class**: Main orchestrator that all interfaces use

## Next Session Implementation Plan

### 1. Wrap OpenCode SDK in Managers (HIGH PRIORITY)

**ServerManager**:

- Implement `start()` using `createOpencodeServer()`
- Move server lifecycle logic from current `core.ts`
- Handle server configuration and status

**ClientManager**:

- Implement `connect()` using `createOpencodeClient()`
- Manage client connection lifecycle
- Provide access to full SDK client

**SessionManager**:

- Wrap all SDK session methods (`session.prompt()`, `session.list()`, etc.)
- Enhance with convenience methods
- Handle current session tracking

**WorkspaceManager**:

- Move directory preparation logic from `core.ts`
- Handle git initialization
- Manage workspace switching

**ProjectManager**:

- Wrap SDK project methods (`project.list()`, `project.current()`)
- Add project template functionality

### 2. Implement Toji Orchestrator

**Main Methods**:

```typescript
await toji.initialize(directory, config) // Full setup
await toji.quickStart(directory) // Fast setup with defaults
await toji.shutdown() // Clean teardown
```

**Business Logic**:

```typescript
await toji.beAwesome() // Example orchestration
const status = toji.getStatus() // Overall system status
```

### 3. Migration Strategy

**Phase 1**: Implement core managers (server, client, workspace, session)
**Phase 2**: Create Toji orchestrator with initialize/shutdown
**Phase 3**: Update main process to use Toji instead of Core
**Phase 4**: Update preload/renderer to use new API structure

### 4. Key Implementation Notes

- **All 50+ SDK methods** must be accessible through managers or direct SDK import
- **All 226 SDK types** re-exported through api/index.ts
- **Clean dependency injection** - services injected into Toji constructor
- **Backward compatibility** - existing functionality preserved during migration

### 5. Success Criteria

- ✅ Full OpenCode SDK wrapped and accessible
- ✅ Toji orchestrator working with initialize/shutdown
- ✅ Electron app still functions with new API
- ✅ All TypeScript compilation passes
- ✅ Clean separation: API orchestrates, Services implement

## The End Goal

**Single API Entry Point**:

```typescript
// Any interface (Electron, Discord, Slack, CLI)
import { toji } from '@main/api'

await toji.initialize('/my/project')
const response = await toji.session.prompt('Hello')
await toji.beAwesome()
```

**Full SDK Access**:

```typescript
// Direct SDK access when needed
import { createOpencodeClient, type Session } from '@main/api'
```

**Modular Management**:

```typescript
// Individual managers
import { SessionManager, ProjectManager } from '@main/api'
```

## Architecture Vision Realized

This implementation will complete the vision:

- **Toji API** = The platform brain
- **OpenCode SDK** = One orchestrated service
- **Multiple Interfaces** = All talk to Toji
- **Clean Separation** = API/Services/Interfaces layers

The next session transforms this structure from stubs into a fully functional API platform! 🚀
