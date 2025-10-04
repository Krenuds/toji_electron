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
- Active Agents: ${agents.map(a => a.name).join(', ')}

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

## Rollout Plan

### Phase 1: Foundation (Week 1)

- [ ] Install dependencies
- [ ] Implement `AudioProcessor` utility
- [ ] Implement `OpenAIRealtimeClient` with WebSocket
- [ ] Add basic unit tests

### Phase 2: Discord Integration (Week 2)

- [ ] Implement `VoiceConnection` wrapper
- [ ] Create `/voice join` command (basic)
- [ ] Test audio receive and send pipelines
- [ ] Implement basic transcript logging

### Phase 3: Session Management (Week 3)

- [ ] Implement `VoiceSessionManager`
- [ ] Add project context loading
- [ ] Implement `/voice leave` and auto-disconnect
- [ ] Add error handling and recovery

### Phase 4: Advanced Features (Week 4)

- [ ] Add function calling (tools integration)
- [ ] Implement `/voice switch` for project switching
- [ ] Add `/voice pause` and `/voice resume`
- [ ] Polish transcript formatting

### Phase 5: Production Hardening (Week 5)

- [ ] Add comprehensive error handling
- [ ] Implement rate limiting and quotas
- [ ] Add monitoring and logging
- [ ] Performance optimization
- [ ] Security audit

### Phase 6: Documentation & Launch (Week 6)

- [ ] Write user documentation
- [ ] Create example videos/GIFs
- [ ] Update CLAUDE.md with voice system
- [ ] Beta testing with select users
- [ ] Public release

## Security Considerations

### API Key Protection

- Store OpenAI API key in secure config
- Never expose key in logs or error messages
- Rotate keys periodically

### User Authentication

- Verify Discord user identity
- Prevent session hijacking
- Rate limit per user

### Data Privacy

- Transcripts contain potentially sensitive code
- Only log to project channels (not public)
- Add opt-out mechanism for transcript logging
- GDPR compliance: Allow transcript deletion

### Audio Security

- Don't store raw audio files
- Only keep transcripts (text)
- Implement maximum session duration
- Auto-cleanup on bot restart

## Cost Analysis

### OpenAI Realtime API Costs

- **Input Audio**: $0.06 per minute
- **Output Audio**: $0.24 per minute
- **Average Conversation**: 10 minutes = $3.00
- **100 conversations/month**: $300
- **1000 conversations/month**: $3,000

### Cost Mitigation Strategies

1. Set per-user quotas (e.g., 30 min/day)
2. Implement session timeouts (30 min max)
3. Add cost dashboard for admins
4. Option to disable voice for non-premium users
5. Fall back to Whisper + TTS for budget constraints

### Alternative: Local Whisper

- **whisper.cpp**: Fast C++ implementation
- **faster-whisper**: Optimized Python version
- **Pros**: No API costs, lower latency for STT
- **Cons**: Requires local compute, no native conversation flow
- **Hybrid**: Use local Whisper for STT, OpenAI for TTS and chat

## Future Enhancements

### Multi-User Voice Conversations

- Multiple users in same voice channel
- Round-robin speaking turns
- Voice identification
- Group context tracking

### Voice Customization

- User-selectable AI voices
- Adjustable speaking speed
- Emotion/tone control
- Different voices for different agents

### Advanced Audio Processing

- Noise cancellation
- Echo suppression
- Background music detection
- Audio quality enhancement

### Analytics & Insights

- Conversation duration tracking
- Most discussed topics
- User engagement metrics
- Cost per project reporting

### Accessibility Features

- Live captions (real-time transcripts)
- Text-to-speech for text responses
- Voice command shortcuts
- Multilingual support

## Open Questions

1. **Session Persistence**: Should sessions survive bot restarts?
2. **Multi-Project**: Allow switching projects mid-conversation or force restart?
3. **Audio Storage**: Store audio for debugging/replay? (Privacy implications)
4. **Voice Authentication**: Use voice biometrics for security?
5. **Fallback Strategy**: Graceful degradation when OpenAI API unavailable?

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
