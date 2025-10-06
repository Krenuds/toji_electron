# Service Registry Refactoring - Complete ✅

**Date:** October 6, 2025
**Status:** COMPLETE - All checks pass

## Problem Statement

The codebase had a **circular dependency** between `DiscordPlugin` → `Toji` → `DiscordPlugin` through direct setter methods:

```text
❌ OLD FLOW:
DiscordService
  → DiscordPlugin (dynamic import)
    → Toji instance (constructor param)
      → setDiscordMessageFetcher() ← CIRCULAR BACK TO PLUGIN
      → setDiscordFileUploader()
      → setDiscordChannelLister()
      → setDiscordChannelInfoProvider()
      → setDiscordMessageSearcher()
```

This created tight coupling and made the system hard to test and extend.

---

## Solution Implemented

Replaced direct setters with a **Service Registry Pattern**:

```text
✅ NEW FLOW:
DiscordPlugin
  → Creates MCP services
  → Registers via Toji.registerMCPService(name, service)
    → Toji stores in registry (Map<string, unknown>)
    → Toji.mcp.registerService(name, service)
      → McpManager stores in registry
      → Auto-registers with all existing MCP servers
```

**Benefits:**

- ✅ No circular dependencies
- ✅ Clean separation of concerns
- ✅ Easy to test in isolation
- ✅ Plugin can be added/removed without core changes
- ✅ Type-safe service access

---

## Files Changed

### 1. `src/main/toji/index.ts`

- ❌ **Removed:** 5 direct setter methods (`setDiscordMessageFetcher`, etc.)
- ❌ **Removed:** Discord type imports
- ✅ **Added:** Service registry (`Map<string, unknown>`)
- ✅ **Added:** `registerMCPService<T>(name, service)` method
- ✅ **Added:** `getMCPService<T>(name)` method
- ✅ **Added:** `hasMCPService(name)` method

### 2. `src/main/toji/mcp/mcp-manager.ts`

- ❌ **Removed:** 5 private Discord service properties
- ❌ **Removed:** 5 setter methods (`setDiscordMessageFetcher`, etc.)
- ✅ **Added:** Generic service registry (`Map<string, unknown>`)
- ✅ **Added:** `registerService<T>(name, service)` method
- ✅ **Added:** `getService<T>(name)` method
- ✅ **Added:** `registerServiceWithAllServers()` private method
- ✅ **Added:** `registerServiceWithServer()` private method (switch statement)

### 3. `src/plugins/discord/DiscordPlugin.ts`

- ✅ **Updated:** `onReady()` method to use `toji.registerMCPService()` instead of setters
- ✅ **Kept:** Private service properties (needed for context updates)

**Service Names Registered:**

- `discord:messages`
- `discord:upload`
- `discord:channels`
- `discord:channel-info`
- `discord:search`

---

## Quality Gates Passed ✅

```bash
npm run format   # ✅ All files formatted
npm run lint     # ✅ No linting errors
npm run typecheck:node  # ✅ No type errors
npm run graph    # ✅ No red circular dependencies
```

**Verification:**

- ✅ No references to old setters (`setDiscordMessageFetcher`, etc.)
- ✅ No circular dependencies in architecture graph
- ✅ All type definitions correct
- ✅ Clean separation: Main Process → Service Registry → Plugins

---

## Architecture Impact

### Before (Circular Dependency):

```
Toji ←→ DiscordPlugin (tight coupling via setters)
```

### After (Service Registry):

```
Toji ← DiscordPlugin (one-way via registry)
  ↓
McpManager (auto-registers services)
  ↓
MCP Servers (all get registered services)
```

---

## Testing Notes

The refactoring is **non-breaking** because:

1. Service names match tool registration functions
2. McpManager automatically registers services with all servers
3. DiscordPlugin still holds local references for context updates
4. Type safety maintained throughout

---

## Next Steps (Optional Future Enhancements)

1. **MCP Tool Registry** - Auto-discover tools from directory instead of manual imports
2. **DiscordChatHandler** - Extract business logic from DiscordPlugin.handleMessage()
3. **Unified DiscordStateManager** - Consolidate state management across Discord modules

---

## Commit Message

```
refactor: replace Discord setters with service registry pattern

- Remove 5 direct Discord setters from Toji and McpManager
- Add generic service registry (Map<string, unknown>)
- Update DiscordPlugin to use registerMCPService()
- Eliminate circular dependency (Toji ↔ DiscordPlugin)
- All quality gates pass (lint, typecheck, format)

BREAKING CHANGE: setDiscordMessageFetcher() and similar methods removed
Use Toji.registerMCPService(name, service) instead
```
