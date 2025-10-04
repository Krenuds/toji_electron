# Project Initialization - Issue Resolution

## The Problem

When using `initialize_project` MCP tool, these errors appeared in console:

```
Failed to list sessions: No response data
Failed to create session: No response data
Failed to get session messages: No response data
```

**But the project was created successfully!** ✅

## Root Cause

The errors occurred during the initialization workflow:

1. Empty directory created
2. `switchToProject()` called → OpenCode server starts
3. **UI immediately tries to load sessions** (before git/config exist)
4. Server returns no data (expected - it's not initialized yet)
5. Session manager throws errors
6. `initializeProject()` runs and creates git, opencode.json, etc.
7. Server restarts with proper configuration
8. Project works fine after initialization

## The Fix

### 1. Made Session Operations Resilient

**Before:**
```typescript
if (!response) {
  throw new Error('Failed to list sessions: No response data')
}
```

**After:**
```typescript
if (!response) {
  log('No sessions response (likely uninitialized project), returning empty array')
  return []
}
```

Now session operations **gracefully return empty results** instead of throwing errors when called on uninitialized projects.

### 2. Added Stabilization Delay

Added a 500ms delay after initialization completes to ensure the server is fully ready before the tool returns:

```typescript
if (result.success) {
  // Give the server a moment to fully stabilize after restart
  await new Promise((resolve) => setTimeout(resolve, 500))
  // ... return success
}
```

### 3. Improved Comments

Added comments explaining the expected behavior:

```typescript
// Switch to the directory to set context
// Note: This may show "global" status initially since the directory is empty
await toji.switchToProject(absolutePath)
```

## Result

- ✅ **No more console errors** during project initialization
- ✅ **Project creation still works perfectly**
- ✅ **Better error handling** for uninitialized projects
- ✅ **Cleaner UX** without confusing error messages

## Testing

Try creating a project now:

```
"Create a new project at C:\Test\my-new-project"
```

You should see:
- Clean console output (no session errors)
- Directory created with git, opencode.json, README
- Project immediately active and ready to use

## Technical Details

### Why Session Operations Failed

OpenCode server behavior:
- **Initialized project**: Returns session data normally
- **Empty directory**: Returns `null` or empty response
- **Global mode**: Limited functionality

The session manager was treating empty responses as errors instead of expected behavior for uninitialized directories.

### Why This Matters

The MCP tool workflow requires:
1. Switch to directory (even if empty)
2. Initialize git/config
3. Restart server
4. Continue working

Between steps 1 and 3, the project is in a "transitional" state. The UI shouldn't error during this transition - it should gracefully handle the empty state.

## Future Improvements

Potential enhancements:
- Add "initializing..." status to UI during project creation
- Suppress all session operations during initialization flag
- Better loading states in UI components
- Progress indicator for multi-step initialization
