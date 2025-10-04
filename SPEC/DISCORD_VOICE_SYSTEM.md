# Discord Voice System Specification

## Overview

This specification outlines the implementation of real-time voice chat capabilities for the Toji Discord bot, enabling users to have spoken conversations with AI agents about their projects using voice channels.

## Executive Summary

The Discord Voice System adds conversational AI capabilities through Discord voice channels, allowing users to:

- Join a voice channel and invoke the bot with a slash command
- Select a specific project context for the conversation
- Speak naturally and receive spoken responses in real-time
- Have the conversation transcribed and logged in the project channel

## Architecture Philosophy

Following Toji's core principles:

- **Main process owns all logic**: Voice processing, STT/TTS orchestration lives in main process
- **Plugin as thin interface**: Discord voice module is a presentation layer
- **Type safety across boundaries**: Full TypeScript typing for all voice-related IPC
- **Session-based context**: Voice conversations are OpenCode sessions with audio I/O

## Technology Stack

### Core Dependencies

#### Discord Voice (`@discordjs/voice`)

- **Purpose**: Handle Discord voice channel connections and audio streaming
- **Key Features**:
  - Join/leave voice channels
  - Receive audio streams from users (VoiceReceiver)
  - Send audio streams to channel (AudioPlayer)
  - Opus audio codec support
  - UDP voice connection management

#### OpenAI APIs

Two approaches evaluated:

##### Option A: Realtime API (RECOMMENDED)

- **Endpoint**: WebSocket connection to `wss://api.openai.com/v1/realtime`
- **Model**: `gpt-4o-realtime-preview`
- **Features**:
  - Native bi-directional audio streaming
  - Built-in VAD (Voice Activity Detection)
  - Automatic turn-taking
  - Function calling support
  - Session-based context management
  - ~320ms latency (excellent for conversation)
- **Audio Format**:
  - Input: 24kHz PCM16 mono
  - Output: 24kHz PCM16 mono
- **Pricing**: $0.06/min input + $0.24/min output

##### Option B: Whisper + TTS (FALLBACK)

- **Whisper API**: `POST /v1/audio/transcriptions`
  - Local model options: `whisper-1` via faster-whisper, whisper.cpp
  - API latency: ~2-3 seconds per utterance
- **TTS API**: `POST /v1/audio/speech`
  - Voices: alloy, echo, fable, onyx, nova, shimmer
  - Models: tts-1 (fast), tts-1-hd (quality)
  - Latency: ~500ms-1s for short responses
- **Chat Completion**: Standard OpenCode SDK integration
- **Total Latency**: 3-5 seconds (noticeable delay)

**Decision**: Start with **Realtime API (Option A)** for superior UX, fall back to Option B if budget constraints emerge.

### Audio Processing Pipeline

```text
Discord User Speech
    ↓
Opus Decoder (discord.js)
    ↓
PCM Audio Buffer
    ↓
Format Conversion (if needed)
    ↓
OpenAI Realtime API (WebSocket)
    ↓
[VAD Detection → Transcription → AI Processing → TTS Generation]
    ↓
PCM Audio Response
    ↓
Opus Encoder
    ↓
Discord AudioPlayer
    ↓
Voice Channel Output
```

## Implementation Design

### Module Structure

```text
src/plugins/discord/
├── voice/
│   ├── VoiceSessionManager.ts       # Manages active voice sessions
│   ├── OpenAIRealtimeClient.ts      # WebSocket client for Realtime API
│   ├── AudioProcessor.ts             # Audio format conversion utilities
│   ├── VoiceConnection.ts            # Discord voice connection wrapper
│   └── types.ts                      # Voice-specific TypeScript types
├── commands/
│   └── voice.ts                      # /voice slash command
└── modules/
    └── VoiceModule.ts                # Voice plugin module

src/main/services/
└── voice-service.ts                  # Main process voice orchestration
```

### Core Components

#### 1. VoiceSessionManager

