# Phase 2 Implementation Plan: TTS-First Approach

## Executive Summary

**Goal**: Implement Text-to-Speech output so the bot can speak AI responses in Discord voice channels.

**Approach**: Start with TTS (output) before STT (input) because:
1. Simpler to implement - one-way communication
2. Easier to test - type in text channel, hear response
3. Validates audio pipeline - ensures Discord playback works
4. Provides immediate value - bot can respond verbally to text

## TTS Options Analysis

### Option A: OpenAI TTS API (RECOMMENDED for Phase 2)

**Endpoint**: `POST https://api.openai.com/v1/audio/speech`

**Pros**:
- ✅ Simple REST API (no WebSocket complexity)
- ✅ High-quality voices (alloy, echo, fable, onyx, nova, shimmer)
- ✅ Two models: `tts-1` (fast) and `tts-1-hd` (quality)
- ✅ Multiple audio formats (mp3, opus, aac, flac, wav, pcm)
- ✅ Reasonable latency (~500ms-1s)
- ✅ No streaming needed for short responses
- ✅ Well-documented and stable

**Cons**:
- ❌ Not real-time streaming (must wait for full response)
- ❌ Cost: ~$15 per 1M characters
- ❌ 4096 character limit per request

**Pricing**:
```
$15.00 per 1 million characters
~$0.015 per 1000 characters
~50 words = 250 characters = $0.00375 per response
```

**Example Request**:
```bash
curl https://api.openai.com/v1/audio/speech \
  -H "Authorization: Bearer $OPENAI_API_KEY" \
  -H "Content-Type: application/json" \
  -d '{
    "model": "tts-1",
    "input": "Hello! I am your AI assistant.",
    "voice": "nova",
    "response_format": "pcm"
  }' \
  --output speech.pcm
```

**Supported Formats**:
- `mp3` (default) - Compressed, good for storage
- `opus` - Compressed, optimized for internet streaming
- `aac` - Compressed, digital audio compression
- `flac` - Lossless compression
- `wav` - Uncompressed, larger files
- `pcm` - Raw PCM audio (16-bit, 24kHz, little-endian)

**Best Format for Discord**: `opus` or `pcm`
- Opus: Discord native, no conversion needed
- PCM: Raw audio, easy to manipulate, needs encoding to Opus

### Option B: OpenAI Realtime API (Future Phase 3)

**Endpoint**: `wss://api.openai.com/v1/realtime`

**Pros**:
- ✅ Bi-directional streaming (full duplex)
- ✅ Built-in VAD and turn-taking
- ✅ True real-time (~320ms latency)
- ✅ Function calling support
- ✅ Best for conversational AI

**Cons**:
- ❌ WebSocket complexity
- ❌ Requires STT input to be useful
- ❌ Higher cost: $0.06/min input + $0.24/min output
- ❌ Beta/preview stage

**Recommendation**: Save for Phase 3 when implementing full voice conversations.

### Option C: Local TTS (Not Recommended)

**Options**: piper-tts, coqui-tts, Mozilla TTS

**Pros**:
- ✅ No API costs
- ✅ Privacy (local processing)

**Cons**:
- ❌ Lower quality than OpenAI
- ❌ CPU/GPU intensive
- ❌ Complex setup
- ❌ Limited voice options
- ❌ Maintenance burden

## Phase 2 Architecture: TTS-First

### High-Level Flow

```
User types @Toji "What's in my config?"
    ↓
Discord message handler
    ↓
Toji.chat() → AI response (text)
    ↓
Session has active voice channel?
    ↓ YES
Convert text → TTS audio (OpenAI)
    ↓
Play audio in voice channel
    ↓
Also send text to Discord text channel
```

### Implementation Strategy

#### Step 1: Add TTS Service (Main Process)

**File**: `src/main/services/tts-service.ts`

