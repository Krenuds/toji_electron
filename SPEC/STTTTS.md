# Speech-to-Text & Text-to-Speech Specification

## Overview

Implementation of bidirectional voice communication for Discord bot using Docker-based Whisper (STT) and Piper (TTS) services.

**Key Feature**: Wake word system - Bot only processes voice input after hearing the trigger word "listen" to avoid responding to every conversation in the channel.

## Architecture Decision

**Selected: Docker Services (Whisper + Piper)**
Alternative considered: OpenAI Realtime API ($0.30/min) - rejected due to cost

### Why Docker Services

- **Cost**: Free after initial setup vs $0.30/min for OpenAI
- **Privacy**: Audio never leaves local infrastructure
- **Control**: No rate limits, customizable models
- **Latency**: ~2-3s transcription + ~500ms TTS (acceptable for async conversations)

## Technology Stack

### Speech-to-Text: Whisper

- **Service**: `whisper-service` (Docker container)
- **Port**: `9000`
- **Model**: `base.en` (fast, accurate for English)
- **API**: `POST /transcribe` with WAV audio
- **Response**: `{"text": "transcribed text"}`

### Text-to-Speech: Piper

- **Service**: `piper-service` (Docker container)
- **Port**: `9001`
- **Model**: `en_US-lessac-medium` (high quality, natural voice)
- **API**: `POST /tts` with JSON `{text: "...", voice?: "...", speed?: 1.0}`
- **Response**: WAV audio buffer (48kHz stereo)

## Audio Flow Architecture

```text
┌─────────────────────────────────────────────────────────────────┐
│                        Discord Voice Channel                     │
└──────────────┬────────────────────────────────────┬──────────────┘
               │ User Speech (Opus)                 │ Bot Speech (Opus)
               ↓                                    ↑
    ┌──────────────────────┐          ┌──────────────────────┐
    │   AudioReceiver      │          │     TTSPlayer        │
    │  - Opus decoder      │          │  - FFmpeg transcode  │
    │  - PCM conversion    │          │  - Audio queue       │
    │  - VAD (timers)      │          │  - Opus encoder      │
    └──────────┬───────────┘          └───────┬──────────────┘
               │ WAV Buffer                    │ WAV Buffer
               ↓                               ↑
    ┌──────────────────────┐          ┌──────────────────────┐
    │  Whisper Service     │          │   Piper Service      │
    │  localhost:9000      │          │  localhost:9001      │
    └──────────┬───────────┘          └───────┬──────────────┘
               │ Text                          │ Text
               ↓                               ↑
    ┌─────────────────────────────────────────────────────────┐
    │            Discord Channel (Text Messages)               │
    │  - Transcription embed (user avatar, quoted text)       │
    │  - Bot text response (normal message)                   │
    └─────────────────────────────────────────────────────────┘
               │                               ↑
               └───────► OpenCode AI ──────────┘
```

## Critical Components

### 1. AudioReceiver (STT Pipeline)

**Location**: `src/plugins/discord/voice/AudioReceiver.ts`

**Key Features**:

- Opus decoding via `@discordjs/opus`
- Timer-based Voice Activity Detection (VAD)
  - Speech end: 1.5s silence
  - Force process: 6s max buffer
  - Min duration: 1s
- PCM to WAV conversion (16kHz mono, 16-bit)
- Per-user audio buffering
- Continuous transcription (wake word filtering happens downstream)

**Critical Bug Fixed**: Opus decoder pipeline

```typescript
// CORRECT: Add opus decoder to receive stream
const opusDecoder = new opus.Decoder({ rate: 48000, channels: 2, frameSize: 960 })
stream.pipe(opusDecoder).on('data', (pcmData: Buffer) => {
  // Process PCM data
})
```

### 2. Whisper Integration

**Location**: `src/main/services/voice-service-manager.ts`

**API Call**:

```typescript
const formData = new FormData()
formData.append('audio', audioBlob, { filename: 'audio.wav', contentType: 'audio/wav' })
const response = await fetch('http://localhost:9000/transcribe', {
  method: 'POST',
  body: formData
})
const result = await response.json() // {text: "..."}
```

**Critical**: WAV format must be 16kHz mono for Whisper

