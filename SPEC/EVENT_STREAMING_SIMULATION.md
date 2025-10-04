# Event Streaming Implementation Simulation

## Current Pipeline (Blocking)

### Discord Bot Message Flow
```
1. Discord Message Received
   ↓
2. DiscordPlugin.handleMessage(message)
   ↓
3. projectManager.chat(message.content)
   ↓
4. toji.chat(message)  ← BLOCKS HERE waiting for full response
   ↓
5. client.session.prompt({ ... })  ← Waits for complete response
   ↓
6. Extract text from response.parts
   ↓
7. return responseText (full string)
   ↓
8. sendDiscordResponse(message, response)  ← Send entire response at once
```t

**Problem**: Discord shows typing indicator, then waits 10-60+ seconds, then dumps entire response.

---

## Proposed Pipeline (Event-Driven Streaming)

### Event Subscription Architecture
```
┌─────────────────────────────────────────────────────────┐
│  Toji Core (Main Process)                              │
│  ┌────────────────────────────────────────────────┐   │
│  │ Event Stream Subscription                       │   │
│  │  - Subscribe to client.event.subscribe()       │   │
│  │  - Listen for message.part.updated events      │   │
│  │  - Emit Toji-level events                      │   │
│  └────────────────────────────────────────────────┘   │
└─────────────────────────────────────────────────────────┘
                         │
                         │ (Toji emits: 'chat:chunk', 'chat:complete')
                         │
         ┌───────────────┴───────────────┐
         │                               │
         ▼                               ▼
┌─────────────────┐           ┌─────────────────┐
│ Discord Plugin  │           │ Electron/IPC    │
│                 │           │                 │
│ Subscribe to:   │           │ Subscribe to:   │
│ - chat:chunk    │           │ - chat:chunk    │
│ - chat:complete │           │ - chat:complete │
│                 │           │                 │
│ Buffer chunks   │           │ Stream to UI    │
│ Send to Discord │           │ Real-time       │
└─────────────────┘           └─────────────────┘
```

### New Discord Flow (Streaming)
```
1. Discord Message Received
   ↓
2. DiscordPlugin.handleMessage(message)
   ↓
3. projectManager.chatStreaming(message.content, {
     onChunk: (text) => { ... },      ← Real-time callbacks
     onComplete: (full) => { ... }
   })
   ↓
4. toji.chatStreaming(message, callbacks)
   ↓
5. Subscribe to event stream
   │
   ├─ Event: message.part.updated
   │  ├─ Extract part.text
   │  ├─ Append to buffer
   │  └─ Call onChunk(text)  ← Immediate feedback
   │     └─ Discord: Update/edit message in real-time
   │
   └─ Event: message.updated (complete)
      └─ Call onComplete(fullText)
         └─ Discord: Final message edit
```

---

## Event Types We Care About

Based on OpenCode SDK research:

### Primary Events
```typescript
// Individual text chunks arrive
type EventMessagePartUpdated = {
  type: "message.part.updated"
  properties: {
    part: Part  // Contains { type: 'text', text: '...' }
  }
}

// Message metadata updated (completion, etc)
type EventMessageUpdated = {
  type: "message.updated"
  properties: {
    info: Message  // Full message object with status
  }
}
```

### Secondary Events (Future)
```typescript
// Session becomes idle (response complete)
type EventSessionIdle = {
  type: "session.idle"
  properties: {
    sessionID: string
  }
}

// Permission requests (for tool use)
type EventPermissionUpdated = {
  type: "permission.updated"
  properties: Permission
}
```

---

## Implementation Plan

### Phase 1: Core Event Subscription (Toji Class)

Add to `Toji` class:

```typescript
// New method: Subscribe to OpenCode events
private async subscribeToEvents(): Promise<void> {
  const client = this.getClient()
  if (!client) return

  const events = await client.event.subscribe()

  for await (const event of events.stream) {
    this.handleOpencodeEvent(event)
  }
}

// Handle incoming OpenCode events
private handleOpencodeEvent(event: Event): void {
  switch (event.type) {
    case 'message.part.updated':
      // Extract part and emit Toji event
      const part = event.properties.part
      if (part.type === 'text') {
        this.emit('chat:chunk', {
          sessionId: this.getCurrentSessionId(),
          text: part.text,
          partId: part.id
        })
      }
      break

    case 'message.updated':
      // Message complete
      this.emit('chat:complete', {
        sessionId: this.getCurrentSessionId(),
        message: event.properties.info
      })
      break
  }
}

// New streaming chat method
async chatStreaming(
  message: string,
  callbacks: {
    onChunk?: (text: string) => void
    onComplete?: (fullText: string) => void
    onError?: (error: Error) => void
  },
  sessionId?: string
): Promise<void> {
  // Start subscription if not already running
  // Send message via prompt
  // Listen for events and call callbacks
}
```

### Phase 2: Discord Plugin Integration

Update `DiscordProjectManager`:

```typescript
// Replace blocking chat() with streaming version
async chatStreaming(
  message: string,
  callbacks: {
    onChunk?: (text: string) => void
    onComplete?: (fullText: string) => void
  }
): Promise<void> {
  return this.toji.chatStreaming(message, callbacks)
}
```

Update `DiscordPlugin.handleMessage()`:

```typescript
// OLD (blocking)
const response = await this.projectManager.chat(message.content)
await sendDiscordResponse(message, response)

// NEW (streaming)
let sentMessage: Message | undefined
let buffer = ''

await this.projectManager.chatStreaming(message.content, {
  onChunk: async (text) => {
    buffer += text

    // Update every N characters or N milliseconds
    if (!sentMessage) {
      sentMessage = await message.reply(buffer)
    } else if (buffer.length % 100 === 0) {  // Update every 100 chars
      await sentMessage.edit(buffer)
    }
  },

  onComplete: async (fullText) => {
    if (sentMessage) {
      await sentMessage.edit(fullText)  // Final update
    } else {
      await message.reply(fullText)
    }
  }
})
```

---

## Discord-Specific Considerations

### Rate Limits
- Discord allows ~5 message edits per 5 seconds per channel
- **Solution**: Batch chunks, update every 100-200 characters or 500ms intervals

### Message Length
- Discord max message length: 2000 characters
- **Solution**: Split long responses into multiple messages automatically

### Typing Indicator
- Typing indicator lasts 10 seconds
- **Solution**: Refresh typing indicator every 8 seconds during streaming

---

## Testing Strategy

### Unit Tests
1. Test event subscription starts correctly
2. Test event handling routes to correct emitters
3. Test chunk buffering and aggregation

### Integration Tests
1. Send simple message, verify chunks arrive
2. Send long message, verify multiple chunks
3. Test error handling mid-stream

### Discord Tests
1. Verify typing indicator refreshes
2. Verify message edits respect rate limits
3. Verify long responses split correctly

---

## Rollout Plan

### Step 1: Implement Core (Toji)
- Add event subscription
- Add streaming chat method
- Keep blocking chat() for backward compatibility

### Step 2: Implement Discord
- Add streaming to DiscordProjectManager
- Update handleMessage to use streaming
- Test in development Discord server

### Step 3: Test & Iterate
- Monitor Discord rate limits
- Tune chunk size and update frequency
- Handle edge cases (network drops, etc)

### Step 4: Extend to Electron
- Wire up IPC handlers for streaming
- Update renderer to show real-time updates
- Add UI for streaming indicator

---

## Open Questions

1. **Session Management**: Do we need one event subscription per session, or one global?
   - **Answer**: One global subscription, filter events by sessionId

2. **Error Recovery**: What happens if event stream disconnects mid-response?
   - **Answer**: Reconnect automatically, fall back to blocking API if needed

3. **Concurrent Messages**: Can Discord handle multiple streaming responses in different channels?
   - **Answer**: Yes, each channel maintains its own state

4. **Performance**: Will event subscription add latency?
   - **Answer**: Minimal - events are push-based, not polling
