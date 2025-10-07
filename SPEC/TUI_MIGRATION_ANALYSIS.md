# TUI Migration Analysis

**Date:** October 6, 2025
**Status:** Research Phase
**Decision:** Pending

## Current Architecture

### How We Interact with OpenCode SDK

We have **ONE primary interaction pattern** with the OpenCode SDK:

```typescript
// Current: session.prompt() via Toji class
await client.session.prompt({
  path: { id: sessionId },
  body: {
    parts: [
      { type: 'file', url: 'data:image/png;base64,...', mime: 'image/png' },
      { type: 'text', text: 'User message' }
    ]
  },
  query: { directory: projectDirectory }
})
```

### Call Sites (3 total)

1. **Toji.chat()** (line 314) - Non-streaming chat
2. **Toji.chatStreaming()** (line 409) - Streaming chat with event subscription
3. Both methods called from:
   - **IPC Handler** (`toji:chat`) - Renderer to main process
   - **Discord Plugin** - DiscordProjectManager.chat/chatStreaming()
   - **Renderer Hook** - useChatCoordinator.sendMessage()

### What session.prompt() Does

- Creates/uses session
- Sends message parts (text + optional images)
- Returns response (non-streaming) OR triggers events (streaming)
- Handles project directory context

### Our Abstraction Layer

```
┌─────────────────────────────────────────────────┐
│  User Interfaces                                │
│  - Electron Renderer (React UI)                 │
│  - Discord Bot (Discord.js)                     │
└─────────────────────────────────────────────────┘
                      ↓
┌─────────────────────────────────────────────────┐
│  Toji.chat() / Toji.chatStreaming()             │
│  - Session management                           │
│  - Image conversion (imageToFilePart)           │
│  - Event streaming                              │
│  - Error handling                               │
└─────────────────────────────────────────────────┘
                      ↓
┌─────────────────────────────────────────────────┐
│  OpenCode SDK: client.session.prompt()          │
│  - HTTP API calls to OpenCode server            │
└─────────────────────────────────────────────────┘
                      ↓
┌─────────────────────────────────────────────────┐
│  OpenCode Server                                │
│  - LLM interaction                              │
│  - Tool execution                               │
│  - File operations                              │
└─────────────────────────────────────────────────┘
```

---

## TUI Alternative Architecture

### TUI Control API

OpenCode SDK provides TUI control methods:

```typescript
// Append text to TUI prompt (with @file attachments!)
await client.tui.appendPrompt({
  body: { text: '@screenshot.png Please describe this image' }
})

// Submit the prompt (triggers TUI's internal processing)
await client.tui.submitPrompt()

// Other TUI controls
await client.tui.clearPrompt()
await client.tui.showToast({ body: { message: 'Done!', variant: 'success' } })
await client.tui.openSessions()
await client.tui.openModels()
```

### How TUI Handles @filename

From GitHub research:

1. **Paste Detection** - When `@filename` is pasted/typed:

   ```go
   // Detects file paths starting with @
   if strings.HasPrefix(text, "@") && filepath.exists(path) {
     attachment := createAttachmentFromFile(path)
     textarea.InsertAttachment(attachment)
   }
   ```

2. **Image Encoding** - Images are immediately base64-encoded:

   ```go
   // For images: read + encode on attachment
   fileBytes := os.ReadFile(filePath)
   base64Encoded := base64.Encode(fileBytes)
   attachment.URL = fmt.Sprintf("data:%s;base64,%s", mimeType, base64Encoded)
   ```

3. **Prompt Submission** - Attachments convert to FilePart:
   ```go
   // On submit: attachments → FilePart in session.prompt()
   parts := []Part{
     FilePart{URL: "data:image/png;base64,...", Mime: "image/png"},
     TextPart{Text: userText}
   }
   ```

### Proposed TUI-Based Architecture

