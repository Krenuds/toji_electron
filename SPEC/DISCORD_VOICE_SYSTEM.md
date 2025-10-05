# Discord Voice System Specification

## Architecture

**Core Principle**: Main process owns all voice logic; Discord plugin is thin interface layer.

**Pipeline**: Discord Opus → PCM → OpenAI Realtime API → PCM → Opus → Discord

## Technology Stack

### Dependencies

- `@discordjs/voice` - Voice connection/audio streaming
- `@discordjs/opus` - Opus codec
- `prism-media` - Audio format conversion
- `ws` - WebSocket for OpenAI Realtime API

### OpenAI Realtime API (Recommended)

- **Endpoint**: `wss://api.openai.com/v1/realtime`
- **Model**: `gpt-4o-realtime-preview`
- **Format**: 24kHz PCM16 mono (input/output)
- **Latency**: ~320ms
- **Features**: Built-in VAD, turn-taking, function calling

### Fallback: Whisper + TTS

- Whisper: 2-3s latency
- TTS: 500ms-1s latency
- Total: 3-5s (use only if budget constrained)

## Module Structure

```
src/plugins/discord/voice/
├── VoiceSessionManager.ts    # Session coordination
├── OpenAIRealtimeClient.ts   # WebSocket client
├── AudioProcessor.ts          # Format conversion
└── VoiceConnection.ts         # Discord wrapper

src/main/services/
└── voice-service.ts           # Main process orchestration
```

## Core Components

**VoiceSession**: `{ userId, channelId, projectPath, connection, realtimeClient, status }`

- One per user, auto-cleanup, network recovery

**OpenAIRealtimeClient**: WebSocket wrapper

- Methods: `connect()`, `sendAudio()`, `disconnect()`
- Events: `audio`, `transcript`, `function_call`, `error`
- Messages: `response.audio.delta`, `input_audio_buffer.append`, `session.update`

**VoiceConnection**: Discord audio I/O

- Input: `receiver.subscribe(userId, { end: AfterSilence(100ms) })`
- Output: `createAudioResource(stream, StreamType.Raw)`

**AudioProcessor**: Format conversions

- Opus ↔ PCM, 48kHz ↔ 24kHz, Stereo ↔ Mono

## Commands & Functions

**Commands**: `/voice join/leave/switch/pause/resume <project>`

**Tools**: `send_to_channel`, `list_files`, `read_file`, `create_file`, `modify_file`

- Flow: AI calls → VoiceService executes via Toji → Result to API → AI speaks

## State Management

**Session**: One per user, persist to disk, 30min timeout

**Transcripts**: `{ timestamp, speaker, text, duration }` batched every 30s/10 exchanges/2min silence

## Error Handling & Performance

**Network**: Max 3 reconnects, graceful shutdown, notify user

**Validation**: Check permissions (`CONNECT`, `SPEAK`), verify API key, validate project

**Limits**: Max 10 sessions, track usage, warn/auto-end on quota

**Buffering**: 100-200ms chunks for WebSocket efficiency

**Resources**: Clean buffers, monitor memory/CPU, consider worker threads for Opus

## Configuration

```json
{
  "discord": {
    "voice": {
      "enabled": true,
      "model": "gpt-4o-realtime-preview",
      "voice": "nova",
      "maxSessionDuration": 1800,
      "maxConcurrentSessions": 10
    }
  }
}
```

## Critical Challenges

**Audio Input**: Opus decode, 48kHz→24kHz, silence detection (100-500ms), streaming vs batching

**Audio Output**: PCM→Opus encode, 24kHz→48kHz resample, quality (no artifacts)

**VAD**: Discord AfterSilence (simple), OpenAI built-in (recommended), local VAD (advanced)

**Wake Word**: Porcupine/Picovoice (paid) or slash command activation; CPU cost concern

**WebSocket**: Lifecycle management, reconnection with backoff, backpressure, latency monitoring

## Implementation Phases

**Phase 1 (POC)**: Install deps, join channel, capture/decode audio, play audio → Bot hears/speaks

**Phase 2 (Integration)**: WebSocket client, stream to/from Realtime API, test latency → Live conversation

**Phase 3 (Production)**: Session mgmt, project context, functions, transcripts, error recovery → Production-ready

## Research Questions

Streaming vs batching? Latency <500ms? Wake word? Resampling quality? VAD tuning? Noise handling? Multi-speaker? Costs?

## Success Metrics

**Technical**: <500ms latency, >99% uptime, <100MB/session, <20% CPU | **User**: 30% adoption, 50% retention, >4.5/5 rating

---

**Status**: Draft v1.0 | **Updated**: 2025-10-04 | **Review**: Pending
