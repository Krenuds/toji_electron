# Subprocess Elevation on Windows

## Problem

When running OpenCode SDK subprocesses on Windows, certain operations fail with `EPERM: operation not permitted` errors. This happens specifically when:

1. **Writing to protected directories** (like `C:\opencode.json`)
2. **The project root is a drive letter** (e.g., `C:` or `/` resolving to `C:\`)

## Root Cause

The MCP Manager attempts to write `opencode.json` to the project directory. When the project directory is `C:\`, this requires administrator privileges on Windows.

## Solutions (In Order of Preference)

### 1. ✅ Prevent Using Protected Directories (IMPLEMENTED)

**Status:** Primary solution
**Impact:** No elevation needed

**Implementation:**

- Detect when project directory is a Windows root drive (`C:\`, `D:\`, etc.)
- Warn user and prevent using root drives as projects
- Gracefully skip config file writes for root drives
- Guide users to proper project directories

**Benefits:**

- No security prompts for users
- Follows Windows best practices
- No special permissions needed

### 2. 🔧 Fallback to AppData for Root Projects

**Status:** Secondary solution
**Impact:** Moderate

**Implementation:**

- Store `opencode.json` in `%APPDATA%\toji3\project-configs\<drive-letter>\` when project is a root drive
- Inject config via environment variable to OpenCode SDK
- Keep project directory clean

### 3. ⚠️ Run Electron as Administrator (NOT RECOMMENDED)

**Status:** Last resort
**Impact:** High security risk

**Why Not:**

- Requires UAC prompt on every launch
- All subprocesses inherit elevated permissions
- Security anti-pattern
- Users may reject/distrust the app

### 4. 🛠️ Per-Subprocess Elevation (COMPLEX)

**Status:** Possible but overkill
**Impact:** Moderate complexity

**Implementation:**

```typescript
import { spawn } from 'child_process'
import { platform } from 'os'

function spawnElevated(command: string, args: string[]): ChildProcess {
  if (platform() === 'win32') {
    // Use PowerShell Start-Process with -Verb RunAs
    return spawn('powershell.exe', [
      '-Command',
      `Start-Process -FilePath "${command}" -ArgumentList "${args.join(' ')}" -Verb RunAs -Wait`
    ])
  } else {
    // Use sudo on Unix-like systems
    return spawn('sudo', [command, ...args])
  }
}
```

**Why Not for Toji:**

- Requires UAC prompt for every OpenCode server start
- Poor user experience
- Unnecessary if we avoid protected directories

## Implementation Strategy

### Phase 1: Detect and Warn ✅

```typescript
function isProtectedDirectory(directory: string): boolean {
  if (platform() === 'win32') {
    // Check if it's a root drive (C:\, D:\, etc.)
    return /^[A-Z]:\\?$/i.test(directory)
  }
  return directory === '/'
}
```

### Phase 2: Skip Config Writes for Protected Dirs ✅

```typescript
private async writeOpencodeConfig(projectDirectory: string, mcpPort: number): Promise<void> {
  // Skip writing for protected directories
  if (isProtectedDirectory(projectDirectory)) {
    logger.debug('Skipping opencode.json write for protected directory: %s', projectDirectory)
    return
  }

  const configPath = path.join(projectDirectory, 'opencode.json')
  // ... rest of implementation
}
```

### Phase 3: Guide Users

Show helpful messages when users try to use root drives:

```
⚠️ Cannot use C:\ as a project root.
Please create a project in a user directory like:
  C:\Users\YourName\Documents\my-project
  C:\Projects\my-project
```

## Testing Checklist

- [ ] Detect `C:\` as protected directory
- [ ] Skip config writes for `C:\`
- [ ] MCP server still starts (config via env var)
- [ ] Proper error messages to user
- [ ] Normal projects (non-root) work unchanged
- [ ] Unix `/` handled correctly

## Alternative: Docker/WSL Approach

For advanced users who need system-level access:

1. Run OpenCode SDK in WSL2
2. Mount Windows directories via `/mnt/c/`
3. No elevation needed in WSL

This is outside Toji's scope but worth documenting for power users.

## Conclusion

**The best solution is to prevent the problem** by disallowing root drives as projects and gracefully handling config writes. This requires zero elevation, zero UAC prompts, and provides the best user experience.

Elevation should only be considered if:

- User explicitly needs system-level access
- Task genuinely requires admin rights
- No alternative workaround exists

For Toji, none of these conditions apply.
