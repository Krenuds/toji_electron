# Logging System Migration Guide

## Overview

The new unified logging system replaces:

- ❌ `console.log/warn/error` calls
- ❌ `debug()` from 'debug' package
- ❌ `createFileDebugLogger()` custom wrapper

With a simple, consistent logger:

- ✅ `logger.debug()` / `logger.info()` / `logger.warn()` / `logger.error()`

## The New Logger

### Creating a Logger

```typescript
import { createLogger } from './utils/logger'

const logger = createLogger('my-service')
```

### Using the Logger

```typescript
// Simple message
logger.info('Server started')

// Message with data
logger.debug('Processing request', { userId: 123, action: 'login' })

// Error with error object
logger.error('Failed to connect', error)

// All methods available
logger.debug('Debug message') // Low-level details
logger.info('Info message') // Normal operations
logger.warn('Warning message') // Potential issues
logger.error('Error message') // Errors
```

## Migration Examples

### Before → After

#### Console Logs with Prefixes

```typescript
// ❌ Before
console.log('[TojService] Starting initialization')
console.log(`[TojService] Loaded ${count} items`)
console.error('[TojService] Failed to start:', error)

// ✅ After
logger.info('Starting initialization')
logger.info('Loaded items', { count })
logger.error('Failed to start', error)
```

#### Debug Package

```typescript
// ❌ Before
import { createFileDebugLogger } from './utils/logger'
const debug = createFileDebugLogger('toji:core')
debug('Initializing...')
debug('Client connected: %s', clientId)

// ✅ After
import { createLogger } from './utils/logger'
const logger = createLogger('toji:core')
logger.debug('Initializing...')
logger.debug('Client connected', { clientId })
```

#### Mixed Console Calls

```typescript
// ❌ Before
console.log('Operation started')
console.warn('This might fail')
if (error) {
  console.error('Operation failed:', error)
}

// ✅ After
logger.info('Operation started')
logger.warn('This might fail')
if (error) {
  logger.error('Operation failed', error)
}
```

## Features

### 1. **Consistent Format**

Every log entry includes: timestamp, level, namespace, message, optional data

```
[2025-10-05T19:46:30.985Z] INFO  toji:startup: Initializing ConfigProvider
[2025-10-05T19:46:30.990Z] DEBUG toji:core: Client connected {"clientId":"abc123"}
[2025-10-05T19:46:31.106Z] ERROR discord:service: Failed to login {"code":"TOKEN_INVALID"}
```

### 2. **Automatic Data Serialization**

Pass objects directly - they're automatically JSON.stringified for files, pretty-printed for console:

```typescript
logger.info('User action', {
  userId: 123,
  action: 'delete',
  timestamp: new Date()
})
```

### 3. **Log Levels**

Control verbosity in production vs development:

- `debug`: Verbose details (development)
- `info`: Normal operations (production)
- `warn`: Potential issues (always logged)
- `error`: Errors (always logged)

### 4. **Both Console & File**

Every log goes to:

- Console (with colors/formatting based on level)
- Daily log file (`AppData/Roaming/toji3/logs/toji-YYYY-MM-DD.log`)

## Migration Strategy

### Phase 1: Automated (Use Migration Script)

Run the migration script to automatically convert most patterns:

```bash
# Dry run to see what would change
node scripts/migrate-logging.js --dry-run

# Apply changes
node scripts/migrate-logging.js
```

### Phase 2: Manual Cleanup

Some patterns need manual review:

1. **Dynamic namespaces** - Choose a consistent namespace
2. **Complex string interpolation** - Extract to variables
3. **Conditional logging** - Just use logger (it's fast)

### Phase 3: Remove Noise

Review and reduce over-logging:

- Remove redundant "Starting..." / "Done" pairs
- Change chatty debug logs to actual debug level
- Consolidate related logs into single calls with data

## Renderer Logging

For React components, create a renderer-specific logger that sends to main:

```typescript
// src/renderer/src/utils/logger.ts
export const logger = {
  debug: (msg: string, data?: unknown) => window.api.log('debug', msg, data),
  info: (msg: string, data?: unknown) => window.api.log('info', msg, data),
  warn: (msg: string, data?: unknown) => window.api.log('warn', msg, data),
  error: (msg: string, data?: unknown) => window.api.log('error', msg, data)
}

// In components
import { logger } from '@/utils/logger'
logger.info('Component mounted', { props })
```

## Best Practices

### DO ✅

```typescript
// Use appropriate log levels
logger.debug('Cache hit', { key, value }) // Implementation details
logger.info('User logged in', { userId }) // Business events
logger.warn('API rate limit approaching', { usage }) // Potential issues
logger.error('Database connection failed', error) // Actual errors

// Pass structured data
logger.info('Request processed', {
  endpoint: '/api/users',
  duration: 123,
  status: 200
})

// Use consistent namespaces
const logger = createLogger('toji:discord:voice')
```

### DON'T ❌

```typescript
// Don't use string interpolation - use data param
logger.info(`User ${userId} logged in`) // ❌
logger.info('User logged in', { userId }) // ✅

// Don't log inside tight loops
for (const item of items) {
  logger.debug('Processing item', item) // ❌ Spam
}
logger.debug('Processing items', { count: items.length }) // ✅

// Don't duplicate info in message and data
logger.info('Count: 5', { count: 5 }) // ❌ Redundant
logger.info('Items processed', { count: 5 }) // ✅

// Don't use console.log anymore
console.log('Hello') // ❌ Goes to console only, no file, no structure
logger.info('Hello') // ✅ Proper logging
```

## FAQ

**Q: What if I need to log in a hot path?**
A: The logger is fast. If truly necessary, guard with a condition, but usually not needed.

**Q: Can I use the old debug package?**
A: No, we're completely replacing it. Use the new logger.

**Q: What about renderer/React logs?**
A: Create a wrapper that sends to main process via IPC. See "Renderer Logging" above.

**Q: Do I need to remove old imports?**
A: Yes, remove `import debug from 'debug'` after migration.

**Q: What about third-party library logs?**
A: Leave them alone. This is for our application code only.

## Rollout Plan

1. ✅ Create new logger system
2. ✅ Add migration script
3. ⏳ Migrate main process files (automated + manual)
4. ⏳ Migrate plugin files
5. ⏳ Create renderer logger wrapper
6. ⏳ Migrate renderer files
7. ⏳ Remove old logger code
8. ⏳ Remove debug dependency

## Support

If you hit issues during migration:

1. Check this guide for patterns
2. Look at already-migrated files for examples
3. Ask for help - this is a big change!
