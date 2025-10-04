# Phase 2: TTS Implementation Summary

**Status**: ✅ **COMPLETE**

**Completed**: [Date of completion]

**Commits**:
- `dd6618b` - TTSService implementation
- `9a58add` - VoiceModule TTS playback methods
- `0fafa09` - Discord message handler integration

---

## Overview

Phase 2 adds Text-to-Speech (TTS) output to the voice system, allowing Toji to speak responses in Discord voice channels when users are connected.

**Architecture**: TTS-first approach using OpenAI TTS API
- Simpler than Realtime API (no websockets, just REST)
- Discord-native Opus format support (no transcoding)
- Incremental implementation with safety commits

---

## Implementation Details

### 1. TTSService (`src/main/services/tts-service.ts`)

**Purpose**: OpenAI TTS API integration service

**Features**:
- OpenAI TTS API integration via REST endpoint
- Configurable voice models (tts-1, tts-1-hd)
- Configurable voices (alloy, echo, fable, onyx, nova, shimmer)
- Opus format output (Discord-native, no conversion needed)
- Smart text chunking for >4096 character limit
- API key validation and status checking

**Key Methods**:
```typescript
async textToSpeech(text: string, options?: TTSOptions): Promise<Buffer>
```
- Calls OpenAI TTS API
- Returns audio Buffer in Opus format
- Handles API errors with descriptive messages

```typescript
splitText(text: string, maxLength = 4096): string[]
```
- Splits long text at sentence/word boundaries
- Maintains natural speech flow
- Returns array of chunks under maxLength

**Configuration** (from ConfigProvider):
```typescript
interface TTSOptions {
  model?: 'tts-1' | 'tts-1-hd'  // Default: 'tts-1' (fast)
  voice?: 'alloy' | 'echo' | ... // Default: 'nova'
  format?: 'opus' | 'mp3' | ... // Default: 'opus'
  speed?: number                 // Default: 1.0 (0.25-4.0)
}
```

**Costs** (OpenAI TTS-1):
- $15/1M characters = $0.000015 per character
- Average message (200 chars) = $0.003
- 1000 messages = $3
- Extremely cost-effective for typical usage

---

### 2. VoiceModule TTS Methods (`src/plugins/discord/voice/VoiceModule.ts`)

**Purpose**: Audio playback in Discord voice channels

**New Class Properties**:
```typescript
private audioPlayers: Map<string, AudioPlayer> = new Map()
```
- Tracks one AudioPlayer per voice session
- Enables concurrent playback in multiple sessions

**New Methods**:

#### `playTTS(sessionId: string, audioBuffer: Buffer): Promise<void>`
**Purpose**: Play TTS audio in a voice session

**Flow**:
1. Get voice session by ID (validates session exists)
2. Get voice connection (validates bot is connected)
3. Get/create AudioPlayer for this session
   - Create player if first time
   - Subscribe player to voice connection
   - Setup error event handlers
4. Convert Buffer → Readable stream (Node.js streams)
5. Create AudioResource with StreamType.Opus (no transcoding)
6. Play audio via player.play(resource)

**Error Handling**:
- Throws if session not found
- Throws if no voice connection
- Logs audio player errors
- Comprehensive logging for debugging

#### `stopTTS(sessionId: string): void`
**Purpose**: Stop TTS playback

**Flow**:
1. Get AudioPlayer for session
2. Call player.stop() if exists
3. Log stop action

#### `getUserSessionByChannel(textChannelId: string): VoiceSession | undefined`
**Purpose**: Find voice session by project text channel

**Flow**:
1. Loop through all sessions
2. Match session.projectChannelId with textChannelId
3. Return matching session or undefined

**Usage**: Routes TTS audio to correct voice channel based on where message was sent

---

### 3. Discord Message Handler Integration (`src/plugins/discord/DiscordPlugin.ts`)

**Purpose**: Wire TTS into bot message responses

**Changes**:

1. **Constructor**:
   - Added `TTSService` as optional class property
   - Initialize TTSService if ConfigProvider available
   - Updated config interface to accept ConfigProvider

