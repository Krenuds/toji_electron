# 📝 Log Review & Improvement Plan

**Date:** October 5, 2025  
**Status:** 🎯 Ready to Execute

---

## 🎯 Objectives

1. **Standardize Log Levels** - Ensure each log uses the appropriate level (debug/info/warn/error)
2. **Remove Unnecessary Logs** - Eliminate redundant or non-valuable logging
3. **Improve Log Quality** - Ensure logs accurately represent data and provide useful context
4. **Performance** - Reduce log volume in production while maintaining debuggability

---

## 📊 Current State Analysis

### Log Distribution (Estimated)

| Level   | Count | Usage                              |
| ------- | ----- | ---------------------------------- |
| `debug` | ~400+ | Development details, flow tracking |
| `info`  | ~10   | Key system events, state changes   |
| `warn`  | ~5    | Recoverable issues, missing config |
| `error` | ~10   | Failures, exceptions               |

### Observations from Startup Logs

**Good Examples:**

- ✅ `INFO discord:service: Connected to Discord` - Appropriate level for major milestone
- ✅ `DEBUG toji:startup: Initializing ConfigProvider` - Good initialization tracking
- ✅ Structured data: `{"hasToken":true}`, `{"clientId":"..."}`

**Needs Improvement:**

- ⚠️ Too many DEBUG logs that should be INFO (server start, connections)
- ⚠️ Missing ERROR logs (some failures only have DEBUG)
- ⚠️ Verbose repeated logs (getModelProviders called 4 times in sequence)
- ⚠️ Some logs lack context (what project, what directory, etc.)

---

## 🎨 Log Level Guidelines

### ❌ **ERROR** - System or Feature Failure

**When to use:**

- Operation failed and cannot recover
- Critical system component unavailable
- Data corruption or loss risk
- Security issues

**Example:**

```typescript
logger.error('Failed to connect to OpenCode server', { error, retries: 3 })
```

### ⚠️ **WARN** - Unexpected but Recoverable

**When to use:**

- Degraded functionality (fallback mode)
- Missing optional configuration
- Deprecated features in use
- Resource limits approaching

**Example:**

```typescript
logger.warn('Docker not available, voice features disabled')
```

### ℹ️ **INFO** - Important System Events

**When to use:**

- System startup/shutdown
- Major state changes (connected, disconnected)
- Configuration loaded
- Long-running operation completed

**Example:**

```typescript
logger.info('OpenCode server started', { port, directory })
```

### 🔍 **DEBUG** - Development Details

**When to use:**

- Function entry/exit
- Internal state changes
- API calls and responses
- Performance metrics
- Flow tracking

**Example:**

```typescript
logger.debug('Fetching session messages', { sessionId, useCache })
```

---

## 📋 Review Checklist Per Log Statement

For each log, ask:

1. **Is it necessary?**
   - Would someone need this to diagnose an issue?
   - Does it provide unique information?
   - Or is it just noise?

2. **Is the level correct?**
   - Match against guidelines above
   - Consider production vs development needs

3. **Is the message clear?**
   - Can you understand what happened without reading code?
   - Does it include relevant context?

4. **Are the data fields useful?**
   - Are all included fields needed?
   - Are any important fields missing?

5. **Is the format consistent?**
   - Use structured data for complex info
   - Use simple strings for simple messages

---

## 🗂️ Review Strategy - By Module Priority

### Phase 1: Core System (Priority #1-4)

**Files to Review:**

1. ✅ `src/main/toji/index.ts` (Score: 58)
   - Core Toji class
   - ~50 log statements
   - **Focus:** Ensure critical operations log at INFO, internal details at DEBUG

2. ✅ `src/main/toji/sessions.ts`
   - Session management
   - ~20 log statements
   - **Focus:** User-facing operations should be INFO

3. ✅ `src/main/toji/server.ts`
   - OpenCode server management
   - ~30 log statements
   - **Focus:** Server lifecycle events should be INFO

4. ✅ `src/main/toji/client-manager.ts`
   - Client connections
   - ~15 log statements
   - **Focus:** Connection events should be INFO

### Phase 2: Services (Priority #5-10)

**Files to Review:**

1. `src/main/services/discord-service.ts`
   - Discord connection management
   - **Focus:** Connection state changes to INFO

2. `src/main/services/docker-service-manager.ts`
   - Docker service lifecycle
   - **Focus:** Service start/stop to INFO, internals to DEBUG

3. `src/main/services/voice-service-manager.ts`
   - Voice service coordination
   - **Focus:** Initialization success/failure to INFO

4. `src/main/services/opencode-service.ts`
   - OpenCode integration
   - **Focus:** Binary installation/update to INFO

### Phase 3: Discord Plugin (Priority #11-15)

**Files to Review:**

1. `src/plugins/discord/DiscordPlugin.ts`
2. `src/plugins/discord/voice/VoiceModule.ts`
3. `src/plugins/discord/modules/DiscordProjectManager.ts`
4. `src/plugins/discord/modules/SlashCommandModule.ts`

### Phase 4: Utilities & MCP Tools