**Responsibility**: Coordinate voice sessions between Discord and OpenAI

```typescript
interface VoiceSession {
  id: string
  userId: string
  guildId: string
  channelId: string // Voice channel ID
  projectChannelId: string // Text channel for project context
  projectPath: string
  connection: VoiceConnection
  realtimeClient: OpenAIRealtimeClient
  startTime: Date
  status: 'connecting' | 'active' | 'paused' | 'ending'
}

class VoiceSessionManager {
  async createSession(
    userId: string,
    voiceChannelId: string,
    projectPath: string
  ): Promise<VoiceSession>

  async endSession(sessionId: string): Promise<void>

  getActiveSession(userId: string): VoiceSession | undefined

  async pauseSession(sessionId: string): Promise<void>

  async resumeSession(sessionId: string): Promise<void>
}
```

**Key Features**:

- One voice session per user (exclusive)
- Automatic cleanup on disconnect
- Graceful handling of network interruptions
- Session state persistence across reconnects

#### 2. OpenAIRealtimeClient

**Responsibility**: Manage WebSocket connection to OpenAI Realtime API

```typescript
interface RealtimeConfig {
  apiKey: string
  model: 'gpt-4o-realtime-preview'
  voice: 'alloy' | 'echo' | 'fable' | 'onyx' | 'nova' | 'shimmer'
  temperature?: number
  instructions?: string // System prompt with project context
  tools?: RealtimeTool[] // Function calling for project operations
}

class OpenAIRealtimeClient extends EventEmitter {
  async connect(config: RealtimeConfig): Promise<void>

  async sendAudio(audioBuffer: Int16Array): Promise<void>

  async disconnect(): Promise<void>

  on(event: 'audio', listener: (audio: Int16Array) => void): this
  on(event: 'transcript', listener: (text: string, type: 'user' | 'assistant') => void): this
  on(event: 'function_call', listener: (name: string, args: unknown) => void): this
  on(event: 'error', listener: (error: Error) => void): this
}
```

**Events**:

- `audio`: Raw PCM audio from AI (24kHz, 16-bit, mono)
- `transcript`: Text transcriptions (for logging)
- `function_call`: AI requesting tool usage
- `error`: Connection or API errors

**WebSocket Message Types** (from OpenAI):

```typescript
// Server → Client
type ServerEvent =
  | { type: 'session.created'; session: SessionInfo }
  | { type: 'conversation.item.created'; item: ConversationItem }
  | { type: 'response.audio.delta'; delta: string } // base64 PCM
  | { type: 'response.audio.done' }
  | { type: 'response.audio_transcript.delta'; delta: string }
  | {
      type: 'response.function_call_arguments.done'
      call_id: string
      name: string
      arguments: string
    }
  | { type: 'error'; error: ErrorDetails }

// Client → Server
type ClientEvent =
  | { type: 'session.update'; session: Partial<SessionConfig> }
  | { type: 'input_audio_buffer.append'; audio: string } // base64 PCM
  | { type: 'input_audio_buffer.commit' }
  | { type: 'response.create'; response: ResponseConfig }
  | { type: 'conversation.item.create'; item: ConversationItem }
```

#### 3. VoiceConnection (Discord)

**Responsibility**: Handle Discord voice channel connection and audio streaming

```typescript
class VoiceConnection extends EventEmitter {
  constructor(
    private voiceChannel: VoiceChannel,
    private connection: DiscordVoiceConnection
  )

  async startListening(userId: string): Promise<void>

  async playAudio(audioStream: Readable): Promise<void>

  async disconnect(): Promise<void>

  on(event: 'audio', listener: (audio: Buffer, userId: string) => void): this
  on(event: 'speaking', listener: (userId: string, speaking: boolean) => void): this
  on(event: 'disconnected', listener: () => void): this
}
```

**Audio Handling**:

