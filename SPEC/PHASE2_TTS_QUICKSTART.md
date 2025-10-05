# Phase 2 TTS Implementation - Quick Reference

## TL;DR

**What**: Add Text-to-Speech so bot speaks AI responses in voice channels
**How**: OpenAI TTS API → Opus format → Discord AudioPlayer
**Why**: Simpler than STT, validates audio pipeline, immediate value

## Core Concept

Use **OpenAI TTS API** (recommended):
- Simple REST API, high quality
- ~$0.015 per 1000 characters
- 500ms-1s latency

**Automatic routing**: When user has active voice session, bot speaks responses in voice channel AND sends text.

## Essential Code

### 1. Generate Audio (OpenAI)
```typescript
const response = await fetch('https://api.openai.com/v1/audio/speech', {
  method: 'POST',
  headers: { 'Authorization': `Bearer ${apiKey}` },
  body: JSON.stringify({
    model: 'tts-1',
    voice: 'nova',
    input: 'Hello, I am your AI assistant!',
    response_format: 'opus'  // Discord-friendly
  })
})
const audioBuffer = Buffer.from(await response.arrayBuffer())
```

### 2. Create Audio Resource (Discord.js)
```typescript
import { createAudioResource, StreamType } from '@discordjs/voice'
import { Readable } from 'stream'

const stream = Readable.from(audioBuffer)
const resource = createAudioResource(stream, {
  inputType: StreamType.Opus
})
```

### 3. Play in Voice Channel
```typescript
import { createAudioPlayer } from '@discordjs/voice'

const player = createAudioPlayer()
session.connection.subscribe(player)
player.play(resource)
```

### 4. Voice Session Detection
```typescript
const voiceSession = voiceModule.getUserSessionByChannel(message.channel.id)
if (voiceSession) {
  const audio = await ttsService.textToSpeech(response)
  await voiceModule.playTTS(voiceSession.id, audio)
}
```

## Implementation Steps

### Phase 2A: Basic TTS (2-3 days)

**Day 1: TTS Service**
- [ ] Create `src/main/services/tts-service.ts`
- [ ] Implement OpenAI API calls
- [ ] Test TTS generation
- [ ] Add error handling

**Day 2: Discord Integration**
- [ ] Add `playTTS()` to VoiceModule
- [ ] Create AudioPlayer per session
- [ ] Test playback in Discord
- [ ] Handle Opus format

**Day 3: Message Handler**
- [ ] Detect voice sessions
- [ ] Auto-generate TTS for responses
- [ ] Test end-to-end flow
- [ ] Add configuration

### Phase 2B: Polish (1-2 days)
- [ ] Handle long text (>4096 chars)
- [ ] Add playback queue
- [ ] Implement stop/pause commands
- [ ] Add voice selection options

## Key Files

### New Files
```
src/main/services/tts-service.ts    # OpenAI TTS integration
```

### Files to Modify
```
src/plugins/discord/voice/VoiceModule.ts
  - Add playTTS() method
  - Add getUserSessionByChannel()
  - Add AudioPlayer management

src/plugins/discord/DiscordPlugin.ts
  - Modify handleMentionMessage()
  - Add voice session detection
  - Integrate TTS service

src/main/index.ts
  - Initialize TTSService
  - Pass to DiscordPlugin
```

## Testing

### Manual Tests

1. **Basic Playback**
   - Join voice: `/voice join`
   - Type: `@Toji "Hello"`
   - Verify: Bot speaks + text appears

2. **No Voice Session**
   - Don't join voice
   - Type: `@Toji "Hello"`
   - Verify: Text-only response

3. **Long Response**
   - Type: `@Toji "Explain async/await"`
   - Verify: Full response spoken

### Test Code
```typescript
describe('TTSService', () => {
  it('generates audio from text', async () => {
    const audio = await tts.textToSpeech('Hello')
    expect(audio).toBeInstanceOf(Buffer)
    expect(audio.length).toBeGreaterThan(0)
  })
})
```

## Cost Optimization

- **Cost**: $15 per 1M characters (~$0.0075 per 500-char response)
- **Cache common responses**
- **Limit response length** to ~1000 chars
- **Rate limiting**: Max 100 requests/min

```typescript
// Cache example
const cache = new Map<string, Buffer>()
if (cache.has(text)) return cache.get(text)

// Length limit
if (text.length > 1000) {
  text = text.substring(0, 1000) + '... (see text channel)'
}
```

## Audio Format

**Use Opus** (recommended):
- Native Discord format
- No conversion overhead
- Smaller files
- Request: `response_format: 'opus'`
- Playback: `inputType: StreamType.Opus`

## Documentation

- **OpenAI TTS**: https://platform.openai.com/docs/guides/text-to-speech
- **API Reference**: https://platform.openai.com/docs/api-reference/audio/createSpeech
- **Discord.js Voice**: https://discordjs.guide/voice/
- **Voice API**: https://discord.js.org/docs/packages/voice/main

## FAQ

**Q: What about streaming?**
A: Not needed. API returns complete audio fast enough (<1s).

**Q: Real-time conversations?**
A: Phase 3 (Realtime API). Phase 2 is text input → voice output only.

**Q: Can users interrupt?**
A: Phase 2: No. Phase 3: Yes (with turn detection).

---

**Start**: Create `src/main/services/tts-service.ts`! 🚀
