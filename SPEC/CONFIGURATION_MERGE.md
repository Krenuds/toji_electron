# Configuration Merge Strategy

## Problem Statement

Toji3 manages `opencode.json` configuration files for each project, but there's a delicate balance between:

1. **Toji-managed settings** (MCP servers, auto-generated configs)
2. **User settings** (custom MCP servers, model preferences, permissions)
3. **On-the-fly updates** (runtime config changes via UI)

**Critical Issue:** Shallow object merging was destroying nested user settings, particularly custom MCP server configurations.

## Architecture Overview

### Configuration Flow

```
┌─────────────────────────────────────────────────────────────┐
│                      Startup (index.ts)                      │
│  - OpenCode server spawned with NO config                   │
│  - Server reads opencode.json from disk naturally           │
│  - Preserves ALL user settings including custom MCP servers │
└───────────────────────┬─────────────────────────────────────┘
                        │
                        ▼
┌─────────────────────────────────────────────────────────────┐
│              Runtime Updates (ConfigManager)                 │
│  - Uses deepMerge() for nested preservation                 │
│  - Permissions: deep merge preserves user overrides         │
│  - Models: deep merge maintains small_model settings        │
│  - MCP: specialized mergeMcpConfig() preserves user servers │
└───────────────────────┬─────────────────────────────────────┘
                        │
                        ▼
┌─────────────────────────────────────────────────────────────┐
│              MCP Server Creation (McpManager)                │
│  - Uses mergeMcpConfig() to update only Toji's entry        │
│  - Preserves user's custom MCP servers                      │
│  - Example: user adds "filesystem" MCP, Toji adds "toji"    │
└─────────────────────────────────────────────────────────────┘
```

### Deep Merge Rules

Implemented in `src/main/utils/deep-merge.ts`:

1. **Plain objects**: Recursively merged
2. **Arrays**: Replaced (not concatenated)
3. **Primitives**: Source overrides target
4. **Undefined values**: Ignored (preserves target)

### Special Case: MCP Configuration

```typescript
// User's opencode.json
{
  "mcp": {
    "filesystem": { ... },
    "database": { ... }
  }
}

// Toji updates (old broken way)
{
  "mcp": {
    "toji": { ... }  // ❌ Destroys filesystem & database!
  }
}

// Toji updates (new deep merge way)
{
  "mcp": {
    "filesystem": { ... },  // ✅ Preserved
    "database": { ... },    // ✅ Preserved
    "toji": { ... }         // ✅ Updated
  }
}
```

## Key Files

### 1. Deep Merge Utility

**File:** `src/main/utils/deep-merge.ts`

- `deepMerge<T>()` - Recursive object merging
- `mergeMcpConfig()` - Specialized MCP section merge
- Preserves nested user settings across all config updates

### 2. ConfigManager

**File:** `src/main/toji/config-manager.ts`

**Changes:**

- `persistConfigToFile()` now uses `deepMerge()` instead of `{...existingConfig, ...config}`
- Preserves nested permissions, MCP servers, and future config fields

### 3. McpManager

**File:** `src/main/toji/mcp/mcp-manager.ts`

**Changes:**

- `writeOpencodeConfig()` now uses `mergeMcpConfig()` to update only Toji's MCP entry
- User's custom MCP servers (filesystem, database, etc.) are preserved

### 4. Server Spawning

**File:** `src/main/toji/server.ts`

**Changes:**

- Only sets `OPENCODE_CONFIG_CONTENT` when config is explicitly provided
- When `undefined`, OpenCode SDK reads `opencode.json` from disk naturally
- Prevents empty config `{}` from overriding file-based settings

### 5. Startup

**File:** `src/main/index.ts`

**Changes:**

- Passes `undefined` to `server.start()` so OpenCode reads from disk
- Updated log messages to explain the strategy
- Removed misleading warning about "should read opencode.json"

## Behavior Changes

### Before (Broken)

1. **Startup:**
   - Passed `undefined` config → converted to `{}`
   - `OPENCODE_CONFIG_CONTENT={}` env var set
   - **Result:** Empty config overrides user's opencode.json ❌

2. **Runtime Updates:**
   - Shallow merge: `{...existingConfig, ...newConfig}`
   - **Result:** Nested objects completely replaced ❌
   - User's custom MCP servers lost ❌

3. **MCP Creation:**
   - Sets entire `mcp` section to `{ toji: {...} }`
   - **Result:** User's MCP servers destroyed ❌

### After (Fixed)

1. **Startup:**
   - Passes `undefined` config (no env var set)
   - OpenCode SDK reads opencode.json from disk
   - **Result:** All user settings respected ✅

2. **Runtime Updates:**
   - Deep merge: `deepMerge(existingConfig, newConfig)`
   - **Result:** Nested objects recursively merged ✅
   - User's custom settings preserved ✅

3. **MCP Creation:**
   - Specialized merge: `mergeMcpConfig(existing, 'toji', config)`
   - **Result:** Only Toji's entry updated, user's servers preserved ✅

## Testing Strategy

### Manual Testing

1. **Create a project with custom opencode.json:**

   ```json
   {
     "model": "opencode/custom-model",
     "permission": {
       "edit": "deny",
       "bash": "ask"
     },
     "mcp": {
       "filesystem": {
         "type": "local",
         "command": "mcp-filesystem"
       }
     }
   }
   ```

2. **Start Toji3:**
   - Verify Toji adds `mcp.toji` entry
   - Verify `mcp.filesystem` still exists ✅
   - Verify model and permissions unchanged ✅

3. **Update permissions via UI:**
   - Change one permission (e.g., `edit: "allow"`)
   - Verify other permissions preserved ✅
   - Verify MCP servers unchanged ✅

4. **Restart application:**
   - Verify all settings persist ✅
   - Verify no config loss or corruption ✅

### Edge Cases

- ✅ Empty opencode.json → Toji creates minimal config
- ✅ Missing mcp section → Toji adds mcp section
- ✅ Corrupted JSON → Toji creates new config (with warning)
- ✅ Unknown config fields → Preserved through merges

## Migration Notes

**No migration needed** - This is a fix, not a breaking change.

Existing projects will benefit immediately:

- User settings now preserved across updates
- MCP servers no longer destroyed
- Runtime config changes maintain nested settings

## Future Considerations

### Potential Enhancements

1. **Config Validation:**
   - Add JSON schema validation before write
   - Warn on unknown/deprecated fields
   - Suggest migrations for old configs

2. **Backup Strategy:**
   - Auto-backup opencode.json before writes
   - Allow rollback to previous configs
   - Detect and recover from corruption

3. **Merge Conflicts:**
   - Detect when Toji and user modify same fields
   - UI to resolve merge conflicts
   - Audit log of config changes

### Known Limitations

1. **Array Merging:**
   - Arrays are replaced, not merged
   - Future: Smart array merge for append-only fields?

2. **Type Safety:**
   - Deep merge uses `Record<string, unknown>`
   - Future: Type-safe merge with OpenCode SDK types?

3. **Concurrent Writes:**
   - No file locking mechanism
   - Race conditions possible (rare in single-app scenario)

## References

- OpenCode SDK Config: https://opencode.ai/docs/configuration
- MCP Protocol: https://modelcontextprotocol.io/
- Electron Store: https://github.com/sindresorhus/electron-store

---

**Author:** Toji3 Configuration Team
**Date:** October 5, 2025
**Status:** Implemented & Tested ✅