```typescript
// Receive audio from user
connection.receiver.subscribe(userId, {
  end: {
    behavior: EndBehaviorType.AfterSilence,
    duration: 100 // 100ms silence = end of speech
  }
})

// Send audio to channel
const resource = createAudioResource(audioStream, {
  inputType: StreamType.Raw,
  inlineVolume: true
})
player.play(resource)
connection.subscribe(player)
```

#### 4. AudioProcessor

**Responsibility**: Convert between audio formats

```typescript
class AudioProcessor {
  // Discord Opus → PCM for OpenAI
  static opusToPCM(opusBuffer: Buffer): Int16Array

  // OpenAI PCM → Opus for Discord
  static pcmToOpus(pcmBuffer: Int16Array): Buffer

  // Resample if needed (48kHz Discord → 24kHz OpenAI)
  static resample(buffer: Int16Array, fromRate: number, toRate: number): Int16Array

  // Adjust volume
  static adjustVolume(buffer: Int16Array, volume: number): Int16Array
}
```

**Format Specifications**:

- Discord Opus: 48kHz, stereo/mono, 20ms frames
- OpenAI Realtime: 24kHz, mono, PCM16
- Conversion: Use `prism-media` for Opus codec, simple interpolation for resampling

### Slash Command Interface

#### `/voice` Command

```typescript
/voice join <project>     // Join voice channel with project context
/voice leave              // Leave voice channel
/voice switch <project>   // Switch to different project mid-conversation
/voice pause              // Pause AI listening (mute)
/voice resume             // Resume AI listening
```

**Command Flow: `/voice join`**

1. **Validation**:
   - User must be in a voice channel
   - Bot must have voice permissions
   - Project must exist in Toji
   - User cannot already be in a voice session

2. **Session Creation**:
   - Create VoiceSession record
   - Join Discord voice channel
   - Connect to OpenAI Realtime API
   - Load project context into system instructions
   - Send confirmation embed to project text channel

3. **Active State**:
   - Listen to user's audio stream
   - Forward audio to OpenAI Realtime API
   - Receive AI audio responses
   - Play responses in voice channel
   - Log transcripts to project text channel

4. **Cleanup** (on `/voice leave` or disconnect):
   - Close OpenAI WebSocket
   - Leave Discord voice channel
   - Save conversation transcript
   - Update session status

### Project Context Integration

Each voice session needs project context from OpenCode:

```typescript
async function buildVoiceInstructions(projectPath: string): Promise<string> {
  // Load project info from Toji
  const project = await toji.getProject(projectPath)
  const agents = await toji.getProjectAgents(projectPath)

  return `
You are an AI assistant helping with the project "${project.name}".

Project Details:
- Path: ${projectPath}
- Description: ${project.description || 'No description'}
- Active Agents: ${agents.map((a) => a.name).join(', ')}

You are currently in a voice conversation. Be concise and natural.
When referencing code or complex information, offer to send it to the text channel.

Available functions:
- send_to_channel: Send detailed code/info to the project's text channel
- create_file: Create a new file in the project
- modify_file: Modify an existing file
- run_command: Execute a shell command in the project

Always confirm destructive operations before executing them.
  `.trim()
}
```

### Function Calling (Tools)

OpenAI Realtime API supports function calling:

```typescript
const tools: RealtimeTool[] = [
  {
    type: 'function',
    name: 'send_to_channel',
    description: 'Send a message with code or detailed information to the project text channel',
    parameters: {
      type: 'object',
      properties: {
        content: { type: 'string', description: 'The content to send' },
        code: { type: 'string', description: 'Optional code block' },
        language: { type: 'string', description: 'Code language for syntax highlighting' }
      },
      required: ['content']
    }
  },
  {
    type: 'function',
    name: 'list_files',
    description: 'List files in the project directory',
    parameters: {
      type: 'object',
      properties: {
        path: { type: 'string', description: 'Relative path to list' }
      }
    }
  },
  {
    type: 'function',
    name: 'read_file',
    description: 'Read contents of a file',
    parameters: {
      type: 'object',
      properties: {
        path: { type: 'string', description: 'Relative file path' }
      },
      required: ['path']
    }
  }
  // Additional tools: create_file, modify_file, run_command, etc.
]
```

