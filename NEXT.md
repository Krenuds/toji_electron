# NEXT.md - Architectural Discovery & Refactor Plan

## Key Discovery Today

**We've been treating OpenCode wrong.** 

- **OLD THINKING:** OpenCode = Server management (persistent server, route clients to it)
- **NEW REALITY:** OpenCode = Agent management (ephemeral agents per project, multiple clients per agent)

## The Fundamental Shift

### What OpenCode Actually Is
- **Server = AI Agent brain** (holds context, conversation, project knowledge)  
- **Clients = Different interfaces** (TUI, web, mobile, VS Code, our Electron app)
- **One agent per project/folder** - agents are tied to directories
- **Multiple clients can connect** to same agent for collaboration

### What This Means for Our Architecture
- **Agents are ephemeral** - start/stop per project as needed
- **Sessions persist independently** - can reconnect to agents later
- **No "server management"** - just spawn agents when needed
- **API layer manages SDK directly** - no complex service routing

## Refactor Plan

### OpenCodeService → Binary Management Only
```
KEEP:
- Binary download/installation  
- Platform compatibility
- Path configuration

REMOVE:
- createOpencodeServer() calls
- Server lifecycle management  
- Health checking
- Status tracking
```

### Core → API Layer (Agent Management)
```
MOVE HERE FROM SERVICE:
- createOpencodeServer() calls
- createOpencodeClient() calls
- Session management
- Project switching

RENAME:
- src/main/core/ → src/main/api/
- Core becomes the central API hub
```

### New Mental Model
```
Electron/Discord → API Layer → OpenCode SDK → Agents (per project)
                             ↓
                    Services (binary management only)
```

## Implementation Strategy

1. **Examine current bloat** - 663 lines between 2 files is too much
2. **Strip unnecessary complexity** - over-engineered from yesterday's figuring-it-out
3. **Move SDK calls to API layer** - clean separation of concerns  
4. **Simplify OpenCodeService** - just "is binary installed and executable?"
5. **Test with simple agent spawn/connect pattern**

## Why This Simplifies Everything

- **No service management complexity** - just spawn agents as needed
- **No server pooling or routing** - each project gets its own agent  
- **Clean separation** - infrastructure vs API vs SDK
- **Matches OpenCode's actual design** - directory-bound agents with multi-client support

**Bottom line:** We discovered OpenCode's true architecture and can now build with the grain instead of against it.