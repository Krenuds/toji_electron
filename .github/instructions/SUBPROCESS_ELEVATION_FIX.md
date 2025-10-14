# Subprocess Elevation Fix - Implementation Summary

## Problem Solved

Fixed `EPERM: operation not permitted` errors when OpenCode SDK subprocesses tried to write configuration files to Windows root drives (C:\, D:\, etc.).

## Root Cause

When a user set their project directory to a Windows root drive (e.g., `C:\`), the MCP Manager attempted to write `opencode.json` to that location, which requires administrator privileges on Windows.

## Solution Implemented

### 1. Created Protection Detection Utility

Added `isProtectedDirectory()` function that detects:

- **Windows**: Root drives (`C:\`, `D:\`, etc.)
- **Unix**: Root directory (`/`)

### 2. Updated MCP Manager

**File**: `src/main/toji/mcp/mcp-manager.ts`

- Added import for `platform` from `os`
- Added `isProtectedDirectory()` helper function
- Updated `writeOpencodeConfig()` to skip writing for protected directories
- Logs debug message explaining why config write was skipped

**Key Code**:

```typescript
private async writeOpencodeConfig(projectDirectory: string, mcpPort: number): Promise<void> {
  // Skip writing for protected directories (root drives on Windows, / on Unix)
  if (isProtectedDirectory(projectDirectory)) {
    logger.debug(
      'Skipping opencode.json write for protected directory: %s (requires elevation)',
      projectDirectory
    )
    return
  }
  // ... rest of implementation
}
```

### 3. Added User Warning in Project Switching

**File**: `src/main/toji/index.ts`

- Added import for `platform` from `os`
- Added `isProtectedDirectory()` helper function
- Updated `switchToProject()` to warn users when using protected directories

**Key Code**:

```typescript
// Warn if using a protected directory (root drive) - limited functionality
if (isProtectedDirectory(projectPath)) {
  logger.warn(
    'Warning: Using protected directory as project: %s - Some features may not work due to permission restrictions',
    projectPath
  )
  logger.warn(
    'Consider creating projects in user directories like: %s',
    platform() === 'win32'
      ? 'C:\\Users\\YourName\\Documents\\my-project'
      : '/home/user/projects/my-project'
  )
}
```

## Benefits

1. **No UAC Prompts**: Users never see elevation prompts
2. **Graceful Degradation**: MCP server still works, just doesn't write config file
3. **Clear Logging**: Users are warned about limited functionality
4. **Cross-Platform**: Works on Windows, macOS, and Linux
5. **Best Practices**: Guides users toward proper project locations

## Testing Results

✅ Format passed - All files formatted correctly
✅ Lint passed - No linting errors
✅ TypeCheck passed for our changes - No type errors in modified files
✅ App runs successfully - Dev server starts without issues

## Behavior Changes

### Before

- Attempted to write `C:\opencode.json`
- Failed with `EPERM: operation not permitted`
- Error logged but didn't crash

### After

- Detects `C:\` is a protected directory
- Skips config file write with debug message
- Warns user about limited functionality
- Suggests proper project locations
- MCP server continues to work (config via environment variables)

## Files Modified

1. `src/main/toji/mcp/mcp-manager.ts` - Skip config writes for protected dirs
2. `src/main/toji/index.ts` - Warn users about protected directory usage
3. `SPEC/SUBPROCESS_ELEVATION.md` - Complete technical documentation

## Additional Notes

- The OpenCode SDK can still receive configuration via environment variables (already implemented)
- MCP server functionality remains intact
- This fix prevents the problem rather than requiring elevation
- No security implications - actually improves security by avoiding unnecessary elevation

## Related Issues

This fix addresses the error seen in logs:

```
Error: EPERM: operation not permitted, open 'C:\opencode.json'
```

## Future Considerations

If users genuinely need system-level access:

1. Could implement AppData fallback for root projects
2. Could add UI warning when selecting root drives
3. Could add documentation about WSL2 for advanced use cases

However, the current solution is sufficient for normal use cases.