**Tool Execution Flow**:

1. AI decides to call a function during conversation
2. Realtime API sends `response.function_call_arguments.done` event
3. VoiceService executes function through Toji API
4. Result sent back to Realtime API as conversation item
5. AI speaks the outcome naturally

### Transcript Logging

All voice conversations should be logged to the project's text channel:

```typescript
interface TranscriptEntry {
  timestamp: Date
  speaker: 'user' | 'assistant'
  text: string
  duration?: number // Audio duration in seconds
}

class TranscriptLogger {
  private entries: TranscriptEntry[] = []

  addEntry(speaker: 'user' | 'assistant', text: string, duration?: number): void

  async sendBatch(channelId: string): Promise<void> {
    // Send batched transcript every 30 seconds or on significant pauses
    const embed = {
      color: DISCORD_COLORS.INFO,
      title: '🎙️ Voice Conversation Transcript',
      description: this.formatEntries(this.entries),
      timestamp: new Date().toISOString()
    }
    await channel.send({ embeds: [embed] })
    this.entries = []
  }
}
```

**Batching Strategy**:

- Batch transcripts every 30 seconds
- Or after 10 exchanges
- Or after 2 minutes of silence
- Prevents spam while maintaining context

### Error Handling & Edge Cases

#### Network Issues

```typescript
class NetworkRecovery {
  private reconnectAttempts = 0
  private maxReconnects = 3

  async handleRealtimeDisconnect(session: VoiceSession): Promise<void> {
    if (this.reconnectAttempts < this.maxReconnects) {
      await this.reconnect(session)
    } else {
      await this.gracefulShutdown(session)
      await this.notifyUser(session, 'Lost connection to AI service')
    }
  }

  async handleDiscordDisconnect(session: VoiceSession): Promise<void> {
    // User left or was disconnected
    await session.realtimeClient.disconnect()
    await this.cleanup(session)
  }
}
```

#### Rate Limiting

- OpenAI Realtime API has token limits
- Track usage per session
- Warn users approaching limits
- Gracefully end session if limit hit

#### Concurrent Sessions

- Enforce one voice session per user
- If user joins new voice channel, end previous session
- Prevent session hijacking with user ID validation

#### Permission Errors

- Verify bot has `CONNECT` and `SPEAK` permissions
- Handle voice channel full scenarios
- Check OpenAI API key validity before connecting

### Performance Considerations

#### Audio Buffering

```typescript
class AudioBuffer {
  private buffer: Int16Array[] = []
  private readonly chunkSize = 4800 // 100ms at 48kHz

  append(audio: Int16Array): void {
    this.buffer.push(audio)
    if (this.getTotalLength() >= this.chunkSize) {
      this.flush()
    }
  }

  flush(): Int16Array {
    const combined = this.combine(this.buffer)
    this.buffer = []
    return combined
  }
}
```

**Strategy**:

- Buffer 100-200ms of audio before sending to OpenAI
- Reduces WebSocket message overhead
- Maintains acceptable latency
- Adaptive buffering based on network conditions

#### Memory Management

- Limit concurrent voice sessions (e.g., 10 max)
- Clean up audio buffers after use
- Monitor WebSocket memory usage
- Implement session timeouts (30 minutes max)

#### CPU Usage

- Opus encoding/decoding is CPU-intensive
- Consider offloading to worker threads
- Monitor CPU usage, throttle if needed
- Optimize resampling algorithms

## Dependencies to Add

```json
{
  "dependencies": {
    "@discordjs/voice": "^0.17.0",
    "@discordjs/opus": "^0.9.0",
    "prism-media": "^1.3.5",
    "sodium-native": "^4.2.0",
    "ffmpeg-static": "^5.2.0",
    "ws": "^8.18.0"
  },
  "devDependencies": {
    "@types/ws": "^8.5.12"
  }
}
```