### 3. Wake Word Detection

**Location**: `src/plugins/discord/voice/VoiceModule.ts`

**Purpose**: Prevent bot from responding to every conversation in voice channel

**Logic**:

```typescript
// Session tracks listening state
session.isListening = false // Default: not listening
session.wakeWord = 'listen' // Configurable wake word

// In transcription handler:
if (!session.isListening) {
  // Check for wake word
  if (transcriptionLower.includes(wakeWord)) {
    session.isListening = true
    // Process text after wake word if present
    const textAfterWakeWord = extractAfterWakeWord(result.text, wakeWord)
    if (textAfterWakeWord) {
      emit('transcription', textAfterWakeWord)
    }
  } else {
    // Ignore - no wake word
  }
} else {
  // Already listening - process transcription
  emit('transcription', result.text)
  session.isListening = false // Reset for next interaction
}
```

**Behavior**:

- **First utterance**: Bot ignores unless it contains "listen"
- **Wake word detected**: Bot enters listening mode
- **Text after wake word**: Immediately processed (e.g., "listen what is the weather")
- **Next utterance**: Processed (listening mode active)
- **After processing**: Listening mode resets, wake word required again

**Why This Pattern**:

- Prevents responding to ambient conversation
- Natural flow: "listen" → immediate command, or "listen" → pause → command
- Resets after each response to avoid continuous monitoring

### 4. Transcription Display

**Location**: `src/plugins/discord/voice/VoiceModule.ts`

**Format**: Discord embed + text content

```typescript
const embed = new EmbedBuilder()
  .setColor(DISCORD_COLORS.INFO) // 0x3b82f6
  .setAuthor({ name: user.displayName, iconURL: user.displayAvatarURL() })
  .setDescription(`🎤 *"${text}"*`)
  .setFooter({ text: `🕒 ${duration.toFixed(1)}s` })
  .setTimestamp()

await channel.send({ content: text, embeds: [embed] })
```

**Why text + embed?**: Bot needs text content to process, embed for visual display

**Note**: Only transcriptions that pass wake word detection are sent to Discord

### 5. Bot Message Processing

**Location**: `src/plugins/discord/DiscordPlugin.ts`

**Transcription Detection**:

```typescript
// Ignore bot's own messages EXCEPT transcription embeds
if (message.author.bot) {
  const isTranscription =
    message.embeds.length > 0 &&
    message.embeds[0].color === DISCORD_COLORS.INFO &&
    message.content.length > 0
  if (!isTranscription) return
}
```

**Critical Bug Fixed**: Double responses from manual `handleMessage()` call + Discord event

### 6. TTSPlayer (TTS Pipeline)

**Location**: `src/plugins/discord/voice/TTSPlayer.ts`

**Core Problem**: Discord requires PCM/Opus, Piper returns WAV

**Solution**: FFmpeg transcoding pipeline

```typescript
const ffmpeg = spawn(ffmpegPath.path, [
  '-analyzeduration', '0',
  '-loglevel', 'error',
  '-f', 'wav',           // Input: WAV from Piper
  '-i', 'pipe:0',        // Read from stdin
  '-f', 's16le',         // Output: PCM signed 16-bit little-endian
  '-ar', '48000',        // Sample rate: 48kHz
  '-ac', '2',            // Channels: stereo
  'pipe:1'               // Write to stdout
])

stream.pipe(ffmpeg.stdin)

const resource = createAudioResource(ffmpeg.stdout, {
  inputType: StreamType.Raw  // PCM format
})
player.play(resource)
```

**Dependencies**: `@ffmpeg-installer/ffmpeg` (cross-platform FFmpeg binary)

### 7. Piper Integration

**Location**: `src/main/services/voice-service-manager.ts`

**API Call**:

```typescript
const response = await fetch('http://localhost:9001/tts', {
  method: 'POST',
  headers: { 'Content-Type': 'application/json' },
  body: JSON.stringify({ text, voice: 'en_US-lessac-medium', speed: 1.0 })
})
const audioBuffer = await response.arrayBuffer()
```

### 8. TTS Trigger

**Location**: `src/plugins/discord/DiscordPlugin.ts`

