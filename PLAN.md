# Workspace-First UI and ConfigManager Integration Plan

## Current State Analysis

The recent commit (`f4dbb43`) implemented a workspace-first UI architecture that:

### What's Working

1. **Extracts workspaces from sessions** - `getWorkspacesFromSessions()` method derives unique workspace paths from session data
2. **Shows workspace cards** - Clean UI with folder name, path, session count, and last activity
3. **Removed SessionsModal** - Replaced complex modals with direct file browser integration
4. **ConfigProvider has infrastructure** - Already has methods for recent workspaces (`addRecentWorkspace`, `getRecentWorkspaces`, etc.)

### Integration Gaps

- `changeWorkspace()` updates the default working directory but **doesn't track it as a recent workspace**
- Recent workspaces are stored in ConfigProvider but **not being populated** when workspaces are opened
- The workspace-first UI relies solely on sessions for discovery but **doesn't persist workspace preferences**
- No workspace-specific settings storage (themes, preferences per workspace)

## Proposed Solution

### Step 1: Wire Up Recent Workspace Tracking

**File:** `src/main/api/toji.ts`

- Update `changeWorkspace()` method to call `config.addRecentWorkspace(directory)` after successful workspace change
- This ensures every workspace switch is tracked in persistent storage
- Recent workspaces will survive app restarts

### Step 2: Create Hybrid Workspace Discovery

**File:** `src/main/api/toji.ts`

- Enhance `getWorkspacesFromSessions()` to merge session-derived workspaces with config-stored recent workspaces
- Priority order:
  1. Recent workspaces from config (even if no sessions yet)
  2. Session-derived workspaces not in recent list
- This prevents "losing" workspaces between sessions

### Step 3: Add Workspace-Specific Settings Storage

**File:** `src/main/config/ConfigProvider.ts`

- Add new methods for per-workspace settings:
  - `getWorkspaceSettings(path: string): WorkspaceSettings`
  - `setWorkspaceSettings(path: string, settings: WorkspaceSettings): void`
- Structure: `workspaces.settings[path]` in the config store
- Enables workspace customization persistence (theme, preferences, etc.)

### Step 4: Update UI Components

**Files:** Various UI components in `src/renderer/`

- Update `useWorkspaces` hook to use the enhanced API that merges recent + session workspaces
- Ensure "Open in Chat" button updates recent workspaces
- Add workspace removal from recent list when deleted/moved

### Step 5: Clean Up and Optimize

- Remove unused workspace collection methods if redundant
- Consolidate workspace discovery logic into single source of truth
- Keep the simple workspace model (path, name, sessionCount, lastActivity)

## Implementation Order

1. **Update `changeWorkspace()`** - Add `config.addRecentWorkspace(directory)` call
2. **Enhance `getWorkspacesFromSessions()`** - Merge with recent workspaces from config
3. **Add workspace settings to ConfigProvider** - New methods for per-workspace config
4. **Update UI components** - Use merged workspace list
5. **Test persistence** - Verify workspaces persist across app restarts

## Testing Checklist

- [ ] Workspace changes are tracked in recent list
- [ ] Recent workspaces appear even without sessions
- [ ] Workspace list combines both recent and session-based discovery
- [ ] Per-workspace settings persist
- [ ] UI reflects merged workspace list correctly
- [ ] App restart maintains workspace history

## Benefits

1. **Better UX** - Users see their workspace history even without active sessions
2. **Persistence** - Workspace preferences survive app restarts
3. **Flexibility** - Support for per-workspace customization
4. **Clean Architecture** - Single source of truth for workspace management
5. **Future-Ready** - Foundation for advanced workspace features

## Next Immediate Action

Start with Step 1: Update the `changeWorkspace()` method in `src/main/api/toji.ts` to add the workspace to recent list whenever a workspace is opened or changed.