**Installation Notes**:

- `sodium-native` requires Python and build tools on Windows
- `ffmpeg-static` provides FFmpeg binary (200MB+)
- Alternative: Require system FFmpeg installation

## Configuration

Add to `opencode.json`:

```json
{
  "discord": {
    "voice": {
      "enabled": true,
      "model": "gpt-4o-realtime-preview",
      "voice": "nova",
      "temperature": 0.8,
      "maxSessionDuration": 1800,
      "maxConcurrentSessions": 10,
      "transcriptBatchInterval": 30,
      "audioBufferSize": 200
    }
  },
  "openai": {
    "realtimeApiKey": "${OPENAI_API_KEY}"
  }
}
```

## User Experience Flow

### Happy Path Example

1. User joins voice channel `#voice-lounge`
2. User types `/voice join project:my-app` in `#my-app` text channel
3. Bot joins voice channel and sends embed showing session started
4. User says "Hey, can you explain the authentication system?"
5. Bot speaks response while user hears it in real-time
6. Bot posts transcript to `#my-app` text channel periodically
7. User asks "Can you show me the login route code?"
8. Bot says "I'll send that to the channel" (spoken)
9. Bot posts detailed code block to `#my-app`
10. User types `/voice leave`
11. Bot leaves voice channel and posts final transcript

### Error Scenario

1. User types `/voice join project:nonexistent`
2. Bot sends ephemeral error message explaining project doesn't exist
3. Bot suggests using `/project list` to see available projects

## Testing Strategy

### Unit Tests

- Audio format conversion accuracy
- WebSocket message parsing
- Session state management
- Transcript formatting

### Integration Tests

- Mock Discord voice connection
- Mock OpenAI Realtime API responses
- Test reconnection logic
- Verify cleanup on errors

### End-to-End Tests

- Real Discord bot in test server
- OpenAI API usage (with quota monitoring)
- Multi-user scenarios
- Network interruption simulation

## Core Technical Challenges

Focus: **Get audio in, get audio out**. Everything else is premature.

### Challenge 1: Audio Input Pipeline

**Question**: How do we capture Discord user audio?

```typescript
// discord.js provides VoiceReceiver
const connection = joinVoiceChannel({...})
const receiver = connection.receiver

// Subscribe to a specific user's audio
const audioStream = receiver.subscribe(userId, {
  end: {
    behavior: EndBehaviorType.AfterSilence,
    duration: 100 // End after 100ms of silence
  }
})

// Audio comes as Opus packets
audioStream.on('data', (chunk: Buffer) => {
  // Opus encoded audio, 20ms frames, 48kHz
  console.log('Received Opus packet:', chunk.length)
})
```

**Problems to solve**:

1. **Opus Decoding**: Discord sends Opus, OpenAI needs PCM
   - Use `@discordjs/opus` or `prism-media` to decode
   - Convert 48kHz stereo → 24kHz mono for OpenAI
2. **Silence Detection**: When does user stop talking?
   - `EndBehaviorType.AfterSilence` helps but needs tuning
   - 100ms? 200ms? 500ms? Experimentation needed
3. **Keyword Detection**: "Hey Toji" to activate listening
   - Run local wake word detection? (Porcupine, Picovoice)
   - Or always-on listening (privacy concerns)
   - Or push-to-talk command?

**Streaming Challenge**:

```typescript
// Option A: Buffer until silence, then send complete utterance
const audioBuffer: Buffer[] = []
audioStream.on('data', (chunk) => {
  audioBuffer.push(chunk)
})
audioStream.on('end', () => {
  // User stopped talking, send to OpenAI
  const completeAudio = Buffer.concat(audioBuffer)
  sendToWhisper(completeAudio)
})

// Option B: Stream chunks in real-time (OpenAI Realtime API only)
audioStream.on('data', (chunk) => {
  const pcm = opusToPCM(chunk)
  realtimeClient.sendAudio(pcm) // Immediate send
})
```

