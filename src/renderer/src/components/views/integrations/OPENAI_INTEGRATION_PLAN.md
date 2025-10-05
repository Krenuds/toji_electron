# OpenAI Integration UI Plan

## Current Status

✅ **Backend**: TTSService checks environment variable `OPENAI_TTS_API_KEY` as fallback
⚠️ **UI**: No OpenAI API key configuration in Integrations view yet

## Goal

Add OpenAI API key configuration to the Integrations view, similar to existing OpenCode provider configuration.

---

## Implementation Plan

### 1. Update IntegrationsViewMain.tsx

Add OpenAI as a dedicated integration section alongside Discord and OpenCode.

**New Section Structure**:
```tsx
{/* OpenAI TTS Integration */}
<Card.Root>
  <Card.Header>
    <HStack gap={2}>
      <LuMessageSquare /> {/* or appropriate icon */}
      <Text>OpenAI TTS</Text>
      <Badge>Text-to-Speech</Badge>
    </HStack>
  </Card.Header>

  <Card.Body>
    {/* API Key Input */}
    <VStack align="stretch" gap={3}>
      <Input
        placeholder="sk-proj-..."
        type={showOpenAIKey ? 'text' : 'password'}
        value={openaiKeyInput}
        onChange={(e) => setOpenaiKeyInput(e.target.value)}
      />

      {/* Save/Clear buttons */}
      <HStack>
        <Button onClick={handleSaveOpenAIKey}>Save</Button>
        <Button onClick={handleClearOpenAIKey}>Clear</Button>
        <Button onClick={() => setShowOpenAIKey(!showOpenAIKey)}>
          {showOpenAIKey ? <LuEyeOff /> : <LuEye />}
        </Button>
      </HStack>

      {/* Status */}
      {hasOpenAIKey && (
        <StatusBox status="success">
          ✅ OpenAI API key configured
        </StatusBox>
      )}
    </VStack>
  </Card.Body>
</Card.Root>
```

### 2. State Management

Add state for OpenAI key management:
```tsx
const [openaiKeyInput, setOpenaiKeyInput] = useState('')
const [showOpenAIKey, setShowOpenAIKey] = useState(false)
const [hasOpenAIKey, setHasOpenAIKey] = useState(false)
```

### 3. Handlers

**Save Handler**:
```tsx
const handleSaveOpenAIKey = async () => {
  if (!openaiKeyInput.trim()) return

  try {
    // Store in ConfigProvider under 'openai' provider
    await setApiKey('openai', openaiKeyInput.trim())
    setOpenaiKeyInput('')
    setHasOpenAIKey(true)
  } catch (err) {
    console.error('Failed to save OpenAI key:', err)
  }
}
```

**Clear Handler**:
```tsx
const handleClearOpenAIKey = async () => {
  try {
    await clearApiKey('openai')
    setHasOpenAIKey(false)
  } catch (err) {
    console.error('Failed to clear OpenAI key:', err)
  }
}
```

**Check Handler** (on mount):
```tsx
useEffect(() => {
  const checkOpenAIKey = async () => {
    const providers = await getConfiguredProviders()
    setHasOpenAIKey(providers.includes('openai'))
  }
  checkOpenAIKey()
}, [])
```

### 4. Backend Support

The ConfigProvider already supports this pattern:
- ✅ `getOpencodeApiKey('openai')` - Get key
- ✅ `setOpencodeApiKey('openai', key)` - Set key
- ✅ `clearOpencodeApiKey('openai')` - Clear key
- ✅ `getConfiguredProviders()` - List configured providers

**No backend changes needed!** Just use existing API key infrastructure.

---

## UI Layout

### Current Integrations View Structure:
1. **Discord Bot** (top)
   - Token input
   - Connect/Disconnect
   - Status display

2. **OpenCode API Keys** (middle)
   - Provider selector
   - API key input
   - Configured providers list
   - Available models

### Proposed Addition:

**Insert between Discord and OpenCode**:

3. **OpenAI TTS** (new)
   - API key input
   - Status indicator
   - Link to OpenAI platform

This keeps voice-related (Discord + OpenAI TTS) together at the top, with general AI providers (OpenCode) below.

---

## Visual Design

### Card Header
- Icon: `LuMessageSquare` or `LuMic` (voice-related)
- Title: "OpenAI TTS"
- Badge: "Text-to-Speech" (colorScheme="purple")

### Status Indicators
- ✅ Green: API key configured and valid
- ⚠️ Yellow: API key from environment variable
- ❌ Red: No API key configured

### Help Text
Add info about where to get the API key:
```tsx
<Text fontSize="sm" color="gray.500">
  Get your API key from{' '}
  <Link href="https://platform.openai.com/api-keys" isExternal>
    OpenAI Platform <LuExternalLink />
  </Link>
</Text>
```

