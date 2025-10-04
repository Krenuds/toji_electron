# API Key Diagnostic Report

## Issue Summary

User reported that after adding an OpenCode ZEN API key, the additional models are not appearing in the model selection dropdown, even after refreshing the program and settings window.

## Investigation Results

### ✅ What IS Working

1. **Storage**: API key is being stored correctly in encrypted electron-store
   ```
   [ConfigProvider] getOpencodeApiKey('zen'): FOUND
   [ConfigProvider] API key for 'zen' length: 67
   ```

2. **Retrieval**: API key is being retrieved from storage
   ```
   [ConfigProvider] getConfiguredProviders(): Found 1 providers: [zen]
   ```

3. **Synchronization**: API key is being synced with OpenCode server successfully
   ```
   [Toji] syncApiKeys: Found 1 providers to sync: [zen]
   [Toji] ✓ API key registered successfully for 'zen'
   [Toji] syncApiKeys: ✓ Successfully synced 'zen'
   ```

4. **Registration**: The `client.auth.set()` call is succeeding
   ```
   [Toji] Calling client.auth.set for provider 'zen'
   [Toji] ✓ API key registered successfully for 'zen'
   ```

### ❌ What IS NOT Working

**OpenCode server is not returning the 'zen' provider in the providers list**

When calling `client.config.providers()`, the response only includes the default `opencode` provider:

```
[Toji] getModelProviders: Retrieved 1 providers from OpenCode
[Toji] getModelProviders: Provider IDs: [opencode]
[Toji] getModelProviders: Provider 'opencode' has 2 models
```

**Expected**: Should see `zen` provider in the list with its models
**Actual**: Only seeing `opencode` provider

## Root Cause Analysis

The issue is **NOT** in the Toji application code. The application is:
1. ✅ Storing the API key correctly
2. ✅ Retrieving the API key correctly
3. ✅ Calling `client.auth.set()` successfully
4. ✅ Getting a successful response from the auth endpoint

However, **the OpenCode SDK/server is not making the 'zen' provider available after registration**.

## Possible Reasons

### 1. Invalid API Key
The API key might be:
- Expired
- Invalid format
- Not activated
- Associated with wrong account

**Verification**: User should verify the API key is valid by testing it directly with ZEN API.

### 2. Wrong Provider ID
The provider ID might not be 'zen'. Common provider IDs:
- `anthropic` - For Claude models
- `openai` - For GPT models  
- `google` - For Gemini models
- `zenith` or `zen-api` - Possible alternate names for ZEN

**Verification**: User should check ZEN documentation for the correct provider ID.

### 3. OpenCode Server Issue
The OpenCode server might:
- Not support 'zen' provider
- Require server restart after auth
- Have a bug in provider registration
- Need additional configuration

### 4. Authentication Timing
The provider might become available after:
- A delay (not immediate)
- Server restart
- Next client connection
- Cache invalidation

## Recommended Actions

### For User

1. **Verify API Key**
   - Check if the ZEN API key is valid
   - Test the key directly with ZEN API endpoints
   - Ensure key has proper permissions

2. **Verify Provider ID**
   - Check ZEN documentation for correct provider ID
   - Try common alternatives: `zenith`, `zen-api`, `opencode-zen`
   - Look at ZEN dashboard for provider configuration

3. **Check OpenCode Server Logs**
   - Look in: `C:\Users\donth\AppData\Roaming\toji3\logs\`
   - Search for any errors related to 'zen' provider
   - Check if authentication succeeded but provider registration failed

4. **Contact ZEN Support**
   - Ask about OpenCode SDK integration
   - Verify provider ID to use
   - Check if additional setup required

### For Development

1. **Add Response Logging**
   - Log the raw response from `client.auth.set()`
   - Log any error details from OpenCode SDK
   - Add validation before/after registration

2. **Add Validation UI**
   - Show success/failure of auth registration
   - Display which providers are available after registration
   - Add "Test API Key" button

3. **Add Provider Discovery**
   - After setting API key, immediately fetch providers
   - Show diff between before/after provider lists
   - Display clear feedback to user

## Logging Added

Comprehensive logging has been added to track API key operations:

### ConfigProvider (Storage Layer)
- `getOpencodeApiKey()` - Shows if key found and key length
- `setOpencodeApiKey()` - Shows storage operation and total provider count
- `getConfiguredProviders()` - Shows provider list

### Toji (Business Logic)
- `registerApiKey()` - Shows registration start, auth call, and success/failure
- `syncApiKeys()` - Shows full sync workflow with per-provider results
- `getModelProviders()` - Shows provider count and available models per provider

### IPC Handlers
- `opencode:set-api-key` - Shows storage and registration flow with rollback
- `opencode:sync-api-keys` - Shows sync request and results
- `opencode:get-configured-providers` - Shows provider list retrieval

## Testing Instructions

To diagnose further:

```javascript
// In browser console (Electron DevTools)
// 1. Check stored providers
await window.api.opencode.getConfiguredProviders()

// 2. Try syncing keys
await window.api.opencode.syncApiKeys()

// 3. Check available models
await window.api.toji.getModelProviders()

// 4. Try different provider IDs
await window.api.opencode.setApiKey('zenith', 'YOUR_API_KEY')
await window.api.opencode.setApiKey('zen-api', 'YOUR_API_KEY')

// 5. Check logs
// Open: C:\Users\donth\AppData\Roaming\toji3\logs\
```

## Next Steps

1. **User Action Required**: Verify with ZEN that:
   - The API key is valid and active
   - The correct provider ID to use
   - Any special configuration needed for OpenCode integration

2. **If provider ID is correct**: Contact OpenCode support about why `client.auth.set()` succeeds but provider doesn't appear in `client.config.providers()`

3. **If different provider ID needed**: Update the key with correct provider ID and test again

## Files Modified

- `src/main/config/ConfigProvider.ts` - Added storage operation logging
- `src/main/toji/index.ts` - Added sync and registration logging
- `src/main/handlers/opencode.handlers.ts` - Added IPC handler logging

All logging uses `console.log()` for visibility in Electron console and tagged with component names like `[ConfigProvider]`, `[Toji]`, `[opencode.handlers]` for easy filtering.