**Decision needed**: Batch or stream?

- **Batch**: Simpler, works with Whisper API, but adds latency
- **Stream**: Lower latency, requires Realtime API, more complex

### Challenge 2: Audio Output Pipeline

**Question**: How do we play AI responses in Discord?

```typescript
// discord.js provides AudioPlayer
import { createAudioPlayer, createAudioResource, StreamType } from '@discordjs/voice'

const player = createAudioPlayer()
connection.subscribe(player)

// Play audio from OpenAI
const audioStream = /* PCM audio from OpenAI */
const resource = createAudioResource(audioStream, {
  inputType: StreamType.Raw,
  inlineVolume: true
})

player.play(resource)
```

**Problems to solve**:

1. **PCM Encoding**: OpenAI sends PCM, Discord needs Opus
   - Use `prism-media` to encode
   - Convert 24kHz mono → 48kHz stereo (or mono)
2. **Streaming vs Buffering**: Can we stream TTS output?
   - OpenAI TTS API: Returns complete audio file (no streaming)
   - OpenAI Realtime API: Streams audio chunks in real-time
3. **Audio Quality**: Ensure no pops, clicks, or distortion
   - Proper sample rate conversion
   - Smooth transitions between audio chunks

**Streaming Challenge**:

```typescript
// Option A: Wait for complete response, then play
const ttsResponse = await openai.audio.speech.create({...})
const audioBuffer = Buffer.from(await ttsResponse.arrayBuffer())
playInDiscord(audioBuffer)

// Option B: Stream as it arrives (Realtime API only)
realtimeClient.on('audio', (pcmChunk: Int16Array) => {
  // Convert and play immediately
  const opusChunk = pcmToOpus(pcmChunk)
  audioOutputStream.write(opusChunk)
})
```

**Decision needed**: Can we achieve truly streaming playback?

### Challenge 3: Voice Activity Detection (VAD)

**Question**: How do we know when the user is speaking vs background noise?

**Options**:

1. **Discord's Built-in**: `EndBehaviorType.AfterSilence`
   - Simple but crude
   - Tunable silence duration
2. **OpenAI Realtime API VAD**: Built-in, handles automatically
   - No custom implementation needed
   - Trust the API
3. **Local VAD**: `@ricky0123/vad-node`, `silero-vad`
   - More control
   - Can detect speech before sending to API (save costs)
   - Adds complexity

**Experimentation needed**:

- Test background noise filtering
- Test multiple people talking
- Test music playing in background

### Challenge 4: Audio Format Conversion

**Question**: How do we convert between formats efficiently?

**Format Requirements**:

- **Discord**: Opus codec, 48kHz, 20ms frames, stereo or mono
- **OpenAI Realtime**: PCM16, 24kHz, mono
- **OpenAI Whisper**: Various formats (mp3, wav, webm, etc.)
- **OpenAI TTS**: PCM, mp3, opus, aac, flac

**Conversion Pipeline**:

```typescript
class AudioConverter {
  // Discord Opus → PCM for processing
  opusToPCM(opusBuffer: Buffer): Int16Array {
    const decoder = new OpusDecoder(48000, 2) // 48kHz stereo
    return decoder.decode(opusBuffer)
  }

  // Resample 48kHz → 24kHz
  resample(pcm48k: Int16Array): Int16Array {
    // Simple linear interpolation or use proper resampler
    const pcm24k = new Int16Array(pcm48k.length / 2)
    for (let i = 0; i < pcm24k.length; i++) {
      pcm24k[i] = pcm48k[i * 2] // Naive downsampling
    }
    return pcm24k
  }

  // Stereo → Mono
  stereoToMono(stereo: Int16Array): Int16Array {
    const mono = new Int16Array(stereo.length / 2)
    for (let i = 0; i < mono.length; i++) {
      mono[i] = (stereo[i * 2] + stereo[i * 2 + 1]) / 2
    }
    return mono
  }

  // PCM → Opus for Discord
  pcmToOpus(pcmBuffer: Int16Array): Buffer {
    const encoder = new OpusEncoder(48000, 2 /* other params */)
    return encoder.encode(pcmBuffer)
  }
}
```

