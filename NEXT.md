# NEXT SESSION: Fix Session Data Loading on App Launch

## Current Problem

Despite implementing session restoration events and backend coordination, the chat window remains empty when the application launches. The user sees:

- ❌ "Chatting with No Project"
- ❌ Empty chat window with no message history
- ❌ "Select a project to start chatting..." message
- ✅ Server shows "Online" status
- ✅ Sessions are visible in sidebar (showing global sessions)
- ✅ All other features working perfectly

## What We Attempted This Session

### ✅ Implemented Complete Event-Based Architecture

1. **Backend Event Emission** (`src/main/toji/index.ts:127-136`)
   - Added session restoration event broadcasting
   - Emits `session:restored` with session data after restoration
   - Uses established BrowserWindow pattern

2. **Preload API Extension** (`src/preload/api/toji.api.ts:53-65`)
   - Added `onSessionRestored()` listener following binary.api.ts pattern
   - Clean subscription/cleanup mechanism

3. **Frontend Coordination** (`src/renderer/src/components/views/chat/ChatViewMain.tsx`)
   - Initialization effect with server status check
   - Session restoration event listener
   - Retry logic for race conditions (300ms, 600ms retries)
   - Enhanced message syncing with logging

### ✅ Quality Assured

- All linting passes
- TypeScript compilation successful
- Proper import statements (fixed require() issue)
- Code formatting applied

## Root Cause Analysis

### The Core Issue: Project vs Session Scoping

Looking at the screenshot, the fundamental problem is **project context mismatch**:

1. **Backend restores session** for `C:\Users\donth\toji3` project
2. **Frontend shows "No Project"** - projectInfo is null/undefined
3. **Sessions appear global** - showing sessions without project context
4. **Message loading fails** - no project means no session context

### Critical Gaps Identified

#### 1. Project Loading Race Condition

```typescript
// ChatViewMain.tsx - These run independently:
const { projectInfo, isChangingProject } = useProjects() // May be null on startup
const sessionInfo = await getCurrentSession() // Depends on project context
```

#### 2. Auto-Start vs Project State Mismatch

- Backend auto-starts OpenCode for `C:\Users\donth\toji3`
- Frontend `useProjects()` hook doesn't know about auto-started project
- Result: Backend has project, Frontend thinks no project loaded

#### 3. Session Restoration Happens Before Project Loading

- Session restoration occurs during `connectClientToProject()`
- Frontend hasn't received project info yet
- Event fires but frontend has no context to display data

## Investigation Plan for Next Session

### Phase 1: Trace Project Loading Flow

1. **Examine useProjects() hook** - why isn't auto-started project appearing?
2. **Check project state management** - is auto-start updating frontend state?
3. **Verify IPC project handlers** - are project events being emitted?

### Phase 2: Fix Project/Session Coordination

1. **Ensure project loading before session restoration**
2. **Add project context to session events**
3. **Fix projectInfo display in ChatViewMain**

### Phase 3: Session Data Loading After Project Context

1. **Verify message loading works with proper project context**
2. **Test session switching within project scope**
3. **Ensure "Chatting with [ProjectName]" displays correctly**

## Key Files to Investigate

### Backend Project Management

- `src/main/toji/project.ts` - Project opening logic
- `src/main/index.ts:117-130` - Auto-start sequence
- `src/main/handlers/project.handlers.ts` - Project IPC handlers

### Frontend Project State

- `src/renderer/src/hooks/useProjects.ts` - Project state management
- `src/renderer/src/hooks/useOpenProject.ts` - Project opening
- Project event handling in ChatViewMain

### Session/Project Integration Points

- When does project info update frontend state?
- How does session restoration coordinate with project loading?
- Are we emitting project events after auto-start?

## Immediate Debugging Steps

1. **Add console.log to project hooks** - trace when projectInfo updates
2. **Check project event emission** - does auto-start emit project events?
3. **Verify project context in session APIs** - is currentProjectDirectory set?
4. **Test manual project opening** - does it work vs auto-start?

## Expected Outcome After Fix

```
App Launch → Auto-start project → Update frontend projectInfo → Restore session → Load messages
     ↓              ↓                      ↓                       ↓              ↓
✅ OpenCode     ✅ Project opened      ✅ "Chatting with toji3"  ✅ Session active  ✅ Messages display
   starts          in backend            displayed in UI        with history       in chat window
```

## Status: Ready for Deep Debugging

The event architecture is solid and working. The issue is **project context coordination** between backend auto-start and frontend state management. Once we fix the project loading flow, the session data will automatically populate correctly.

All quality infrastructure is in place. This is a coordination bug, not an architectural issue.
