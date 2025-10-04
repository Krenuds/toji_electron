# Model Organization Improvements

## Overview

Enhanced the model selection UI to handle multiple providers with duplicate model names, providing a clear, organized view when users add API keys from multiple providers (OpenCode ZEN, Anthropic, OpenAI, Google, etc.).

## Problem Statement

When adding API keys from multiple providers:
- **Duplicate model names**: Same model ID (e.g., `claude-3-5-sonnet-20241022`) available from both `opencode` (ZEN) and `anthropic` providers
- **No organization**: Flat list of models without grouping
- **Lack of context**: Users couldn't tell which provider a model came from
- **Scaling issues**: List would become unwieldy with many providers

## Solution Implemented

### 1. Smart Duplicate Detection & Labeling

**File:** `src/renderer/src/hooks/useAvailableModels.ts`

- Added `displayLabel` property to `ModelOption` interface
- Implemented two-pass transformation:
  1. **First pass**: Count occurrences of each model ID across providers
  2. **Second pass**: Add provider context to duplicates

```typescript
// Before: Just "Claude 3.5 Sonnet" (ambiguous if from multiple providers)
// After: "Claude 3.5 Sonnet (Anthropic)" vs "Claude 3.5 Sonnet (OpenCode)"
```

**Algorithm:**
```typescript
const modelNameCounts = new Map<string, number>()

// Count duplicates by model ID
providers.forEach((provider) => {
  Object.entries(provider.models).forEach(([modelId]) => {
    modelNameCounts.set(modelId, (modelNameCounts.get(modelId) || 0) + 1)
  })
})

// Add provider context only to duplicates
modelOptions.forEach((option) => {
  const hasDuplicate = modelNameCounts.get(option.modelId)! > 1

  if (hasDuplicate) {
    option.displayLabel = `${option.label} (${option.providerName})`
  } else {
    option.displayLabel = option.label
  }
})
```

### 2. Provider-Based Grouping

**File:** `src/renderer/src/components/settings/SettingsDrawer.tsx`

- Implemented `<optgroup>` elements for visual organization
- Groups models by provider name
- Maintains alphabetical sorting within groups

**Visual Structure:**
```
Model Selector Dropdown:
├─ Anthropic
│  ├─ Claude 3.5 Sonnet (Anthropic)
│  └─ Claude 3.5 Opus
├─ Google
│  ├─ Gemini 1.5 Pro
│  └─ Gemini 1.5 Flash
├─ OpenAI
│  ├─ GPT-4o
│  └─ GPT-4o-mini
└─ OpenCode
   ├─ Claude 3.5 Sonnet (OpenCode)
   ├─ Grok Code Fast 1
   └─ Code Supernova
```

### 3. Provider Status in API Keys Section

**File:** `src/renderer/src/components/views/integrations/IntegrationsViewMain.tsx`

- Added model count display for each configured provider
- Shows "X models available" dynamically
- Auto-refreshes after adding/removing API keys

**Features:**
```tsx
// Configured Providers display:
┌─────────────────────────────────────────┐
│ ● opencode    10 models available    🗑 │
│ ● anthropic   2 models available     🗑 │
│ ● openai      5 models available     🗑 │
└─────────────────────────────────────────┘
```

### 4. Automatic Model List Refresh

Added refresh triggers:
- ✅ After saving new API key
- ✅ After removing API key
- ✅ After syncing API keys

Ensures UI always reflects current available models.

## Code Changes Summary

### 1. `useAvailableModels.ts`
- Added `displayLabel?: string` to `ModelOption` interface
- Enhanced `transformProvidersToModels()` with duplicate detection
- Duplicates get provider suffix: `"Model Name (Provider)"`
- Non-duplicates keep clean name: `"Model Name"`

### 2. `SettingsDrawer.tsx`
- Replaced flat `<option>` list with grouped `<optgroup>` structure
- Groups models by `providerName`
- Uses `displayLabel || label` for display text
- Maintains provider-based sorting

### 3. `IntegrationsViewMain.tsx`
- Added `useAvailableModels()` hook import
- Shows model count per configured provider
- Calls `refreshModels()` after API key changes
- Dynamic display: "X models available"

## User Experience Improvements

### Before
```
Dropdown:
- Claude 3.5 Sonnet          ❌ Which provider?
- Claude 3.5 Sonnet          ❌ Duplicate!
- GPT-4o
- Grok Code Fast 1
```

### After
```
Dropdown:
▼ Anthropic
  - Claude 3.5 Sonnet (Anthropic)  ✅ Clear!
  - Claude 3.5 Opus
▼ OpenCode
  - Claude 3.5 Sonnet (OpenCode)   ✅ Distinct!
  - Grok Code Fast 1
▼ OpenAI
  - GPT-4o
```

## Benefits

1. **Clarity**: Always know which provider a model comes from
2. **Efficiency**: Only shows provider suffix when needed (duplicates)
3. **Organization**: Logical grouping by provider
4. **Scalability**: Works well with any number of providers
5. **Feedback**: Real-time model count per provider

## Testing Checklist

- [ ] Add `opencode` API key → See OpenCode models (10+)
- [ ] Add `anthropic` API key → See Anthropic models (2)
- [ ] Check for `claude-3-5-sonnet-20241022`:
  - [ ] Both versions appear
  - [ ] One labeled "(Anthropic)"
  - [ ] One labeled "(OpenCode)"
- [ ] Verify model dropdown has optgroups
- [ ] Remove a provider → Model count updates
- [ ] Models from removed provider disappear
- [ ] Add provider back → Models reappear

## Future Enhancements

### Potential improvements:
1. **Provider Icons**: Show provider logos next to names
2. **Model Metadata**: Display pricing, context window, speed
3. **Filtering**: Filter models by capability (code, chat, vision)
4. **Favorites**: Star frequently used models
5. **Search**: Quick search within model list
6. **Cost Estimates**: Show estimated cost per provider

## Technical Notes

### Why Two-Pass Algorithm?
- First pass counts duplicates globally
- Second pass only adds context where needed
- Avoids showing "(Provider)" for unique models
- Cleaner UI when no duplicates exist

### Why Use displayLabel?
- Separates logic from presentation
- `label`: Original model name
- `displayLabel`: UI-friendly name with context
- Allows future customization without breaking data structure

### Sorting Strategy
```typescript
// Primary sort: Provider name (alphabetical)
if (a.providerName !== b.providerName) {
  return a.providerName.localeCompare(b.providerName)
}
// Secondary sort: Model name (alphabetical)
return a.label.localeCompare(b.label)
```

This ensures consistent, predictable ordering.

## Conclusion

The model organization improvements make it easy to work with multiple AI providers, clearly distinguish between duplicate models, and provide users with immediate feedback about available models per provider. The system scales gracefully as more providers are added! 🎯