```typescript
import { createFileDebugLogger } from '../utils/logger'
import type { ConfigProvider } from '../config/ConfigProvider'

const log = createFileDebugLogger('tts-service')

export interface TTSConfig {
  model: 'tts-1' | 'tts-1-hd'
  voice: 'alloy' | 'echo' | 'fable' | 'onyx' | 'nova' | 'shimmer'
  speed?: number // 0.25 to 4.0
  responseFormat?: 'mp3' | 'opus' | 'aac' | 'flac' | 'wav' | 'pcm'
}

export class TTSService {
  private apiKey?: string

  constructor(private config: ConfigProvider) {
    this.apiKey = config.getOpencodeApiKey('openai')
  }

  /**
   * Convert text to speech using OpenAI TTS API
   */
  async textToSpeech(
    text: string,
    options: Partial<TTSConfig> = {}
  ): Promise<Buffer> {
    if (!this.apiKey) {
      throw new Error('OpenAI API key not configured')
    }

    const config: TTSConfig = {
      model: options.model || 'tts-1',
      voice: options.voice || 'nova',
      speed: options.speed || 1.0,
      responseFormat: options.responseFormat || 'opus'
    }

    log(`Generating TTS: ${text.substring(0, 50)}... (${text.length} chars)`)
    log(`Config: ${config.model}, ${config.voice}, ${config.responseFormat}`)

    try {
      const response = await fetch('https://api.openai.com/v1/audio/speech', {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${this.apiKey}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          model: config.model,
          input: text,
          voice: config.voice,
          speed: config.speed,
          response_format: config.responseFormat
        })
      })

      if (!response.ok) {
        const error = await response.text()
        throw new Error(`TTS API error: ${response.status} - ${error}`)
      }

      const audioBuffer = Buffer.from(await response.arrayBuffer())
      log(`✅ TTS generated: ${audioBuffer.length} bytes`)
      return audioBuffer
    } catch (error) {
      log('❌ TTS generation failed:', error)
      throw error
    }
  }

  /**
   * Split long text into chunks (4096 char limit)
   */
  splitText(text: string, maxLength: number = 4000): string[] {
    if (text.length <= maxLength) return [text]

    const chunks: string[] = []
    const sentences = text.split(/[.!?]+/)
    let currentChunk = ''

    for (const sentence of sentences) {
      if (currentChunk.length + sentence.length > maxLength) {
        if (currentChunk) chunks.push(currentChunk.trim())
        currentChunk = sentence
      } else {
        currentChunk += sentence + '. '
      }
    }

    if (currentChunk) chunks.push(currentChunk.trim())
    return chunks
  }
}
```

#### Step 2: Integrate TTS with VoiceModule

**File**: `src/plugins/discord/voice/VoiceModule.ts`

Add method to play TTS audio:

```typescript
import { createAudioPlayer, createAudioResource, StreamType } from '@discordjs/voice'
import { Readable } from 'stream'

class VoiceModule {
  private players: Map<string, AudioPlayer> = new Map()

  /**
   * Play TTS audio in a voice channel
   */
  async playTTS(sessionId: string, audioBuffer: Buffer): Promise<void> {
    const session = this.sessions.get(sessionId)
    if (!session) {
      throw new Error(`Session ${sessionId} not found`)
    }

    log(`Playing TTS in session ${sessionId} (${audioBuffer.length} bytes)`)

    // Get or create audio player
    let player = this.players.get(sessionId)
    if (!player) {
      player = createAudioPlayer()
      this.players.set(sessionId, player)
      session.connection.subscribe(player)

      // Handle player events
      player.on('stateChange', (oldState, newState) => {
        log(`Player state: ${oldState.status} → ${newState.status}`)
      })

      player.on('error', (error) => {
        log('Player error:', error)
      })
    }

    // Convert buffer to stream
    const stream = Readable.from(audioBuffer)

    // Create audio resource
    // Assuming audioBuffer is Opus format from OpenAI
    const resource = createAudioResource(stream, {
      inputType: StreamType.Opus,
      inlineVolume: true
    })

    // Play the audio
    player.play(resource)

    log('✅ TTS playback started')
  }

  /**
   * Stop TTS playback
   */
  stopTTS(sessionId: string): void {
    const player = this.players.get(sessionId)
    if (player) {
      player.stop()
      log(`Stopped TTS for session ${sessionId}`)
    }
  }
}
```

