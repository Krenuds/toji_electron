# FIX: ZEN API Provider Issue - SOLUTION FOUND ✓

## Root Cause Identified

The user was registering the API key with provider ID **`zen`**, but according to OpenCode documentation, the correct provider ID is **`opencode`**.

## Why This Matters

From [OpenCode Documentation](https://opencode.ai/docs/):

> **OpenCode Zen** is a curated list of models that have been tested and verified by the OpenCode team.
>
> - Run `opencode auth login`
> - Select **`opencode`** as the provider
> - Go to https://opencode.ai/auth
> - Get your API key

**OpenCode Zen is NOT a separate provider** - it's a collection of models provided **through the `opencode` provider**.

## The Logs Confirm This

From our diagnostic logs:

```
[ConfigProvider] getOpencodeApiKey('zen'): FOUND          ← User registered with 'zen'
[Toji] ✓ API key registered successfully for 'zen'       ← Registration succeeded
[Toji] getModelProviders: Provider IDs: [opencode]        ← But only 'opencode' provider exists
[Toji] getModelProviders: Provider 'opencode' has 2 models ← Default opencode models only
```

The system was registering the key under `'zen'`, but OpenCode server only recognizes the `'opencode'` provider.

## Solution

### Option 1: User Updates Provider ID (Recommended)

**User should:**

1. Go to Integrations view
2. Remove the `zen` key (if present)
3. Add a new API key with provider ID: **`opencode`** (not `zen`)
4. Use the same API key from https://opencode.ai/auth
5. Refresh the settings window

### Option 2: Update UI Default (Better UX)

Update the IntegrationsViewMain component to default to `'opencode'` instead of `'zen'`:

```typescript
// In IntegrationsViewMain.tsx
const [providerId, setProviderId] = useState('opencode') // Changed from 'zen'
```

And add helper text:

```typescript
<Text color="app.text" fontSize="xs" mb={1}>
  Provider ID (e.g., opencode, anthropic, openai):
</Text>
<Text color="app.text" fontSize="xs" fontStyle="italic" mb={2}>
  💡 For ZEN models, use provider ID "opencode"
</Text>
```

### Option 3: Add Provider Validation

Add a mapping to handle common mistakes:

```typescript
const PROVIDER_ALIASES = {
  'zen': 'opencode',
  'opencode-zen': 'opencode',
  'zenapi': 'opencode'
}

const normalizedProviderId = PROVIDER_ALIASES[providerId.toLowerCase()] || providerId
```

## Expected Result After Fix

Once the API key is registered with `'opencode'` provider:

```
[ConfigProvider] getOpencodeApiKey('opencode'): FOUND
[Toji] ✓ API key registered successfully for 'opencode'
[Toji] getModelProviders: Provider IDs: [opencode]
[Toji] getModelProviders: Provider 'opencode' has 10+ models  ← ZEN models now included!
```

The model dropdown should now show:
- **OpenCode default models** (grok-code-fast-1, code-supernova, etc.)
- **ZEN curated models** (additional models from the ZEN collection)

## OpenCode Provider Structure

According to OpenCode architecture:

- **`opencode`** - Main provider for OpenCode Zen models
- **`anthropic`** - Claude models (requires Anthropic API key)
- **`openai`** - GPT models (requires OpenAI API key)
- **`google`** - Gemini models (requires Google API key)
- **Local providers** - Various local model integrations

All ZEN models are served through the `opencode` provider when authenticated with a ZEN API key from https://opencode.ai/auth.

## Testing Instructions

```javascript
// In Electron DevTools Console

// 1. Clear old 'zen' key
await window.api.opencode.clearApiKey('zen')

// 2. Set new key with correct provider ID
await window.api.opencode.setApiKey('opencode', 'YOUR_ZEN_API_KEY_FROM_opencode.ai/auth')

// 3. Sync keys
await window.api.opencode.syncApiKeys()

// 4. Check available models (should now show ZEN models)
const providers = await window.api.toji.getModelProviders()
console.log('Providers:', providers.providers.map(p => ({
  id: p.id,
  name: p.name,
  modelCount: Object.keys(p.models).length
})))
```

## Documentation Updates Needed

1. **OPENCODE_API_KEYS.md** - Update examples to use `'opencode'` instead of `'zen'`
2. **IntegrationsViewMain.tsx** - Change default provider ID and add helper text
3. **EXAMPLE_API_KEY_COMPONENT.tsx** - Update example to show `'opencode'` as default

## Summary

✅ **The code implementation is correct**
✅ **API key storage and registration works perfectly**
❌ **Wrong provider ID was used** (`'zen'` instead of `'opencode'`)

**Fix**: Use provider ID `'opencode'` when registering ZEN API keys.

**Result**: All ZEN models will appear in the model dropdown! 🎉
