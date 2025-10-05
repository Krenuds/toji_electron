# Phase 3: Speech-to-Text System - Summary

## Overview

Real-time voice interaction using local Whisper STT. User flow: wake word/hotkey → audio capture → Whisper transcription → send on silence (1-2s) → active project/Discord with visual feedback.

## Solution: whisper.cpp

**Key Features:** Real-time streaming, built-in VAD, fast CPU inference, cross-platform, Electron-compatible binary, 43.6k stars.

**Stack:**

- Binary: `whisper-stream` (whisper.cpp)
- Model: `base.en` (142MB)
- VAD: Silero VAD
- Audio: `node-microphone`

## Implementation Phases

### Phase 3.1: Whisper Setup (2-3 days)

Build whisper.cpp, bundle binary + models with Electron, test spawning from Node.js.

### Phase 3.2: Audio Capture (3-4 days)

Microphone capture, wake word detection, VAD for speech start/end, buffer audio until silence.

### Phase 3.3: Integration (2-3 days)

IPC handlers, route to active project/Discord/general prompt, UI controls (button + hotkey), real-time status.

## Architecture

```text
Renderer (Chakra UI) → IPC → Main Process
  ├─ STTService (mic capture, wake word, silence detection)
  │  └─ spawn → whisper-stream (transcription, VAD)
  └─ Integration → Toji Project / Discord / General Prompt
```

## Configuration

```typescript
{
  "stt": {
    "enabled": true,
    "wakeWord": "listen",
    "model": "base.en",
    "hotkey": "CommandOrControl+Shift+L",
    "vadThreshold": 0.5,
    "silenceDurationMs": 1500,
    "autoSendTo": "active-project"
  }
}
```

## Technical Specifications

**Audio:** 16kHz mono, 16-bit PCM

**Models:**

- tiny.en (75MB) - Testing
- **base.en (142MB) - Production ✅**
- small.en (466MB) - Power users
- medium.en (1.5GB) - Desktop only

**Performance:**

- Wake word: <500ms
- First chunk: <300ms
- Real-time factor: <0.5x
- Silence detection: 1-2s

## Integration

```typescript
// 1. Active project
if (activeProject) await tojiService.sendMessage(activeProject.id, transcript)

// 2. Discord voice
if (discordVoice.isConnected()) await discord.sendMessage(channelId, transcript)

// 3. Fallback
await tojiService.sendGeneralPrompt(transcript)
```

## Files

**Main:** `stt-service.ts`, `stt.handlers.ts`
**Renderer:** `useSTT.ts`, `STTControl.tsx`
**Resources:** `whisper-stream` binary, `ggml-base.en.bin` model

## Implementation Steps

### Immediate

1. Build whisper.cpp with streaming
2. Test model + microphone
3. Verify wake word detection

### Short-term

1. Create STTService stub
2. Implement process spawning + audio capture
3. Build silence detection

### Medium-term

1. Wire IPC handlers
2. Integrate with Toji/Discord
3. Build UI controls + hotkey
4. End-to-end testing

## Success Criteria

**Phase 3.1:** whisper.cpp builds, bundles, spawns correctly
**Phase 3.2:** Mic captures, wake word works, silence detection functional, VAD filters noise
**Phase 3.3:** Routing works, UI responsive, hotkey functional, tests pass

## Risks & Mitigations

| Risk               | Solution                      |
| ------------------ | ----------------------------- |
| Binary build fails | Pre-built binaries            |
| High CPU           | tiny.en model, low-power mode |
| Mic permissions    | Clear prompts, text fallback  |
| Poor accuracy      | VAD filtering, retry option   |

## Timeline

**Total:** 7-10 days (Phase 3.1: 2-3d, Phase 3.2: 3-4d, Phase 3.3: 2-3d)

## Resources

- whisper.cpp: https://github.com/ggml-org/whisper.cpp
- Streaming: https://github.com/ggml-org/whisper.cpp/tree/master/examples/stream
- node-microphone: https://www.npmjs.com/package/node-microphone

**See PHASE3_STT_QUICKSTART.md for setup.**