#### Step 3: Hook TTS into Discord Message Handler

**File**: `src/plugins/discord/DiscordPlugin.ts`

Modify message handler to check for active voice session:

```typescript
async handleMentionMessage(message: Message): Promise<void> {
  // ... existing message handling ...

  // Get AI response
  const response = await this.projectManager.chat(userMessage)

  // Check if user has active voice session
  const voiceSession = this.voiceModule?.getUserSessionByChannel(message.channel.id)

  if (voiceSession) {
    log('User has active voice session, generating TTS...')

    try {
      // Generate TTS
      const audioBuffer = await this.ttsService.textToSpeech(response, {
        voice: 'nova',
        responseFormat: 'opus'
      })

      // Play in voice channel
      await this.voiceModule.playTTS(voiceSession.id, audioBuffer)

      // Still send text response to channel
      await sendResponse(message.channel, response, {
        footer: '🎙️ Audio response played in voice channel'
      })
    } catch (error) {
      log('TTS playback failed:', error)
      // Fallback to text-only
      await sendResponse(message.channel, response)
    }
  } else {
    // No voice session, text-only response
    await sendResponse(message.channel, response)
  }
}
```

#### Step 4: Add VoiceModule Helper Method

**File**: `src/plugins/discord/voice/VoiceModule.ts`

```typescript
/**
 * Get user's voice session by their project text channel
 */
getUserSessionByChannel(textChannelId: string): VoiceSession | undefined {
  for (const session of this.sessions.values()) {
    if (session.projectChannelId === textChannelId) {
      return session
    }
  }
  return undefined
}
```

## Audio Format Deep Dive

### Discord.js Audio Requirements

**Input Formats Supported**:
- Opus (best - native)
- PCM (requires conversion)
- OGG/Opus
- WebM/Opus

**Stream Types**:
```typescript
enum StreamType {
  Arbitrary = 'arbitrary',  // Discord.js will probe format
  Raw = 'raw',              // Raw PCM
  OggOpus = 'ogg/opus',     // Ogg container with Opus
  WebmOpus = 'webm/opus',   // WebM container with Opus
  Opus = 'opus'             // Raw Opus packets
}
```

### OpenAI TTS → Discord Pipeline

#### Option A: Use Opus Format (RECOMMENDED)

```typescript
// Request Opus from OpenAI
const audioBuffer = await ttsService.textToSpeech(text, {
  responseFormat: 'opus'
})

// Play directly in Discord (no conversion needed)
const resource = createAudioResource(Readable.from(audioBuffer), {
  inputType: StreamType.Opus
})
```

**Benefits**:
- ✅ No format conversion
- ✅ Smaller file sizes
- ✅ Optimized for streaming
- ✅ Native Discord format

#### Option B: Use PCM Format (Fallback)

```typescript
// Request PCM from OpenAI
const audioBuffer = await ttsService.textToSpeech(text, {
  responseFormat: 'pcm'
})

// Discord.js will convert PCM → Opus
const resource = createAudioResource(Readable.from(audioBuffer), {
  inputType: StreamType.Raw
})
```

**Considerations**:
- Larger files (uncompressed)
- Requires conversion by Discord.js
- More CPU usage

## Configuration

Add to `opencode.json`:

```json
{
  "discord": {
    "voice": {
      "enabled": true,
      "tts": {
        "enabled": true,
        "model": "tts-1",
        "voice": "nova",
        "speed": 1.0,
        "format": "opus",
        "autoPlay": true
      }
    }
  },
  "openai": {
    "apiKey": "${OPENAI_API_KEY}"
  }
}
```

## Testing Strategy

### Phase 2A: Basic TTS Playback

