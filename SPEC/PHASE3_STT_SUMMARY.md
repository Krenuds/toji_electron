# Phase 3: Speech-to-Text System - Summary

## Overview

We're adding real-time voice interaction to Toji using local Whisper STT.

**User flow:**

1. User says "listen" (wake word) or presses hotkey
2. Audio captured from microphone
3. Whisper transcribes speech locally in real-time
4. On silence (1-2s), transcription sent to active project/Discord
5. Visual feedback shows listening state

---

## Research Results

### ✅ Recommended Solution: whisper.cpp

**Why?**

- ✅ Real-time streaming support (`examples/stream`)
- ✅ Built-in Voice Activity Detection (VAD)
- ✅ Fast CPU inference (works on Apple Silicon)
- ✅ Cross-platform (Windows, macOS, Linux)
- ✅ Can bundle as binary with Electron
- ✅ Active community (43.6k stars)
- ✅ Multiple model sizes (75MB - 1.5GB)

**What we'll use:**

- **Binary:** `whisper-stream` (from whisper.cpp/examples/stream)
- **Model:** `base.en` (142MB, good balance)
- **VAD:** Silero VAD (built-in)
- **Audio Capture:** `node-microphone` npm package

---

## Three Implementation Phases

### Phase 3.1: Whisper Setup (2-3 days)

**Goal:** Get whisper.cpp running and bundled.

- Build whisper.cpp locally
- Download and test models
- Bundle binary + models with Electron
- Test spawning process from Node.js

**Deliverable:** Binary runs when app launches.

---

### Phase 3.2: Audio Capture (3-4 days)

**Goal:** Capture audio and detect wake word.

- Implement microphone capture (node-microphone)
- Detect "listen" wake word from streaming output
- Use VAD to detect start/end of speech
- Buffer audio and finalize on silence

**Deliverable:** Speak "listen" → audio captured → transcribed → stops on silence.

---

### Phase 3.3: Integration (2-3 days)

**Goal:** Send transcriptions to the right place.

- IPC handlers for STT control
- Route transcriptions to:
  - Active Toji project
  - Discord channel (if voice connected)
  - General Toji prompt (fallback)
- UI controls (button + hotkey)
- Real-time status display

**Deliverable:** Voice input works end-to-end.

---

## Technical Architecture

```text
┌─────────────────────────────────────────┐
│ Renderer (Chakra UI)                    │
│  - STT button/hotkey                    │
│  - Real-time status display             │
└──────────────┬──────────────────────────┘
               │ IPC
┌──────────────┴──────────────────────────┐
│ Main Process                             │
│                                          │
│  ┌────────────────────────────────────┐ │
│  │ STTService                         │ │
│  │  - Microphone capture              │ │
│  │  - Wake word detection             │ │
│  │  - Silence detection               │ │
│  │  - Process management              │ │
│  └──────────┬─────────────────────────┘ │
│             │ spawn                      │
│  ┌──────────┴─────────────────────────┐ │
│  │ whisper-stream binary              │ │
│  │  - Real-time transcription         │ │
│  │  - VAD filtering                   │ │
│  └────────────────────────────────────┘ │
│                                          │
│  ┌────────────────────────────────────┐ │
│  │ Integration Layer                  │ │
│  │  → Toji Project                    │ │
│  │  → Discord Channel                 │ │
│  │  → General Prompt                  │ │
│  └────────────────────────────────────┘ │
└─────────────────────────────────────────┘
```

---

## Configuration

