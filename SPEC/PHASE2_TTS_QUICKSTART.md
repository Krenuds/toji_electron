# Phase 2 TTS Implementation - Quick Reference

## TL;DR

**What**: Add Text-to-Speech so bot speaks AI responses in voice channels
**How**: OpenAI TTS API → Opus format → Discord AudioPlayer
**Why TTS First**: Simpler than STT, validates audio pipeline, immediate value

## Answer to Your Questions

### Q: Do we need to use OpenAI's official API?

**Yes**, for Phase 2. Options:

1. **OpenAI TTS API** ✅ (Recommended)
   - Simple REST API
   - High quality
   - ~$0.015 per 1000 characters
   - 500ms-1s latency

2. **OpenAI Realtime API** (Phase 3)
   - For full voice conversations
   - Requires WebSocket
   - More complex but lower latency

3. **Local TTS** (Not recommended)
   - Lower quality
   - Complex setup
   - No cost but maintenance burden

### Q: How does automatic routing work?

**Yes, automatic!** Here's the logic:

```typescript
User types: @Toji "What's the weather?"
    ↓
Message handler detects @mention
    ↓
Check: Does user have active voice session?
    ↓ YES
Generate AI response (text)
    ↓
Convert text → TTS audio
    ↓
Play audio in voice channel
    ↓
Also send text to Discord channel
```

**Detection method**:
```typescript
// In message handler:
const voiceSession = voiceModule.getUserSessionByChannel(message.channel.id)

if (voiceSession) {
  // Generate TTS and play in voice
  const audio = await ttsService.textToSpeech(response)
  await voiceModule.playTTS(voiceSession.id, audio)
}
```

### Q: How do we wire this to Discord.js?

**Three-step pipeline**:

#### Step 1: Generate Audio (OpenAI)
```typescript
const response = await fetch('https://api.openai.com/v1/audio/speech', {
  method: 'POST',
  headers: { 'Authorization': `Bearer ${apiKey}` },
  body: JSON.stringify({
    model: 'tts-1',
    voice: 'nova',
    input: 'Hello, I am your AI assistant!',
    response_format: 'opus'  // Discord-friendly format
  })
})

const audioBuffer = Buffer.from(await response.arrayBuffer())
```

#### Step 2: Create Audio Resource (Discord.js)
```typescript
import { createAudioResource, StreamType } from '@discordjs/voice'
import { Readable } from 'stream'

// Convert buffer to stream
const stream = Readable.from(audioBuffer)

// Create resource
const resource = createAudioResource(stream, {
  inputType: StreamType.Opus  // Tell Discord it's Opus
})
```

#### Step 3: Play in Voice Channel (Discord.js)
```typescript
import { createAudioPlayer } from '@discordjs/voice'

// Create player (once per session)
const player = createAudioPlayer()

// Subscribe player to voice connection
session.connection.subscribe(player)

// Play the audio
player.play(resource)
```

## Official Documentation

### OpenAI TTS API
- **Docs**: https://platform.openai.com/docs/guides/text-to-speech
- **API Reference**: https://platform.openai.com/docs/api-reference/audio/createSpeech
- **Pricing**: https://openai.com/api/pricing/

### Discord.js Voice
- **Guide**: https://discordjs.guide/voice/
- **API Docs**: https://discord.js.org/docs/packages/voice/main
- **Audio Resources**: https://discord.js.org/docs/packages/voice/main/function/createAudioResource

## Implementation Order

### Phase 2A: Basic TTS (2-3 days)

1. **Day 1: TTS Service**
   - [ ] Create `TTSService` class
   - [ ] Implement OpenAI API calls
   - [ ] Test TTS generation (save to file)
   - [ ] Add error handling

2. **Day 2: Discord Integration**
   - [ ] Add `playTTS()` to VoiceModule
   - [ ] Create AudioPlayer per session
   - [ ] Test playback in Discord voice
   - [ ] Handle audio formats (Opus)

3. **Day 3: Message Handler Integration**
   - [ ] Detect voice sessions in message handler
   - [ ] Auto-generate TTS for responses
   - [ ] Test end-to-end flow
   - [ ] Add configuration options