```
┌─────────────────────────────────────────────────┐
│  User Interfaces                                │
│  - Electron Renderer (React UI)                 │
│  - Discord Bot (Discord.js)                     │
└─────────────────────────────────────────────────┘
                      ↓
┌─────────────────────────────────────────────────┐
│  Toji TUI Controller (NEW)                      │
│  - Formats messages with @filename syntax       │
│  - Calls tui.appendPrompt()                     │
│  - Calls tui.submitPrompt()                     │
│  - Monitors session events                      │
└─────────────────────────────────────────────────┘
                      ↓
┌─────────────────────────────────────────────────┐
│  OpenCode TUI (Go Binary)                       │
│  - Parses @filename attachments                 │
│  - Base64-encodes images                        │
│  - Calls session.prompt() internally            │
└─────────────────────────────────────────────────┘
                      ↓
┌─────────────────────────────────────────────────┐
│  OpenCode Server                                │
│  - LLM interaction                              │
│  - Tool execution                               │
│  - File operations                              │
└─────────────────────────────────────────────────┘
```

---

## Migration Options

### Option 1: Full TUI Control (Radical)

**Change:**

- Replace `session.prompt()` calls with `tui.appendPrompt()` + `tui.submitPrompt()`
- Pre-process messages to inject `@filename` syntax
- Remove `imageToFilePart()` - TUI handles it

**Pros:**

- ✅ Natural language image requests work: "look at @screenshot.png"
- ✅ TUI handles all attachment parsing/encoding
- ✅ Less code to maintain (delete image-utils.ts)
- ✅ Consistent with TUI's proven implementation

**Cons:**

- ❌ Requires TUI process running (adds dependency)
- ❌ Less direct control over session.prompt() parameters
- ❌ Can't use session.prompt() features directly (agents, model selection)
- ❌ TUI designed for interactive terminal, not programmatic control
- ❌ Unknown: Does TUI API work without interactive terminal?

**Risk Level:** 🔴 **HIGH** - Unproven approach, potential compatibility issues

---

### Option 2: Hybrid Approach (Moderate)

**Change:**

- Keep `session.prompt()` for direct calls
- Add TUI control for specific features (image attachments)
- Use `@filename` parsing as **input preprocessing**

**Implementation:**

```typescript
// Preprocess message to extract @filename references
function preprocessMessage(message: string): {
  cleanMessage: string
  images: ImageAttachment[]
} {
  const filePattern = /@([\w\-./\\]+\.(png|jpg|jpeg|gif|webp|bmp))/gi
  const images: ImageAttachment[] = []

  const cleanMessage = message.replace(filePattern, (match, filepath) => {
    images.push({ path: filepath })
    return `[Attached: ${filepath}]`
  })

  return { cleanMessage, images }
}

// Use in chat method
async chat(message: string, sessionId?: string) {
  const { cleanMessage, images } = preprocessMessage(message)
  return this.chat(cleanMessage, sessionId, images) // existing method
}
```

**Pros:**

- ✅ Natural language image requests work
- ✅ Keep existing session.prompt() control
- ✅ No TUI process dependency
- ✅ Reuse proven TUI parsing logic
- ✅ Can use both approaches as needed

**Cons:**

- ⚠️ Maintain two code paths
- ⚠️ Re-implementing TUI's parser (more code)

**Risk Level:** 🟡 **MEDIUM** - More complex but backward compatible

---

### Option 3: Keep Current + Enhance (Conservative)

**Change:**

- Keep existing `session.prompt()` implementation
- Add `@filename` parsing as optional preprocessing
- Keep explicit `images` parameter for programmatic use

**Implementation:**

- Add optional `parseAttachments: boolean` parameter
- If true, preprocess message for `@filename` syntax
- Default false (explicit is better than implicit)

**Pros:**

- ✅ Zero breaking changes
- ✅ Explicit control maintained
- ✅ Optional natural language support
- ✅ Easy to roll back

**Cons:**

