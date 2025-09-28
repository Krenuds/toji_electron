# NEXT: OpenCode Project Discovery Fix

## Executive Summary

The OpenCode server spawns from one directory and stays there forever, causing file discovery issues when switching projects. The current code blindly reuses any existing server without checking where it's running from.

## The Investigation Journey

### Initial Symptoms

- User reported: "tester" project wasn't being recognized as valid
- CNC project worked fine
- Both had .git directories, but different behavior
- Files couldn't be seen initially in test2, then suddenly appeared

### Key Discoveries

#### 1. The Server Spawn Location Problem

**What we found:** The OpenCode server is a subprocess that spawns from a specific directory and STAYS THERE.

- When app starts, server spawns from home directory (C:\Users\donth)
- The server process keeps running from that original directory
- `process.chdir()` only changes Node.js process directory, NOT the OpenCode subprocess

**Evidence:**

- Tested by spawning servers from different directories
- Used `/path` endpoint to verify actual server location
- Confirmed subprocess working directory is fixed at spawn time

#### 2. The Blind Reuse Logic

**Current broken behavior (src/main/toji/server.ts lines 40-62):**

- Checks if ANY server is running on port 4096
- If yes, connects to it WITHOUT checking where it's running from
- This means switching projects doesn't actually move the server

**Why this breaks:** Server running from toji3 can't properly see files in Desktop/tester

#### 3. Git Commit Requirement

**Discovery:** OpenCode requires at least one git commit to recognize a project

- Directory with .git but no commits = "global" project
- After creating initial commit, tester was properly recognized
- This explains why some projects work and others don't

#### 4. Path Format Chaos

**Critical finding from user conversation:**

```
User: What files are in this folder?
Toji: There are no files in this folder.
User: We are in C:\Users\donth\OneDrive\Desktop\test2
User: look again
Toji: The folder contains: index.html
```

**Path format issues:**

- Windows uses backslashes: `C:\Users\donth\toji3`
- OpenCode returns mixed formats: `C:/Users/donth/toji3` or with trailing slashes
- The "list" tool was returning `C:\Users\donth\OneDrive\Desktop/` (mixed separators!)
- Path comparison fails due to format mismatches

## The Solution

### Core Principle

Each project needs its own OpenCode server running FROM that project's directory.

### Implementation Strategy

#### Step 1: Add Server Directory Detection

- Use `/path` endpoint to get server's actual working directory
- This tells us WHERE the subprocess is running from

#### Step 2: Smart Server Reuse

- Before reusing a server, check if it's in the RIGHT directory
- Compare target project path with server's current directory
- Only reuse if they match; otherwise restart

#### Step 3: Proper Path Normalization

**Critical for Windows:**

- Remove all trailing slashes
- Convert all paths to forward slashes for comparison
- Handle mixed Unix/Windows formats from OpenCode
- Example: `C:\Users\donth\toji3\` → `C:/Users/donth/toji3`

#### Step 4: Remove Misleading Code

- Delete all `process.chdir()` calls - they don't help
- Remove the blind server reuse logic
- The spawn directory is what matters, not Node's cwd

## Why Previous Fixes Failed

### Path Normalization Attempts

- We tried normalizing paths but didn't handle ALL cases
- Missed trailing slashes
- Didn't account for OpenCode returning different formats

### process.chdir() Confusion

- We thought changing Node's directory would help
- But OpenCode subprocess doesn't inherit directory changes
- Led to false assumptions about where things were running

### The "Global" Project Mystery

- Didn't initially understand this meant "no git commits"
- Wasted time thinking it was a path issue
- Actually two separate problems: spawn location AND git commits

## Implementation Checklist

### Files to Modify

1. **src/main/toji/server.ts**
   - Add `getServerDirectory()` method using `/path` endpoint
   - Modify `start()` to check directory before reuse
   - Remove blind reuse logic (lines 40-62)
   - Add proper path normalization

2. **src/main/toji/index.ts**
   - Update `switchToProject()` to pass directory to server
   - Remove ALL `process.chdir()` calls
   - Add logging for debugging

3. **src/main/index.ts**
   - Consider starting from last project instead of home
   - Pass proper directory to initial server start

4. **Path Normalization Utility**
   - Create consistent path normalization function
   - Strip trailing slashes
   - Convert to forward slashes
   - Handle edge cases

## Testing Requirements

1. **Project Switching**
   - Switch between multiple projects
   - Verify server restarts when needed
   - Confirm files are visible immediately

2. **Path Edge Cases**
   - Paths with spaces
   - OneDrive paths
   - Network drives
   - Paths with special characters

3. **Git Status Variants**
   - Repo with commits (should work)
   - Repo without commits (shows as "global")
   - Non-git directory (shows as "global")

4. **Performance**
   - Server restart takes ~6 seconds
   - Need loading state in UI
   - Consider debouncing rapid switches

## Potential Gotchas

1. **Timing Issues**
   - Killing process isn't instant
   - Starting server takes time
   - Need proper await/async handling

2. **Port Conflicts**
   - Only one server can use port 4096
   - Must ensure old server is dead before starting new

3. **Windows-Specific Issues**
   - Path separators
   - Case sensitivity
   - Drive letters
   - UNC paths

4. **Error Handling**
   - Server might fail to start
   - Directory might not exist
   - Permissions issues

## Success Criteria

1. Switching to any project immediately shows correct files
2. No more "global" projects (except repos without commits)
3. Server only restarts when necessary (different directory)
4. Path formats don't cause comparison failures
5. Clear logging shows what's happening

## Next Session Action Plan

1. **Start with clean slate**
   - Kill all OpenCode processes
   - Clear any cached state
   - Start fresh dev environment

2. **Implement in order**
   - Path normalization utility first
   - Server directory detection second
   - Smart restart logic third
   - Remove old code last

3. **Test incrementally**
   - Test each change in isolation
   - Use test scripts from Desktop/opencode-test
   - Verify with multiple projects

## The Core Insight

The OpenCode server is a subprocess that runs from a fixed directory. To work with different projects, we need different servers OR we need to restart the server from the new project directory. The current code doesn't do either - it just reuses whatever server is running, regardless of where it's running from.

This is why files weren't visible initially - the server was looking in the wrong place!

## Remember

- OpenCode subprocess working directory is FIXED at spawn time
- `process.chdir()` is a red herring - ignore it
- Path normalization is CRITICAL on Windows
- Git commits are REQUIRED for project recognition
- The `/path` endpoint is our friend - use it!
