# Current Discord Pipeline Analysis

## How Discord Receives Responses Today

### The Call Chain

```typescript
// 1. Discord message arrives
DiscordPlugin.handleMessage(message: Message)

// 2. Routes to project manager
this.projectManager.chat(message.content)

// 3. Thin wrapper calls Toji
DiscordProjectManager.chat(message: string): Promise<string> {
  return this.toji.chat(message)  // ← Blocking call
}

// 4. Toji.chat() blocks until complete
Toji.chat(message: string, sessionId?: string): Promise<string> {
  // Get/create session
  // Send prompt via client.session.prompt({ ... })
  // Wait for full response
  // Extract all text parts
  // Return complete string
}

// 5. Response flows back up
return responseText  // Full response, could be 1000s of characters

// 6. Discord sends it all at once
await sendDiscordResponse(message, response)
```

### Current User Experience

1. User types: "Explain how authentication works"
2. Bot shows typing indicator
3. **User waits 30-60 seconds** ⏳
4. Bot stops typing
5. **Entire response appears at once** (wall of text)

### Key Files

- **Entry Point**: `src/plugins/discord/DiscordPlugin.ts` line 121, 146
  - `await this.projectManager.chat(message.content)`
  
- **Wrapper**: `src/plugins/discord/modules/DiscordProjectManager.ts` line 338
  - `return this.toji.chat(message)`
  
- **Core**: `src/main/toji/index.ts` line 262
  - Blocking `await client.session.prompt({ ... })`

---

## Why This Needs to Change

### Problems

1. **Poor UX**: Long wait with no feedback
2. **Rate Limits**: Can't show progress without hitting Discord edit limits
3. **No Interactivity**: Can't cancel or modify mid-response
4. **Memory**: Full response must fit in memory before sending

### What We Want

```
User types: "Explain authentication"
         ↓
Bot shows typing
         ↓
"Authentication in this app uses..." ← First chunk appears immediately
         ↓
"JWT tokens stored in..." ← Updates in real-time
         ↓
"The login flow starts..." ← Keep updating
         ↓
Final complete response ← Last update
```

---

## The Simple Swap Strategy

### Current (Blocking)

```typescript
// DiscordPlugin.ts
const response = await this.projectManager.chat(message.content)
await sendDiscordResponse(message, response)
```

### New (Event-Driven)

```typescript
// DiscordPlugin.ts
let buffer = ''
let sentMessage: Message | undefined

await this.projectManager.chatStreaming(message.content, {
  onChunk: async (text: string) => {
    buffer += text
    // Update message every 100 chars to respect rate limits
    if (!sentMessage) {
      sentMessage = await message.reply(buffer)
    } else if (buffer.length % 100 === 0) {
      await sentMessage.edit(buffer)
    }
  },
  
  onComplete: async (fullText: string) => {
    // Final update with complete text
    if (sentMessage) {
      await sentMessage.edit(fullText)
    } else {
      await message.reply(fullText)
    }
  }
})
```

### Changes Required

1. **Toji Class**: Add `chatStreaming()` method that:
   - Subscribes to `client.event.subscribe()`
   - Listens for `message.part.updated` events
   - Calls callbacks for each chunk
   
2. **DiscordProjectManager**: Add streaming wrapper
   ```typescript
   async chatStreaming(message: string, callbacks: StreamCallbacks) {
     return this.toji.chatStreaming(message, callbacks)
   }
   ```

3. **DiscordPlugin**: Replace blocking call with streaming call (shown above)

---

## Event Types We'll Use

Based on OpenCode SDK analysis:

### For Response Chunks
```typescript
{
  type: "message.part.updated",
  properties: {
    part: {
      type: "text",
      text: "chunk of response text..."  // ← This is what we want!
    }
  }
}
```

### For Completion Signal
```typescript
{
  type: "message.updated",
  properties: {
    info: Message  // Has status, indicates completion
  }
}
```

### For Session Idle
```typescript
{
  type: "session.idle",
  properties: {
    sessionID: string  // Response is done
  }
}
```

---

## Implementation Checklist

### Phase 1: Core Streaming (Toji)
- [ ] Add event subscription to Toji class
- [ ] Implement `chatStreaming()` method
- [ ] Keep old `chat()` for backward compatibility
- [ ] Test event handling in isolation

### Phase 2: Discord Integration
- [ ] Add `chatStreaming()` to DiscordProjectManager
- [ ] Update DiscordPlugin message handler
- [ ] Implement Discord-specific buffering/rate limiting
- [ ] Test in dev Discord server

### Phase 3: Polish
- [ ] Handle long messages (>2000 chars, split into multiple)
- [ ] Refresh typing indicator during streaming
- [ ] Add error handling for disconnects
- [ ] Add cancellation support

---

## Next Steps

1. **Study Events**: Run a test subscription to see actual event payloads
2. **Prototype**: Implement minimal `chatStreaming()` in Toji
3. **Test**: Wire up to Discord and verify chunks arrive
4. **Tune**: Adjust buffering and update frequency for Discord rate limits
5. **Deploy**: Roll out to production Discord bot

---

## Questions to Resolve

### Q: One subscription or multiple?
**A**: One global event subscription per Toji instance, filter by sessionId

### Q: What if event stream disconnects?
**A**: Reconnect automatically, have fallback to blocking `chat()` method

### Q: Rate limits on Discord edits?
**A**: Batch updates every 100 chars or 500ms, whichever comes first

### Q: Can we cancel mid-stream?
**A**: Yes! Call `client.session.abort({ path: { id: sessionId } })`
