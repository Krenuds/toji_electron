# Discord Bot Integration Session Summary - 2025-09-18

## Session Objective Completed ✅
Successfully integrated Discord.js as a service layer that consumes the Toji API, enabling Discord users to interact with OpenCode AI through bot mentions.

## Architecture Decisions

### Layer Separation Philosophy
We established a critical architectural principle: **Discord is an interface, not part of the core API**

```
INTERFACES (all at same level):
├── Electron Renderer (UI)
├── Discord Bot         <-- NEW
├── Slack Bot
├── CLI
└── Voice Interface
     ↓ all consume

MAIN API:
Toji API (orchestrator)
     ↓ uses

CORE SERVICES:
OpenCode SDK
```

### Initial Mistake & Correction
- **Initial approach (incorrect)**: Added Discord to the Toji API class
- **Problem**: This violated separation of concerns - the API became aware of specific interfaces
- **Solution**: Removed Discord from Toji API, created Discord as a service that consumes Toji
- **Learning**: Business logic must remain in the API layer, interfaces are just consumers

## Implementation Details

### 1. Discord Service (`/src/main/services/discord-service.ts`)
- Created `DiscordService` class that manages Discord bot lifecycle
- Consumes Toji API through dependency injection
- Handles Discord events and routes messages to `toji.chat()`
- Implements message splitting for Discord's 2000 character limit
- Comprehensive logging for debugging connection issues

### 2. Configuration Management
Extended `ConfigProvider` with Discord token management:
```typescript
- getDiscordToken(): string | undefined
- setDiscordToken(token: string): void
- hasDiscordToken(): boolean
- clearDiscordToken(): void
```
- Token stored with electron-store encryption for security

### 3. IPC Bridge
Added Discord handlers to main process:
- `discord:connect` - Start bot with stored token
- `discord:disconnect` - Stop bot
- `discord:get-status` - Check connection status
- `discord:set-token` - Save token to config
- `discord:has-token` - Check token existence
- `discord:get-debug-info` - Detailed debugging info

### 4. Frontend Integration
- **Hook**: Created `useDiscord` hook for clean API abstraction
- **UI Component**: Updated Dashboard with Discord bot card
- **Chakra UI v3**: Learned correct composition pattern for Switch component

## Technical Challenges Resolved

### 1. Logging & Debugging
- Added comprehensive logging at every step of connection process
- Tracked connection states: disconnected, connecting, connected, error
- Implemented debug info method for troubleshooting

### 2. React Component Errors
- **Issue**: Switch component import error with Chakra UI v3
- **Solution**: Used correct composition pattern with nested components:
```jsx
<Switch.Root>
  <Switch.HiddenInput />
  <Switch.Control />
</Switch.Root>
```

### 3. Architecture Alignment
- **Issue**: Initial implementation polluted the Toji API with Discord-specific code
- **Solution**: Complete refactor to maintain clean separation
- **Result**: Discord operates as a pure consumer of the Toji API

## Testing & Verification

### What Works:
- ✅ Discord token stored securely with encryption
- ✅ Bot connects/disconnects from Dashboard toggle
- ✅ Connection status displays in real-time
- ✅ Bot appears online in Discord server
- ✅ Bot responds to mentions (routes through Toji -> OpenCode)
- ✅ Proper error handling and user feedback

## Key Learnings

1. **Services consume APIs, APIs don't know about services**
2. **Discord, Slack, CLI are peers at the interface layer**
3. **Chakra UI v3 uses composition patterns**
4. **Add comprehensive logging for debugging**

---

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

## Directory Selection and Workspace Management Plan

### Part A: Set Default Working Directory (API Layer)

1. **Wire up ConfigProvider to Toji** (`src/main/api/Toji.ts`)
   - Accept ConfigProvider in constructor (optional)
   - Use configured directory as default in `ensureReadyForChat()`
   - Update config when workspace changes (if config provided)

2. **Update main process initialization** (`src/main/index.ts`)
   - Import and instantiate ConfigProvider
   - Pass to Toji constructor
   - ConfigProvider persists default directory across app restarts

### Part B: Add Workspace Change to Toji API

1. **Add changeWorkspace method to Toji** (`src/main/api/Toji.ts`)

   ```typescript
   async changeWorkspace(directory: string): Promise<{
     isNew: boolean,
     hasGit: boolean,
     sessionId: string
   }> {
     // Check if this is a new or existing workspace
     const workspaceInfo = await this.workspace.inspect(directory)

     // Stop current server & sessions
     await this.shutdown()

     // Switch to new workspace
     await this.workspace.switch(directory)

     // Reinitialize in new workspace
     await this.initialize(directory)

     // Update config if provided
     if (this.config) {
       this.config.setOpencodeWorkingDirectory(directory)
     }

     // Create or restore session based on workspace state
     let sessionId: string
     if (workspaceInfo.hasExistingSessions) {
       // TODO: Restore previous session?
       const session = await this.session.create('Resumed Chat')
       sessionId = session.id
     } else {
       const session = await this.session.create('General Chat')
       sessionId = session.id
     }

     return {
       isNew: !workspaceInfo.hasGit,
       hasGit: workspaceInfo.hasGit,
       sessionId
     }
   }
   ```

### Part C: Workspace Identification Questions

**Key Questions to Resolve:**

1. **How do we identify an OpenCode workspace?**
   - Check for `.git` directory? (current approach)
   - Check for `.opencode` directory?
   - Check for `opencode.json` config?
   - Maintain a registry in electron-store?

2. **What workspace state should persist?**
   - Last active session ID?
   - Open files/tabs?
   - Terminal history?
   - Custom settings per workspace?

3. **Session-Workspace Relationship:**
   - Are sessions workspace-specific or global?
   - Can we have multiple sessions per workspace?
   - Should switching back to a workspace restore its session?

### Part D: UI Integration (Future - After API Complete)

1. **Add folder selection dialog** (`src/main/index.ts`)
   - `dialog:select-folder` - Opens native folder picker
   - Returns selected path or null

2. **Wire up UI buttons**
   - "New Chat" button calls changeWorkspace
   - "Start OpenCode" uses default or picker
   - Show loading states during transitions

3. **Update status displays**
   - Show current workspace path
   - Show workspace type (new/existing)
   - Update on workspace changes
