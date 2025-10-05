# Phase 2: TTS Implementation

## Goal
Implement Text-to-Speech output so the bot can speak AI responses in Discord voice channels.

## OpenAI TTS API (RECOMMENDED)

**Endpoint**: `POST https://api.openai.com/v1/audio/speech`

**Key Features**:
- Simple REST API
- High-quality voices: alloy, echo, fable, onyx, nova, shimmer
- Models: `tts-1` (fast) and `tts-1-hd` (quality)
- Formats: mp3, opus, aac, flac, wav, pcm
- 4096 character limit per request
- Cost: ~$15 per 1M characters

**Best Format for Discord**: `opus` (Discord native, no conversion needed)

## Architecture Flow

```
User message → Discord handler → Toji.chat() → AI response
    ↓
Active voice channel? → YES
    ↓
Text → OpenAI TTS → Opus audio → Discord voice playback + text channel
```

## Implementation

### Step 1: TTS Service (`src/main/services/tts-service.ts`)

```typescript
export interface TTSConfig {
  model: 'tts-1' | 'tts-1-hd'
  voice: 'alloy' | 'echo' | 'fable' | 'onyx' | 'nova' | 'shimmer'
  speed?: number
  responseFormat?: 'opus' | 'pcm'
}

export class TTSService {
  async textToSpeech(text: string, options: Partial<TTSConfig> = {}): Promise<Buffer> {
    const config = { model: 'tts-1', voice: 'nova', responseFormat: 'opus', ...options }
    
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
        response_format: config.responseFormat
      })
    })
    
    return Buffer.from(await response.arrayBuffer())
  }

  splitText(text: string, maxLength = 4000): string[] {
    // Split on sentences to stay under 4096 char API limit
  }
}
```

### Step 2: VoiceModule Integration (`src/plugins/discord/voice/VoiceModule.ts`)

```typescript
import { createAudioPlayer, createAudioResource, StreamType } from '@discordjs/voice'

class VoiceModule {
  private players: Map<string, AudioPlayer> = new Map()

  async playTTS(sessionId: string, audioBuffer: Buffer): Promise<void> {
    let player = this.players.get(sessionId)
    if (!player) {
      player = createAudioPlayer()
      this.players.set(sessionId, player)
      session.connection.subscribe(player)
    }

    const resource = createAudioResource(Readable.from(audioBuffer), {
      inputType: StreamType.Opus
    })
    
    player.play(resource)
  }

  getUserSessionByChannel(textChannelId: string): VoiceSession | undefined {
    return Array.from(this.sessions.values())
      .find(s => s.projectChannelId === textChannelId)
  }
}
```

### Step 3: Discord Message Handler (`src/plugins/discord/DiscordPlugin.ts`)

```typescript
async handleMentionMessage(message: Message): Promise<void> {
  const response = await this.projectManager.chat(userMessage)
  const voiceSession = this.voiceModule?.getUserSessionByChannel(message.channel.id)

  if (voiceSession) {
    try {
      const audioBuffer = await this.ttsService.textToSpeech(response, {
        voice: 'nova',
        responseFormat: 'opus'
      })
      await this.voiceModule.playTTS(voiceSession.id, audioBuffer)
      await sendResponse(message.channel, response, {
        footer: '🎙️ Audio played in voice channel'
      })
    } catch (error) {
      await sendResponse(message.channel, response) // Fallback
    }
  } else {
    await sendResponse(message.channel, response)
  }
}
```

## Audio Pipeline

**Discord.js Stream Types**: `Opus` (native), `Raw` (PCM), `OggOpus`, `WebmOpus`

**Recommended**: Use `opus` format from OpenAI → `StreamType.Opus` in Discord (no conversion)

## Configuration (`opencode.json`)

```json
{
  "discord": {
    "voice": {
      "tts": {
        "enabled": true,
        "model": "tts-1",
        "voice": "nova",
        "format": "opus"
      }
    }
  },
  "openai": { "apiKey": "${OPENAI_API_KEY}" }
}
```

## Testing

**Basic Tests**:
- Bot in voice via `/voice join` → @Toji message → audio plays
- No voice session → text-only response
- Long response (>4096 chars) → chunked playback

**Advanced**:
- Different voices, speed parameters
- Error handling (API failures, timeouts)
- Concurrent sessions

## Implementation Checklist

**Core**:
- [ ] Create `TTSService` class with `textToSpeech()` method
- [ ] Add `playTTS()` to VoiceModule with AudioPlayer per session
- [ ] Integrate with Discord message handler
- [ ] Add voice session detection via `getUserSessionByChannel()`
- [ ] Test end-to-end: text → TTS → voice playback

**Polish**:
- [ ] Text chunking for >4096 char responses
- [ ] Queue for multiple TTS requests
- [ ] Error handling and text fallback
- [ ] Voice customization per user/project

## Success Criteria

- Latency: <2s from message → audio start
- Clear, natural speech quality
- >95% success rate with text fallback
- Opus playback without glitches

## Cost Estimate

~$0.225/hour (30 exchanges × 500 chars avg)
~$112.50/month (100 users × 5 hours)

## Risk Mitigation

- **API Costs**: Usage tracking, rate limits
- **Latency**: Use `tts-1` (fast model)
- **Quality Issues**: Test voices, retry logic, text fallback

---

**Estimated Effort**: 2-3 days  
**Dependencies**: OpenAI API key, Phase 1 voice channels  
**Next Phase**: STT Input (Phase 3)