1. **Setup**:
   - Bot in voice channel via `/voice join`
   - User in same voice channel

2. **Test Cases**:
   ```
   Test 1: Short Response
   User: @Toji "Hello"
   Expected: Bot says "Hello!" in voice

   Test 2: Long Response
   User: @Toji "Explain async/await"
   Expected: Bot speaks full explanation

   Test 3: No Voice Session
   User: @Toji "Hello" (not in voice)
   Expected: Text-only response

   Test 4: Code Response
   User: @Toji "Show me a function"
   Expected: Bot says "I'll send that to the channel" + text embed with code
   ```

### Phase 2B: Advanced Features

1. **Chunked Playback**: Test responses >4096 chars
2. **Voice Selection**: Test different OpenAI voices
3. **Speed Control**: Test speed parameter (0.5x - 2x)
4. **Error Handling**: Test API failures, timeouts
5. **Concurrent Sessions**: Multiple projects with voice

## Implementation Checklist

### Core TTS (Phase 2A)

- [ ] Create `TTSService` class
- [ ] Add OpenAI API key configuration
- [ ] Implement `textToSpeech()` method
- [ ] Test TTS API calls (save to file first)
- [ ] Add `playTTS()` method to VoiceModule
- [ ] Create AudioPlayer per session
- [ ] Test audio playback in Discord
- [ ] Integrate with message handler
- [ ] Add voice session detection
- [ ] Test end-to-end: text → TTS → voice playback

### Polish (Phase 2B)

- [ ] Add text chunking for long responses
- [ ] Implement queue for multiple TTS requests
- [ ] Add playback state indicators
- [ ] Handle interruptions (new message while speaking)
- [ ] Add voice customization per user/project
- [ ] Implement pause/resume/stop commands
- [ ] Add TTS latency monitoring
- [ ] Error handling and fallbacks

### Documentation

- [ ] Update DISCORD_VOICE_SYSTEM.md with TTS implementation
- [ ] Create TTS_IMPLEMENTATION.md guide
- [ ] Update help command with TTS info
- [ ] Add usage examples

## Success Metrics

### Technical Metrics

- **Latency**: <2s from message → audio start
- **Quality**: Clear, natural speech
- **Reliability**: >95% success rate
- **Format**: Opus playback works without glitches

### User Metrics

- **Adoption**: 50% of voice users try TTS
- **Satisfaction**: Positive feedback on voice quality
- **Usage**: Average 10+ TTS responses per session

## Cost Estimation

### Example Usage

**Scenario**: 1 hour voice session, 30 exchanges

- Average response: 100 words = 500 characters
- 30 responses × 500 chars = 15,000 characters
- Cost: 15,000 × $0.000015 = **$0.225 per hour**

**Monthly Cost** (100 active users, 5 hours/month each):
- 100 users × 5 hours × $0.225 = **$112.50/month**

**Reasonable** for MVP phase.

## Risk Mitigation

### Risk 1: API Costs

**Mitigation**:
- Implement usage tracking
- Add cost alerts
- Set per-user rate limits
- Cache common responses

### Risk 2: Latency

**Mitigation**:
- Use `tts-1` (fast model)
- Optimize network path
- Implement streaming for long responses
- Pre-generate common phrases

### Risk 3: Audio Quality Issues

**Mitigation**:
- Test all voice options
- Monitor playback errors
- Implement retry logic
- Provide text fallback always

## Next Steps After Phase 2

Once TTS is working:

**Phase 3**: Add STT (Speech-to-Text)
- Capture user audio from Discord
- Use OpenAI Whisper API
- Full voice conversations

**Phase 4**: Switch to Realtime API
- Bi-directional streaming
- Lower latency
- Better turn-taking

---

**Document Status**: Implementation Plan
**Phase**: 2 - TTS Output
**Estimated Effort**: 2-3 days
**Dependencies**: OpenAI API key, Phase 1 voice channels
**Next Phase**: STT Input (Phase 3)
