# Toji3 Server Architecture - Handoff Notes

## Current State: Multi-Server OpenCode Integration

### The Big Picture

Toji3 now runs **multiple OpenCode servers simultaneously** - one per project directory. When you switch between projects in the UI, you're not restarting servers, you're connecting to different ones that are already running. This makes project switching instant and maintains separate contexts for each project.

### How It Works

**Server Management**
The `ServerManager` class orchestrates a pool of up to 10 OpenCode servers. Each server runs from its specific project directory, which is critical because OpenCode needs to understand the project context (git repo, config files, etc).

When you switch to a project:

1. ServerManager checks if a server already exists for that directory
2. If yes, it reuses it (instant switch)
3. If no, it spawns a new server from that directory
4. If we hit the 10-server limit, it kills the least recently used one

**Server Spawning**
The spawning logic lives directly in ServerManager as a private method. It:

- Uses the full binary path from our shared utilities
- Sets the working directory (cwd) to the project folder
- Monitors stdout for "opencode server listening" to know when ready
- Handles timeouts, port conflicts, and permission errors gracefully

**Binary Management**
The OpenCode binary installation is handled separately by `OpenCodeService`. It:

- Downloads the binary from GitHub releases if missing
- Stores it in `~/.local/share/opencode/bin/`
- Provides binary status to the UI

### Architecture Clarity

We have three distinct layers:

1. **Binary Management** (`services/opencode-service.ts`) - Downloads and verifies the OpenCode executable
2. **Server Pool** (`toji/server.ts`) - Manages multiple server instances, spawning, health checks
3. **Client Connection** (`toji/index.ts`) - Connects SDK clients to the appropriate server

Each layer has a single, clear responsibility. No overlap, no confusion.

### Key Design Decisions

**Why Multiple Servers?**
OpenCode servers are lightweight but stateful. They maintain context about the project they're running from. By keeping servers alive per directory, we avoid expensive restarts and maintain project context.

**Why CWD Matters**
OpenCode discovers projects by looking at the current working directory. It needs to see the git repo, opencode.json config, and project files. That's why each server MUST be spawned with its project directory as the cwd.

**Health Monitoring**
Every 30 seconds, ServerManager pings each server. If a server dies, it's marked unhealthy and will be respawned on next use. The app also does aggressive cleanup on shutdown, killing all OpenCode processes.

### What's Clean Now

- **No more patches** - The spawning logic is a first-class citizen in ServerManager
- **Shared utilities** - Binary paths are centralized in `utils/path.ts`
- **Clear naming** - Each file name describes what it does
- **No code duplication** - Each piece of logic lives in exactly one place

### Working With This System

When debugging server issues:

1. Check the logs at `AppData/Roaming/toji3/logs/`
2. Look for `toji:server` entries for spawning/stopping
3. Health check failures are normal for stopped servers
4. Port 4096-4106 are reserved for OpenCode servers

The system is resilient - it handles binary missing, ports busy, servers dying, and other edge cases. The multi-server architecture means users never wait for server restarts when switching projects.

### Next Steps & Improvements

The foundation is solid. Potential enhancements:

- Dynamic port allocation beyond the fixed range
- Configurable max server limit
- Warm-start servers for frequently used projects
- Server resource monitoring and auto-cleanup

The architecture is ready for these without major refactoring. The clean separation of concerns means changes stay localized to their relevant components.