**Files to Review:**

1. `src/main/utils/audio-processor.ts`
2. `src/main/utils/logger.ts` (meta-review!)
3. `src/main/toji/mcp/` tools

---

## 🛠️ Refactoring Patterns

### Pattern 1: Upgrade DEBUG to INFO

**Before:**

```typescript
logger.debug('OpenCode server started on port 4096')
```

**After:**

```typescript
logger.info('OpenCode server started', { port: 4096, directory })
```

### Pattern 2: Add Structured Context

**Before:**

```typescript
logger.debug('Connecting to server')
```

**After:**

```typescript
logger.debug('Connecting to OpenCode server', {
  url,
  directory,
  port
})
```

### Pattern 3: Remove Redundant Logs

**Before:**

```typescript
logger.debug('Getting client')
logger.debug('Client found')
return client
```

**After:**

```typescript
// Remove - internal detail not needed
return client
```

### Pattern 4: Consolidate Repeated Logs

**Before:**

```typescript
logger.debug('[Toji] getModelProviders: Fetching...')
logger.debug('[Toji] getModelProviders: Calling client...')
logger.debug('[Toji] getModelProviders: Retrieved...')
logger.debug('[Toji] getModelProviders: Provider IDs...')
```

**After:**

```typescript
logger.debug('Fetching model providers')
// ... do work ...
logger.debug('Retrieved model providers', { count, providerIds })
```

### Pattern 5: Error Handling

**Before:**

```typescript
try {
  await riskyOperation()
} catch (error) {
  logger.debug('Operation failed:', error)
  throw error
}
```

**After:**

```typescript
try {
  await riskyOperation()
} catch (error) {
  logger.error('Operation failed', { error, context })
  throw error
}
```

---

## 📝 Review Workflow

For each module:

1. **Read the file** - Understand what it does
2. **List all log statements** - Create inventory
3. **Categorize each log:**
   - ✅ Keep as-is
   - 🔄 Change level
   - ✏️ Improve message/data
   - ❌ Remove entirely
4. **Make changes** - Use multi_replace_string_in_file
5. **Test** - Run app and verify logs make sense
6. **Commit** - One commit per module or logical group

---

## 🎯 Success Criteria

After review, logs should:

- ✅ Be readable without code context
- ✅ Have appropriate levels for production
- ✅ Include all relevant context data
- ✅ Not spam the console with redundancy
- ✅ Help diagnose issues quickly
- ✅ Follow consistent formatting

---

## 📊 Example Review Session

### File: `src/main/toji/server.ts`

**Current Issues:**

1. Server start should be INFO (currently DEBUG)
2. Too many process spawn logs (consolidate)
3. Missing context in some error logs

**Changes:**

```typescript
// BEFORE
logger.debug('Server started successfully on port %d', port)

// AFTER
logger.info('OpenCode server started', { port, directory, pid: process.id })

// BEFORE
logger.debug('Spawning OpenCode server')
logger.debug('Working directory: %s', dir)
logger.debug('Config: %o', config)

// AFTER
logger.debug('Spawning OpenCode server', { directory: dir, port, configKeys: Object.keys(config) })

// BEFORE
logger.debug('Server error:', error)

// AFTER
logger.error('OpenCode server failed', { error, port, directory })
```

---

## 🚀 Implementation Plan

### Week 1: Core System (4-6 hours)

- Review Priority #1-4 modules
- ~100-150 log statements
- Focus on critical path logging

### Week 2: Services (4-6 hours)

- Review Priority #5-10 modules
- ~150-200 log statements
- Focus on service lifecycle

### Week 3: Discord Plugin (3-5 hours)

- Review Discord-related modules
- ~100-150 log statements
- Focus on event handling

### Week 4: Polish (2-3 hours)

- Review MCP tools and utilities
- ~50-100 log statements
- Final consistency pass

---

## 📈 Metrics to Track

### Before Review

- Total log statements: ~500+
- INFO logs: ~10 (2%)
- DEBUG logs: ~400+ (80%+)
- Log volume per startup: ~200 lines

### After Review (Target)

- Total log statements: ~400 (20% reduction)
- INFO logs: ~50 (12%)
- DEBUG logs: ~320 (80%)
- Log volume per startup: ~50 lines (INFO only in production)

---

## 🎯 Next Actions

**Ready to start?** Pick one:

1. **Start with Priority #1** - `src/main/toji/index.ts` (comprehensive review)
2. **Quick Win** - `src/main/toji/server.ts` (server lifecycle logging)
3. **High Impact** - `src/main/services/discord-service.ts` (user-visible events)

**Command to begin:**

```powershell
code src/main/toji/index.ts
# Review the file, then we'll make changes together
```

---

## 📚 References

- **Logger Implementation:** `src/main/utils/logger.ts`
- **Current Logs:** Run `npm run dev` to see live output
- **Startup Sequence:** See logs above for typical boot sequence

---

**Let's improve log quality systematically!** 🎯

Would you like to:

1. Start with `src/main/toji/index.ts` (Priority #1)?
2. Pick a different module?
3. Review the logger implementation first?
