# OpenCode API Key Management Implementation

## Overview

This implementation adds secure storage and management of OpenCode API keys (like ZEN API) to enable access to more models. The solution follows the same pattern as the Discord token storage and integrates seamlessly with OpenCode's authentication system.

## Architecture

### 1. Storage Layer (ConfigProvider)

**File**: `src/main/config/ConfigProvider.ts`

Added encrypted storage for API keys in the electron-store:

- Keys are stored in `opencode.apiKeys` object
- Mapped by provider ID (e.g., 'anthropic', 'openai', 'zen')
- Encrypted with AES-256-CBC using the existing encryption key
- Stored in `%APPDATA%\toji3\config.json`

**New Methods**:

```typescript
getOpencodeApiKey(providerId: string): string | undefined
setOpencodeApiKey(providerId: string, apiKey: string): void
hasOpencodeApiKey(providerId: string): boolean
clearOpencodeApiKey(providerId: string): void
getConfiguredProviders(): string[]
clearAllOpencodeApiKeys(): void
```

### 2. Business Logic (Toji Class)

**File**: `src/main/toji/index.ts`

Added methods to register API keys with OpenCode server:

**New Methods**:

```typescript
async registerApiKey(providerId: string, apiKey: string): Promise<void>
async syncApiKeys(): Promise<void>
```

**Integration**:

- `registerApiKey()` - Calls OpenCode's `auth.set()` API to register the key
- `syncApiKeys()` - Re-registers all stored keys (called after server connection)
- Auto-sync happens when connecting to a project directory

### 3. IPC Handlers

**File**: `src/main/handlers/opencode.handlers.ts` (NEW)

Exposes secure methods to the renderer process:

- `opencode:set-api-key` - Store and register API key
- `opencode:has-api-key` - Check if key exists (security: doesn't return actual key)
- `opencode:clear-api-key` - Remove a specific key
- `opencode:get-configured-providers` - List all configured providers
- `opencode:clear-all-api-keys` - Remove all keys
- `opencode:sync-api-keys` - Re-sync all keys with OpenCode

**Security Features**:

- Renderer cannot read raw API keys (only check existence)
- Rollback on registration failure
- Automatic transaction handling

### 4. Preload Bridge

**File**: `src/preload/api/opencode.api.ts` (NEW)

Type-safe API for renderer process:

```typescript
export const opencodeAPI = {
  setApiKey: (providerId: string, apiKey: string) => Promise<{ success: boolean }>
  hasApiKey: (providerId: string) => Promise<boolean>
  clearApiKey: (providerId: string) => Promise<{ success: boolean }>
  getConfiguredProviders: () => Promise<string[]>
  clearAllApiKeys: () => Promise<{ success: boolean }>
  syncApiKeys: () => Promise<ApiKeySyncResult[]>
}
```

Exposed to renderer via `window.api.opencode`

### 5. React Hook

**File**: `src/renderer/src/hooks/useOpencodeApiKeys.ts` (NEW)

Convenient React hook for UI components:

```typescript
const {
  setApiKey,
  hasApiKey,
  clearApiKey,
  getConfiguredProviders,
  clearAllApiKeys,
  syncApiKeys,
  isLoading,
  error
} = useOpencodeApiKeys()
```

**Features**:

- Loading state management
- Error handling
- Promise-based operations
- Type-safe returns

## Usage Flow

### Setting an API Key

1. User enters API key in UI
2. UI calls `window.api.opencode.setApiKey('zen', 'sk-...')`
3. IPC handler receives request
4. Key is stored encrypted in electron-store
5. Key is registered with OpenCode via `client.auth.set()`
6. On success: User can now access ZEN models
7. On failure: Key is removed from storage (rollback)

### Automatic Sync on Project Open

When opening or connecting to a project:

1. `Toji.connectClient()` is called
2. OpenCode server is started
3. Client connection is established
4. **`syncApiKeys()` is called automatically**
5. All stored API keys are re-registered with OpenCode
6. User has immediate access to all configured models

### Manual Sync

Users can also manually sync keys:

```typescript
const results = await window.api.opencode.syncApiKeys()
// Returns array of results per provider
```

## OpenCode Integration

Uses OpenCode SDK's `auth.set()` API:

```typescript
await client.auth.set({
  path: { id: 'zen' }, // Provider ID
  body: {
    type: 'api', // Auth type
    key: 'sk-...' // API key
  }
})
```

After registration, the provider's models become available through OpenCode's model selection system.

## Security Considerations

### ✅ Implemented

- Encrypted at rest (AES-256-CBC)
- No raw key exposure to renderer
- Automatic rollback on registration failure
- Type-safe interfaces throughout
- Secure IPC communication

### ⚠️ Note

- Encryption key is hardcoded in source (standard for Electron apps)
- For enterprise deployment, consider external key management

## Files Modified/Created

### Created

- `src/main/handlers/opencode.handlers.ts` - IPC handlers
- `src/preload/api/opencode.api.ts` - Preload bridge
- `src/renderer/src/hooks/useOpencodeApiKeys.ts` - React hook

### Modified

- `src/main/config/ConfigProvider.ts` - Added API key storage methods
- `src/main/toji/index.ts` - Added registerApiKey and syncApiKeys methods
- `src/main/handlers/index.ts` - Export new handlers
- `src/main/index.ts` - Register new handlers
- `src/preload/api/index.ts` - Export opencodeAPI
- `src/preload/index.ts` - Expose opencodeAPI to window
- `src/preload/index.d.ts` - TypeScript definitions

## Testing

### Manual Testing Steps

1. **Set API Key**:

   ```typescript
   await window.api.opencode.setApiKey('zen', 'your-api-key')
   ```

2. **Check Key Exists**:

   ```typescript
   const hasKey = await window.api.opencode.hasApiKey('zen')
   ```

3. **Get Available Models**:

   ```typescript
   const { providers } = await window.api.toji.getModelProviders()
   // Should now include ZEN models
   ```

4. **Sync Keys** (after server restart):
   ```typescript
   const results = await window.api.opencode.syncApiKeys()
   console.log(results) // Shows sync status per provider
   ```

## Future Enhancements

### Planned

- UI for managing multiple API keys
- Provider-specific validation
- Key expiration tracking
- Usage analytics
- Multi-key provider support (multiple keys per provider)

### Possible

- Key rotation automation
- Secure key sharing across team
- Cloud-based key storage option
- API key permissions/scoping

## Developer Notes

### Adding New Providers

To add support for a new provider (e.g., 'openai'):

```typescript
// In your UI component
await setApiKey('openai', 'sk-...')

// OpenCode will automatically make OpenAI models available
```

No code changes needed - the system is provider-agnostic!

### Error Handling

All methods throw on error, with detailed error messages:

```typescript
try {
  await setApiKey('zen', invalidKey)
} catch (error) {
  console.error('Failed to set API key:', error.message)
  // Key is automatically rolled back on failure
}
```

### Debugging

Check logs in `C:\Users\donth\AppData\Roaming\toji3\logs\`:

- API key registration attempts
- Sync operations
- OpenCode auth responses

## References

- **OpenCode SDK Auth API**: See `OPENCODE.md` - Auth API section
- **Electron Store**: Encrypted persistent storage
- **ConfigProvider Pattern**: See Discord token implementation
- **Type Safety**: Full TypeScript coverage across IPC boundary