```typescript
// opencode.json
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

---

## Key Technical Details

### Audio Format

- **Sample Rate:** 16kHz
- **Channels:** Mono
- **Bit Depth:** 16-bit PCM

### Models

| Model | Size | Speed | Accuracy | Recommendation |
|-------|------|-------|----------|----------------|
| tiny.en | 75MB | 10x | Low | Testing only |
| **base.en** | **142MB** | **7x** | **Good** | **✅ Production** |
| small.en | 466MB | 4x | Better | Power users |
| medium.en | 1.5GB | 2x | Best | Desktop only |

### Performance Targets

- **Wake word latency:** <500ms
- **First transcription chunk:** <300ms
- **Real-time factor:** <0.5x (faster than real-time)
- **End of speech detection:** 1-2 seconds silence

---

## Integration Points

### 1. Active Toji Project

```typescript
if (activeProject) {
  await tojiService.sendMessage(activeProject.id, transcript);
}
```

### 2. Discord Voice Channel

```typescript
if (discordVoice.isConnected()) {
  const channelId = discordVoice.getCurrentChannelId();
  await discord.sendMessage(channelId, transcript);
}
```

### 3. Fallback to General Prompt

```typescript
await tojiService.sendGeneralPrompt(transcript);
```

---

## Files to Create

### Main Process

- `src/main/services/stt-service.ts` - Core STT logic
- `src/main/handlers/stt.handlers.ts` - IPC handlers

### Renderer

- `src/renderer/src/hooks/useSTT.ts` - React hook
- `src/renderer/src/components/STTControl.tsx` - UI component

### Resources

- `resources/whisper/whisper-stream` (or .exe) - Binary
- `resources/whisper/models/ggml-base.en.bin` - Model

---

## Documentation Created

1. **PHASE3_STT_PLAN.md** - Full implementation plan (detailed)
2. **PHASE3_STT_OPTIONS.md** - Technology comparison
3. **PHASE3_STT_QUICKSTART.md** - Local setup guide
4. **PHASE3_STT_SUMMARY.md** - This file (overview)

---

## Next Actions

### Immediate (Today)

1. Clone whisper.cpp locally
2. Build with streaming support
3. Download base.en model
4. Test real-time streaming with microphone
5. Verify wake word detection works

### Short-term (This Week)

1. Create `stt-service.ts` stub
2. Implement process spawning
3. Test audio capture with node-microphone
4. Build silence detection logic

### Medium-term (Next Week)

1. Wire up IPC handlers
2. Integrate with Toji projects
3. Add Discord voice integration
4. Build UI controls
5. Test end-to-end

---

## Questions to Answer

1. **Wake Word Strategy?**
   - [ ] Always-on listening with "listen" detection
   - [ ] Button/hotkey activation only (simpler, better battery)

2. **Model to Bundle?**
   - [ ] base.en (142MB) - recommended
   - [ ] tiny.en (75MB) - smaller, less accurate

3. **Target Priority?**
   - [ ] Active project first
   - [ ] Discord voice if connected
   - [ ] User-configurable

4. **UI Location?**
   - [ ] Header bar (global)
   - [ ] Project panel (per-project)
   - [ ] Floating overlay

---

## Success Metrics

### Phase 3.1 Success

- ✅ whisper.cpp builds and runs
- ✅ Binary bundles with Electron
- ✅ Can spawn and communicate with process

### Phase 3.2 Success

- ✅ Microphone captures audio
- ✅ Wake word activates transcription
- ✅ Silence ends transcription
- ✅ VAD filters noise

### Phase 3.3 Success

- ✅ Transcription routed correctly
- ✅ UI shows status
- ✅ Hotkey works
- ✅ Integration tests pass

---

## Risk Mitigation

| Risk | Mitigation |
|------|------------|
| Binary build fails | Provide pre-built binaries |
| High CPU usage | Use tiny.en model, add low-power mode |
| Mic permissions | Clear UI prompts, fallback to text |
| Poor accuracy | VAD filtering, allow retry |

---

## Timeline

- **Phase 3.1:** 2-3 days
- **Phase 3.2:** 3-4 days
- **Phase 3.3:** 2-3 days
- **Total:** 7-10 days

---

## Resources

- whisper.cpp: <https://github.com/ggml-org/whisper.cpp>
- Streaming example: <https://github.com/ggml-org/whisper.cpp/tree/master/examples/stream>
- node-microphone: <https://www.npmjs.com/package/node-microphone>

---

**Ready to start Phase 3.1!** 🎤

See `PHASE3_STT_QUICKSTART.md` to get whisper.cpp running locally in 5 minutes.