- ⚠️ Two ways to do the same thing (confusing API)
- ⚠️ Parser code maintenance

**Risk Level:** 🟢 **LOW** - Additive, non-breaking change

---

## Impact Analysis

### Code Changes Required

| Option                     | Files Modified | Lines Changed | Risk   |
| -------------------------- | -------------- | ------------- | ------ |
| **Option 1: Full TUI**     | ~5 files       | ~200 lines    | HIGH   |
| **Option 2: Hybrid**       | ~3 files       | ~100 lines    | MEDIUM |
| **Option 3: Conservative** | ~2 files       | ~50 lines     | LOW    |

### Breaking Changes

- **Option 1:** Yes - All `toji.chat()` callers need updates
- **Option 2:** No - Existing API preserved
- **Option 3:** No - Pure addition

### Testing Requirements

- **Option 1:** Full integration testing with TUI process
- **Option 2:** Test both paths (direct + TUI control)
- **Option 3:** Test new preprocessing path only

---

## Key Questions to Answer

### About TUI Control API

1. ❓ **Can `tui.appendPrompt()` work without interactive terminal?**
   - SDK docs show it's a REST API endpoint
   - But designed for controlling running TUI
   - Need to test if it works programmatically

2. ❓ **Does TUI process need to be visible?**
   - Can we spawn TUI in headless mode?
   - Or does it need an actual terminal?

3. ❓ **How do we get responses back?**
   - TUI displays in terminal, not via API
   - Would need `event.subscribe()` anyway
   - So TUI API doesn't simplify response handling

4. ❓ **Can we control TUI session management?**
   - Does `tui.submitPrompt()` use active session?
   - How do we specify which session to use?
   - This is unclear from docs

### About Our Implementation

5. ❓ **Do we need natural language image requests?**
   - Current use cases: Discord attachments (explicit)
   - Future use case: UI file picker (explicit)
   - Natural language might be nice-to-have, not critical

6. ❓ **What's the actual user workflow?**
   - Discord: User uploads image → Bot receives attachment
   - Electron UI: User picks file → UI sends path
   - Both are **explicit attachments**, not natural language!

---

## Recommendation

**SHORT TERM: Option 3 (Conservative)**

Keep current implementation, add optional `@filename` preprocessing:

```typescript
async chat(
  message: string,
  sessionId?: string,
  images?: ImageAttachment[],
  parseAttachments = false // NEW: opt-in @filename parsing
): Promise<string> {
  // If parseAttachments enabled, extract @filename references
  if (parseAttachments && !images) {
    const parsed = this.parseFileAttachments(message)
    message = parsed.cleanMessage
    images = parsed.images
  }

  // Rest of implementation unchanged
  // ...
}
```

**Reasoning:**

1. Our current use cases (Discord, UI) use **explicit attachments**
2. Natural language requests are a nice-to-have, not MVP
3. TUI control API is unproven for programmatic use
4. Zero breaking changes = zero risk
5. Can always migrate to TUI later if needed

**LONG TERM: Research TUI Embedding**

If we want TUI features, consider:

- Embedding actual TUI in Electron (xterm.js + TUI binary)
- Giving users choice: Custom UI OR native TUI
- Using TUI as reference implementation, not control API

---

## Next Steps

1. **Implement Option 3** - Add optional `@filename` parsing
2. **Test with real images** - Validate current implementation works
3. **Document usage patterns** - When to use explicit vs parsed attachments
4. **Monitor user feedback** - Do users want natural language image requests?
5. **Prototype TUI embedding** - Explore xterm.js + TUI binary integration

---

## Decision Log

| Date       | Decision                 | Reason                                         |
| ---------- | ------------------------ | ---------------------------------------------- |
| 2025-10-06 | Research TUI control API | Discovered TUI has attachment parsing          |
| 2025-10-06 | Recommend Option 3       | Low risk, non-breaking, fits current use cases |
| TBD        | Final decision           | Awaiting stakeholder input                     |