---

## Testing Checklist

- [ ] UI appears in Integrations view
- [ ] Can enter and save OpenAI API key
- [ ] Key is stored in ConfigProvider under 'openai'
- [ ] Status shows ✅ when key is configured
- [ ] Can clear the key
- [ ] Show/hide password toggle works
- [ ] TTSService picks up the configured key
- [ ] TTS works after configuring key in UI
- [ ] Environment variable fallback still works
- [ ] Key persists across app restarts

---

## Implementation Steps

1. **Add UI Component** (IntegrationsViewMain.tsx)
   - Add state for OpenAI key
   - Add OpenAI section to render
   - Add handlers for save/clear

2. **Test with existing backend**
   - Use `setApiKey('openai', key)`
   - Verify TTSService picks it up

3. **Polish UI**
   - Add icons
   - Add help text
   - Add status indicators

4. **Update Documentation**
   - Add screenshots
   - Update PHASE2_COMPLETE.md
   - Update README if needed

---

## Code Example

Full implementation snippet:

```tsx
// State
const [openaiKeyInput, setOpenaiKeyInput] = useState('')
const [showOpenAIKey, setShowOpenAIKey] = useState(false)
const [hasOpenAIKey, setHasOpenAIKey] = useState(false)

// Check on mount
useEffect(() => {
  const checkKeys = async () => {
    const providers = await getConfiguredProviders()
    setHasOpenAIKey(providers.includes('openai'))
  }
  checkKeys()
}, [getConfiguredProviders])

// Handlers
const handleSaveOpenAIKey = async () => {
  if (!openaiKeyInput.trim()) return
  try {
    await setApiKey('openai', openaiKeyInput.trim())
    setOpenaiKeyInput('')
    setHasOpenAIKey(true)
  } catch (err) {
    console.error('Failed to save OpenAI key:', err)
  }
}

const handleClearOpenAIKey = async () => {
  try {
    await clearApiKey('openai')
    setHasOpenAIKey(false)
  } catch (err) {
    console.error('Failed to clear OpenAI key:', err)
  }
}

// Render
<Card.Root>
  <Card.Header>
    <HStack gap={2}>
      <LuMic size={20} />
      <Text fontSize="lg" fontWeight="bold">OpenAI TTS</Text>
      <Badge colorScheme="purple">Text-to-Speech</Badge>
    </HStack>
  </Card.Header>

  <Card.Body>
    <VStack align="stretch" gap={3}>
      <Text fontSize="sm" color="gray.500">
        Configure OpenAI API key for voice responses in Discord
      </Text>

      <HStack>
        <Input
          placeholder="sk-proj-..."
          type={showOpenAIKey ? 'text' : 'password'}
          value={openaiKeyInput}
          onChange={(e) => setOpenaiKeyInput(e.target.value)}
          flex={1}
        />
        <Button
          onClick={() => setShowOpenAIKey(!showOpenAIKey)}
          variant="ghost"
        >
          {showOpenAIKey ? <LuEyeOff /> : <LuEye />}
        </Button>
      </HStack>

      <HStack>
        <Button
          onClick={handleSaveOpenAIKey}
          colorScheme="blue"
          isDisabled={!openaiKeyInput.trim()}
        >
          Save API Key
        </Button>
        {hasOpenAIKey && (
          <Button onClick={handleClearOpenAIKey} variant="outline">
            Clear
          </Button>
        )}
      </HStack>

      {hasOpenAIKey && (
        <StatusBox status="success">
          ✅ OpenAI API key configured
        </StatusBox>
      )}

      <Text fontSize="xs" color="gray.500">
        Get your API key from{' '}
        <Link href="https://platform.openai.com/api-keys" isExternal color="blue.500">
          OpenAI Platform <LuExternalLink size={12} />
        </Link>
      </Text>
    </VStack>
  </Card.Body>
</Card.Root>
```

---

## Alternative: Quick Access from Voice Section

Could also add OpenAI key configuration near Discord voice settings for better UX:

```tsx
{/* In Discord section */}
<Text fontSize="sm" color="gray.500">
  Voice features require OpenAI API key.{' '}
  <Link onClick={() => scrollToOpenAI()} color="blue.500">
    Configure →
  </Link>
</Text>
```

---

## Priority

**Now**: Environment variable works (commit 802a9f8)
**Next**: Add UI for better UX and persistence
**Future**: Add voice configuration (model, voice selection)

---

## Notes

- ConfigProvider already has the infrastructure
- No IPC handlers needed (existing API key handlers work)
- Same pattern as OpenCode providers
- Key stored in electron-store (persists across restarts)
- Environment variable remains as fallback for dev/testing