**Research needed**:

- Best resampling library? (`node-libsamplerate`, `audio-resampler`)
- CPU cost of real-time conversion?
- Quality loss in naive downsampling?

### Challenge 5: WebSocket Management (Realtime API)

**Question**: How do we maintain a stable WebSocket connection?

**WebSocket Lifecycle**:

```typescript
import WebSocket from 'ws'

class OpenAIRealtimeClient {
  private ws: WebSocket | null = null
  private audioBuffer: Int16Array[] = []

  async connect(apiKey: string): Promise<void> {
    this.ws = new WebSocket('wss://api.openai.com/v1/realtime?model=gpt-4o-realtime-preview', {
      headers: {
        Authorization: `Bearer ${apiKey}`,
        'OpenAI-Beta': 'realtime=v1'
      }
    })

    this.ws.on('open', () => {
      console.log('Connected to OpenAI Realtime API')
      // Send session configuration
      this.sendEvent({
        type: 'session.update',
        session: {
          voice: 'alloy',
          instructions: 'You are a helpful assistant...'
        }
      })
    })

    this.ws.on('message', (data: Buffer) => {
      const event = JSON.parse(data.toString())
      this.handleEvent(event)
    })

    this.ws.on('error', (err) => {
      console.error('WebSocket error:', err)
    })

    this.ws.on('close', () => {
      console.log('WebSocket closed')
      // Reconnect logic?
    })
  }

  sendAudio(pcmChunk: Int16Array): void {
    if (!this.ws) return
    // Convert to base64
    const base64Audio = Buffer.from(pcmChunk.buffer).toString('base64')
    this.sendEvent({
      type: 'input_audio_buffer.append',
      audio: base64Audio
    })
  }

  private handleEvent(event: any): void {
    switch (event.type) {
      case 'response.audio.delta':
        // Decode base64 PCM and play
        const pcmChunk = Buffer.from(event.delta, 'base64')
        this.emit('audio', new Int16Array(pcmChunk.buffer))
        break
      case 'response.audio_transcript.delta':
        // Transcript for logging
        this.emit('transcript', event.delta)
        break
      // ... other events
    }
  }
}
```

**Problems to solve**:

1. **Reconnection**: What if WebSocket drops?
2. **Backpressure**: What if we send audio faster than API processes?
3. **Latency Monitoring**: Track end-to-end delays
4. **Error Recovery**: Handle rate limits, API errors gracefully

### Challenge 6: Keyword Activation

**Question**: How do we avoid always-on listening?

**Options**:

1. **Push-to-Talk**: User holds a key or clicks button
   - Not viable in Discord voice chat
2. **Slash Command**: `/voice activate` to start listening
   - Manual, not conversational
3. **Wake Word**: "Hey Toji" detection
   - Need local wake word engine
   - Porcupine, Picovoice, Snowboy (deprecated)
4. **Name Detection in Transcript**: Listen, transcribe, check for "Toji"
   - High latency
   - Wastes API calls

**Wake Word Implementation**:

```typescript
import { PvPorcupine } from '@picovoice/porcupine-node'

const porcupine = new PvPorcupine(
  accessKey,
  [PvPorcupine.KEYWORDS.HEY_SIRI], // or custom wake word
  [0.5] // Sensitivity
)

// Process audio through wake word detector
audioStream.on('data', (chunk: Buffer) => {
  const pcm = opusToPCM(chunk)
  const keywordIndex = porcupine.process(pcm)

  if (keywordIndex >= 0) {
    console.log('Wake word detected!')
    // Start buffering audio for OpenAI
    startListening()
  }
})
```