### Phase 2B: Polish (1-2 days)

4. **Polish**
   - [ ] Handle long text (>4096 chars)
   - [ ] Add playback queue
   - [ ] Implement stop/pause commands
   - [ ] Add voice selection options

## Key Files to Create/Modify

### New Files
```
src/main/services/
└── tts-service.ts          # OpenAI TTS API integration

SPEC/
└── TTS_IMPLEMENTATION.md   # Detailed guide
```

### Files to Modify
```
src/plugins/discord/voice/VoiceModule.ts
  - Add playTTS() method
  - Add getUserSessionByChannel() helper
  - Add AudioPlayer management

src/plugins/discord/DiscordPlugin.ts
  - Modify handleMentionMessage()
  - Add voice session detection
  - Integrate TTS service

src/main/index.ts
  - Initialize TTSService
  - Pass to DiscordPlugin
```

## Testing Plan

### Manual Tests

1. **Basic Playback**
   ```
   1. Join voice: /voice join
   2. Type: @Toji "Hello"
   3. Verify: Bot speaks in voice channel
   4. Verify: Text also appears in channel
   ```

2. **No Voice Session**
   ```
   1. Don't join voice
   2. Type: @Toji "Hello"
   3. Verify: Text-only response (no TTS)
   ```

3. **Long Response**
   ```
   1. Join voice: /voice join
   2. Type: @Toji "Explain async/await in detail"
   3. Verify: Bot speaks full response
   ```

### Automated Tests (Future)

```typescript
describe('TTSService', () => {
  it('generates audio from text', async () => {
    const audio = await tts.textToSpeech('Hello')
    expect(audio).toBeInstanceOf(Buffer)
    expect(audio.length).toBeGreaterThan(0)
  })

  it('handles long text', async () => {
    const longText = 'word '.repeat(1000)
    const chunks = tts.splitText(longText)
    expect(chunks.length).toBeGreaterThan(1)
  })
})
```

## Cost Analysis

### TTS Pricing
- **Cost**: $15 per 1M characters
- **Average response**: 500 characters = $0.0075
- **100 responses/hour**: $0.75/hour
- **Monthly (1000 hours)**: ~$750

**Much cheaper than Realtime API** ($0.30/min = $18/hour)

### Optimization Strategies

1. **Cache common responses**
   ```typescript
   const cache = new Map<string, Buffer>()

   if (cache.has(text)) {
     return cache.get(text)
   }
   ```

2. **Limit response length**
   ```typescript
   if (text.length > 1000) {
     text = text.substring(0, 1000) + '... (see text channel)'
   }
   ```

3. **Rate limiting**
   ```typescript
   const limiter = new RateLimiter({
     maxRequests: 100,
     perMinutes: 1
   })
   ```

## Audio Format Decision

### Recommended: Opus

**Why**:
- Native Discord format
- No conversion overhead
- Smaller files
- Optimized for voice

**Request**:
```typescript
{
  response_format: 'opus'
}
```

**Playback**:
```typescript
createAudioResource(stream, {
  inputType: StreamType.Opus
})
```

### Alternative: PCM

**When**: If you need to manipulate audio (volume, effects)

**Caveat**: Larger files, requires conversion

## Next Steps

1. **Read Full Plan**: `SPEC/PHASE2_TTS_PLAN.md`
2. **Start Implementation**: Create `TTSService`
3. **Test API**: Generate audio file
4. **Integrate Discord**: Play audio in voice channel
5. **Test E2E**: Full message → voice flow

## Questions?

**Q: What about streaming?**
A: Not needed for TTS. OpenAI TTS API returns complete audio file. Fast enough (<1s) for good UX.

**Q: What about real-time conversations?**
A: That's Phase 3 (Realtime API). Phase 2 is text input → voice output only.

**Q: Can users interrupt?**
A: Phase 2: No. Phase 3: Yes (with Realtime API's turn detection).

**Q: What about multiple users?**
A: Each user gets own session. Bot speaks to all in voice channel (Discord broadcasts).

---

**Ready to implement?** Start with `src/main/services/tts-service.ts`! 🚀