**When**: Bot completes text response in `onComplete` callback

```typescript
onComplete: async (fullText) => {
  await sendDiscordResponse(message, fullText)

  // Speak in voice if bot is connected
  if (this.voiceModule && message.guildId) {
    const sessions = this.voiceModule.getAllSessions()
    const guildSession = sessions.find(s => s.config.guildId === message.guildId)
    if (guildSession) {
      await this.voiceModule.speak(guildSession.id, fullText)
    }
  }
}
```

## Session Management

**Voice Session Lifecycle**:

1. User: `/voice join <project>` → Bot joins voice channel
2. Bot: Auto-starts AudioReceiver (STT) + TTSPlayer (TTS)
3. Users talk (ignored until wake word)
4. User: Says "listen" → Bot enters listening mode
5. User: Speaks command → Transcription embed → Bot text response → Bot speaks
6. Bot: Resets to non-listening mode (wake word required for next interaction)
7. Loop: Repeat from step 3
8. User: `/voice leave` → Bot disconnects

**Key Insights**:

- Single voice session per guild, any user in channel can speak
- Wake word "listen" gates all voice input processing
- Listening state resets after each bot response

## Known Issues & Solutions

### Issue 1: Opus Decoding

**Problem**: Raw audio stream missing Opus decoder
**Solution**: Pipe through `opus.Decoder` before processing
**Commit**: `76a696c`

### Issue 2: Double Bot Responses

**Problem**: Manual `handleMessage()` + Discord MessageCreate event
**Solution**: Remove manual call, let Discord event handle it
**Commit**: `950ccfd`

### Issue 3: Bot Ignoring Transcriptions

**Problem**: Bot filtered out its own messages including transcriptions
**Solution**: Exception for INFO color embeds with content
**Commit**: `f2a3869`

### Issue 4: WAV Playback Failure

**Problem**: Discord.js doesn't support WAV directly (needs PCM/Opus)
**Solution**: FFmpeg transcoding WAV → PCM
**Commit**: `e2dd0d3`

## Performance Characteristics

- **STT Latency**: 2-3 seconds (acceptable for async conversation)
- **TTS Latency**: ~500ms generation + instant playback
- **Total Response Time**: 3-5 seconds (user speech → bot speech)
- **Audio Quality**: High (48kHz stereo output, Piper's natural voice)

## Docker Services

**Location**: `resources/docker-services/`

**Startup**: `docker-compose up -d` in `docker-services/`

**Services**:

- `whisper-service`: Port 9000, `base.en` model
- `piper-service`: Port 9001, `en_US-lessac-medium` voice

**Health Checks**: Services auto-verified on first voice session

## Future Improvements

- Voice selection (Piper supports 10+ voices)
- Language detection (Whisper supports 99 languages)
- Speech rate control
- Audio caching for repeated phrases
- Streaming TTS (sentence-by-sentence)
- VAD improvement (use Silero VAD instead of timers)

## Testing Checklist

✅ User speaks without wake word → Ignored (no transcription)
✅ User says "listen" → Bot enters listening mode
✅ User speaks after wake word → Transcription embed appears
✅ Bot processes transcription → Text response
✅ Bot speaks response in voice channel
✅ Bot resets listening state → Requires wake word again
✅ User says "listen [command]" → Processes command immediately
✅ Multiple users can speak (no conflicts)
✅ Queue handles rapid-fire messages
✅ Bot ignores own non-transcription messages
✅ FFmpeg transcoding works on Windows/Mac/Linux

## Dependencies Added

```json
{
  "@discordjs/opus": "^0.10.0",
  "@discordjs/voice": "^0.19.0",
  "@ffmpeg-installer/ffmpeg": "^1.1.0"
}
```

## Key Files

- `src/plugins/discord/voice/AudioReceiver.ts` - STT audio capture
- `src/plugins/discord/voice/TTSPlayer.ts` - TTS audio playback
- `src/plugins/discord/voice/VoiceModule.ts` - Session orchestration
- `src/plugins/discord/DiscordPlugin.ts` - Message processing
- `src/main/services/voice-service-manager.ts` - Docker service client
- `resources/docker-services/` - Whisper + Piper containers