**Research needed**:

- Free wake word solutions?
- Train custom "Hey Toji" model?
- CPU cost of continuous wake word detection?

## Minimal Implementation Plan

**Goal**: Prove audio in/out works before adding features.

### Phase 1: Audio I/O Proof of Concept

- [ ] Install `@discordjs/voice`, `@discordjs/opus`, `prism-media`, `ws`
- [ ] Create Discord bot, join voice channel with `/voice join`
- [ ] Capture user audio from Discord (Opus)
- [ ] Decode Opus → PCM
- [ ] Log PCM data to verify reception
- [ ] Play test audio file (PCM) in Discord voice
- [ ] Verify smooth playback without glitches

**Success Criteria**: Bot can hear and speak.

### Phase 2: OpenAI Integration

- [ ] Implement WebSocket client for Realtime API
- [ ] Send captured PCM audio to Realtime API
- [ ] Receive audio response from Realtime API
- [ ] Play response in Discord voice channel
- [ ] Test end-to-end latency

**Success Criteria**: User says "Hello" → AI responds in voice.

### Phase 3: Research & Refinement

- [ ] Experiment with silence detection thresholds
- [ ] Test audio quality and conversion artifacts
- [ ] Measure latency at each pipeline stage
- [ ] Research wake word solutions
- [ ] Test background noise handling
- [ ] Decide: Streaming vs batching approach

**Success Criteria**: Stable conversation without manual intervention.

## Open Research Questions

These need real-world experimentation:

1. **Streaming**: Can we stream both input and output for true real-time feel?
2. **Latency**: What's the actual end-to-end delay? (Target: <500ms)
3. **Wake Word**: Free solutions vs always-on vs manual activation?
4. **Audio Quality**: Will naive resampling sound acceptable?
5. **VAD Tuning**: What silence threshold works best? (100ms? 500ms?)
6. **Background Noise**: How well does OpenAI Realtime API handle noise?
7. **Multiple Speakers**: What happens when 2+ people talk simultaneously?
8. **Cost**: Real-world usage costs vs API pricing estimates

## Key Implementation Notes

- **Start simple**: Get audio in/out working first
- **No sessions yet**: Focus on technical pipeline, not architecture
- **No transcripts yet**: Just prove voice works
- **No project context yet**: Hardcode a simple prompt
- **No error handling yet**: Happy path only
- **Measure everything**: Log latency at each stage

## References

### Documentation

- [OpenAI Realtime API](https://platform.openai.com/docs/guides/realtime)
- [OpenAI Whisper API](https://platform.openai.com/docs/guides/speech-to-text)
- [OpenAI TTS API](https://platform.openai.com/docs/guides/text-to-speech)
- [Discord.js Voice](https://discord.js.org/docs/packages/voice/main)
- [Discord Voice Guide](https://discordjs.guide/voice/)

### GitHub Examples

- [discord-voice-message-transcriber](https://github.com/RyanCheddar/discord-voice-message-transcriber)
- [discord.js voice-examples](https://github.com/discordjs/voice-examples)

### Libraries

- [@discordjs/voice](https://www.npmjs.com/package/@discordjs/voice)
- [prism-media](https://www.npmjs.com/package/prism-media)
- [ws](https://www.npmjs.com/package/ws)

## Success Metrics

### Technical Metrics

- Latency: <500ms end-to-end (speech → response)
- Uptime: >99% voice session success rate
- Memory: <100MB per active session
- CPU: <20% per session

### User Metrics

- Adoption: 30% of active users try voice in first month
- Retention: 50% of voice users continue after first session
- Satisfaction: >4.5/5 average rating
- Session Length: Average 5-10 minutes (indicates engagement)

---

**Document Status**: Draft v1.0  
**Last Updated**: 2025-10-04  
**Author**: AI Development Team  
**Review Status**: Pending technical review