2. **Message Handler** (mention detection):
   - Added TTS playback in `onComplete` callback
   - Checks if user has active voice session for this project
   - Generates TTS audio from response text
   - Plays audio in voice channel
   - Graceful error handling (TTS failure doesn't break chat)

**Flow**:
```
User types: @Toji explain the codebase
  ↓
Bot generates response (streaming with progress embeds)
  ↓
onComplete(fullText) callback fires
  ↓
Send text response to Discord channel
  ↓
Check: Does user have voice session in this channel?
  ↓ (yes)
Generate TTS audio via TTSService
  ↓
Play audio via VoiceModule.playTTS()
  ↓
User hears response in voice channel + sees text
```

**Code**:
```typescript
onComplete: async (fullText) => {
  // Send text response
  if (progressMessage) await progressMessage.delete()
  await sendDiscordResponse(message, fullText)

  // Play TTS if in voice
  if (this.voiceModule && this.ttsService) {
    try {
      const session = this.voiceModule.getUserSessionByChannel(message.channelId)
      if (session) {
        log('[TTS] Found voice session, generating TTS...')
        const audioBuffer = await this.ttsService.textToSpeech(fullText)
        await this.voiceModule.playTTS(session.id, audioBuffer)
        log('[TTS] Successfully played in voice channel')
      }
    } catch (error) {
      log('[TTS] Failed:', error)
      // Don't fail whole interaction
    }
  }
}
```

---

## Audio Pipeline

```
Text Response (string)
  ↓
OpenAI TTS API (REST POST)
  ↓
Audio Buffer (Opus format)
  ↓
Buffer → Readable stream (Node.js)
  ↓
createAudioResource(stream, { inputType: StreamType.Opus })
  ↓
AudioPlayer.play(resource)
  ↓
VoiceConnection (Discord.js)
  ↓
Discord Voice Channel
  ↓
Users hear bot speaking
```

**Why Opus?**
- Discord's native format
- No transcoding needed
- Lower latency
- Better quality
- Smaller bandwidth

---

## Testing Checklist

### Basic Functionality
- [ ] Bot connects to voice channel via `/voice join`
- [ ] User @mentions bot in project text channel
- [ ] Bot responds with text in channel
- [ ] Bot speaks response in voice channel
- [ ] Multiple users can hear audio simultaneously
- [ ] Audio quality is clear and natural

### Edge Cases
- [ ] User not in voice channel → text only (no error)
- [ ] Bot not in voice channel → text only (graceful)
- [ ] OpenAI API key missing → text only (logged warning)
- [ ] OpenAI API fails → text only (logged error)
- [ ] Long response (>4096 chars) → chunked TTS
- [ ] Multiple sessions → audio plays in correct channel

### Integration
- [ ] Works with all project channels
- [ ] Works with auto-switching between projects
- [ ] Works with manual `/voice leave`
- [ ] Doesn't break existing text chat
- [ ] Voice status updates correctly

---

## Configuration Required

### Environment / Config
```bash
OPENAI_API_KEY=sk-...  # Required for TTS
```

Configured in `ConfigProvider`:
- `getOpenAIApiKey()` must return valid key
- Key validated on TTSService initialization

### OpenAI API
- Account with TTS API access
- Billing enabled (very affordable)
- API key with proper permissions

---

## Known Limitations

1. **Text-only for now**: No speech input (Phase 3)
2. **Single voice**: Uses nova voice by default (configurable)
3. **No voice cloning**: Standard OpenAI voices only
4. **4096 char limit**: Chunked automatically but may cause delays
5. **English-optimized**: Works with other languages but best in English

---

## Future Enhancements (Phase 3+)

### Phase 3: Speech-to-Text Input
- Realtime API for bidirectional audio
- Voice commands recognition
- Hands-free interaction

### Phase 4: Advanced Features
- Custom voice selection per user
- Voice activity detection
- Multi-speaker support
- Background noise filtering
- Emotion/tone modulation

### Phase 5: Intelligence
- Context-aware responses in voice
- Voice-based project switching
- Meeting summaries from voice
- Voice transcription to project notes

---

## Troubleshooting

### "TTS Failed" in logs
**Cause**: OpenAI API key missing/invalid
**Fix**: Set OPENAI_API_KEY in config

### No audio in voice channel
**Cause**: Bot not subscribed to player
**Check**: Logs should show "Created new audio player"
**Fix**: Ensure connection.subscribe(player) is called

### Audio cuts off early
**Cause**: Opus stream incomplete
**Check**: Buffer size in logs
**Fix**: Verify audioBuffer is complete before streaming

### Rate limiting
**Cause**: Too many TTS requests
**Fix**: Implement request throttling/caching

---

## Dependencies

### npm Packages
- `@discordjs/voice` - Voice channel management, AudioPlayer
- `discord.js` - Discord bot framework
- `node:stream` - Readable stream for audio

### APIs
- OpenAI TTS API - Text-to-speech generation
- Discord Voice Gateway - Audio transmission

### Internal Services
- `TTSService` - OpenAI integration
- `VoiceModule` - Discord voice management  
- `DiscordPlugin` - Message handling
- `ConfigProvider` - API key management

---

## Success Metrics

✅ **Implementation**: All code complete and committed
✅ **Type Safety**: TypeScript compilation passes
✅ **Architecture**: Clean separation of concerns
✅ **Error Handling**: Graceful degradation
✅ **Logging**: Comprehensive debug output
✅ **Documentation**: Complete implementation docs

**Next**: Test end-to-end in production Discord server

---

## Team Notes

**What Went Well**:
- Incremental commits allowed safe progress tracking
- TTS-first approach simpler than Realtime API
- Opus format avoided transcoding complexity
- Project-centric architecture made routing trivial
- Type safety caught errors early

**Lessons Learned**:
- ConfigProvider access pattern needs documentation
- Audio streaming requires proper stream types
- Error handling crucial for async audio operations
- Logging essential for debugging voice systems

**Recommended Next Steps**:
1. Test with real users in Discord
2. Monitor OpenAI API costs
3. Gather feedback on voice quality
4. Plan Phase 3 STT integration
5. Consider voice caching for common responses
