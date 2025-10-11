# Startup Failure Investigation

## Problem Summary

Toji3 fails to start properly, leaving the app in an unusable state with no server running.

## Root Causes Identified

### Issue 1: Stale "Current Project" Reference

**Location**: `ConfigProvider.getCurrentProjectPath()`
**Symptom**: App tries to load `C:/Users/donth/testwork` which was deleted
**Log Evidence**:

```
[1760200992] DEBUG toji:startup: Loading project: C:/Users/donth/testwork
[1760200992] DEBUG toji:server: ERROR: Failed to create server for C:/Users/donth/testwork: Error: Failed to spawn OpenCode server: spawn C:\Users\donth\.local\share\opencode\bin\opencode.exe ENOENT
```

**Why This Happens**:

1. User was working on "testwork" project
2. ConfigProvider saved this as `projects.current` in electron-store
3. User deleted the `testwork` directory
4. On next startup, Toji tries to load deleted project
5. OpenCode server fails to spawn because working directory doesn't exist

**Root Cause**: ENOENT error is misleading - the binary EXISTS, but Node.js can't spawn because the `cwd` (working directory) doesn't exist!

### Issue 2: No Fallback Server

**Location**: `src/main/index.ts` line 165
**Symptom**: When server startup fails, NO fallback server is created
**Result**: App continues running but is completely non-functional

**Log Evidence**:

```
[1760201490] ERROR toji:chat: Streaming chat failed - no client connected: Client not connected to server
[1760201450] DEBUG toji:core: Client not connected, returning empty project list
```

The app loaded Discord, registered all MCP services, but has NO OpenCode server running at all.

## Technical Analysis

### The Spawn Problem

From Node.js documentation, `child_process.spawn()` throws ENOENT when:

1. ✅ The executable doesn't exist (NOT our case - binary is at `C:\Users\donth\.local\share\opencode\bin\opencode.exe`)
2. ✅ **The working directory doesn't exist** (THIS is our case!)

When Toji calls:

```typescript
await toji.server.start(undefined, lastProject) // lastProject = "C:/Users/donth/testwork"
```

The OpenCode SDK internally does:

```typescript
spawn(binaryPath, args, { cwd: lastProject }) // cwd doesn't exist → ENOENT
```

### The Missing Fallback

Current flow:

```typescript
try {
  const lastProject = config.getCurrentProjectPath() || config.getOpencodeWorkingDirectory()
  await toji.server.start(undefined, lastProject) // ← Throws if project deleted
  await toji.connectClient(lastProject)
  // ... rest of startup
} catch (error) {
  loggerStartup.debug('ERROR: Failed during OpenCode initialization: %o', error)
  throw error // ← Re-throws, but app keeps running!
}
```

**Problem**: The error is logged and thrown, but the app doesn't have a fallback strategy.

## Solution Design

### Fix 1: Validate Project Before Starting Server

**Where**: `src/main/index.ts` startup sequence
**What**: Check if project directory exists before trying to start server

```typescript
const lastProject = config.getCurrentProjectPath() || config.getOpencodeWorkingDirectory()

// NEW: Validate project directory exists
const fs = await import('fs')
if (!fs.existsSync(lastProject)) {
  loggerStartup.warn('Last project directory no longer exists: %s', lastProject)
  loggerStartup.warn('Falling back to current working directory')
  config.setCurrentProjectPath(config.getOpencodeWorkingDirectory())
  lastProject = config.getOpencodeWorkingDirectory()
}
```

### Fix 2: Always Start a Fallback Server

**Where**: `src/main/index.ts` catch block
**What**: If project-specific server fails, start a "global" server on CWD

```typescript
try {
  await toji.server.start(undefined, lastProject)
  await toji.connectClient(lastProject)
} catch (error) {
  loggerStartup.error('Failed to start project server: %o', error)
  loggerStartup.info('Starting fallback global server on: %s', process.cwd())

  try {
    // Start server on current working directory as fallback
    await toji.server.start(undefined, process.cwd())
    await toji.connectClient(process.cwd())
    config.setCurrentProjectPath(process.cwd())
    loggerStartup.info('✅ Fallback server started successfully')
  } catch (fallbackError) {
    loggerStartup.error('❌ CRITICAL: Fallback server also failed: %o', fallbackError)
    throw fallbackError
  }
}
```

### Fix 3: Improve Error Message

**Where**: `src/main/toji/server.ts` spawn error handler
**What**: Detect and report ENOENT more accurately

```typescript
catch (error) {
  if (error.code === 'ENOENT') {
    // Check what actually doesn't exist
    const binaryExists = existsSync(binaryPath)
    const cwdExists = existsSync(directory)

    if (!cwdExists) {
      throw new Error(
        `Cannot start OpenCode server: Working directory does not exist\n` +
        `Directory: ${directory}\n` +
        `Hint: The project may have been deleted or moved`
      )
    } else if (!binaryExists) {
      throw new Error(
        `Cannot start OpenCode server: Binary not found\n` +
        `Binary path: ${binaryPath}\n` +
        `Hint: Run OpenCode installation check`
      )
    }
  }
  throw error
}
```

## Recommended Implementation Order

1. **Fix 3 first** - Better error messages help debugging
2. **Fix 1 second** - Prevent the problem proactively
3. **Fix 2 last** - Safety net if validation fails

## Testing Plan

1. Set current project to a deleted directory in config
2. Restart Toji
3. Verify fallback server starts on CWD
4. Verify app is functional (can list projects, create sessions)
5. Switch to a real project
6. Verify normal operation resumes

## Related Files

- `src/main/index.ts` - Startup sequence
- `src/main/config/ConfigProvider.ts` - Current project storage
- `src/main/toji/server.ts` - Server spawn logic
- `src/main/services/opencode-service.ts` - Binary management

## Additional Observations

The binary IS installed at:

```
C:\Users\donth\.local\share\opencode\bin\opencode.exe (146MB)
```

System also has npm-installed OpenCode at:

```
C:\Users\donth\AppData\Roaming\npm\node_modules\opencode-ai\bin\opencode.cmd
```

Both installations are valid, but Toji uses the first one (`.local/share/opencode`).
