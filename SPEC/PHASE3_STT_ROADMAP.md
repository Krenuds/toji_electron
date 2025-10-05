# Phase 3: STT Implementation Roadmap

## Visual Timeline

```text
Week 1: Whisper Setup        Week 2: Audio Capture      Week 3: Integration
─────────────────────────    ──────────────────────     ────────────────────
├─ Day 1-2: Build whisper   ├─ Day 6-7: Audio capture  ├─ Day 11: IPC setup
├─ Day 3-4: Electron bundle  ├─ Day 8-9: Wake word     ├─ Day 12: Routing
├─ Day 5: Service stub       ├─ Day 10: VAD & silence  ├─ Day 13-14: UI/Test
✓ Milestone: Binary runs     ✓ Milestone: Audio works  ✓ Milestone: E2E works
```

---

## Phase 3.1: Whisper Setup (Days 1-5)

### Day 1-2: Build & Models

**Tasks:**
- Clone `whisper.cpp` repository
- Build with `cmake -B build -DWHISPER_SDL2=ON`
- Download `base.en` and `tiny.en` models
- Download Silero VAD model (`silero-v5.1.2`)
- Test `whisper-stream` locally with microphone
- Benchmark performance

**Success:** Real-time transcription works, VAD tested, performance acceptable.

### Day 3-4: Electron Bundle

**Tasks:**
- Structure: `resources/whisper/{bin,models}/`
- Copy `whisper-stream` binary and models
- Configure `electron-builder.yml` with `extraResources`
- Test packaging on target platforms

**Success:** Binary and models bundle correctly, accessible at runtime.

### Day 5: Service Stub

**Implementation:** `src/main/services/stt-service.ts`
- Class structure with process management
- Binary and model path resolution
- `startListening()` and `stopListening()` methods
- Process spawning and cleanup

**Success:** Service spawns whisper process, can start/stop.

---

## Phase 3.2: Audio Capture (Days 6-10)

### Day 6-7: Microphone Capture

**Setup:**
- Install `node-microphone`
- Configure: 16kHz, mono, 16-bit PCM
- Pipe microphone stream to whisper stdin
- Parse stdout for transcription chunks

**Success:** Audio flows mic → whisper → transcription output.

### Day 8-9: Wake Word Detection

**Implementation:**
- Buffer transcription chunks
- Detect "listen" keyword (case-insensitive)
- Activate full recording mode on detection
- Initialize silence timer

**Success:** Wake word triggers active recording.

### Day 10: VAD & Silence Detection

**Implementation:**
- 1.5 second silence timeout
- Buffer management during active recording
- Finalization logic on silence
- Reset state after completion

**Success:** Silence triggers transcription finalization.

---

## Phase 3.3: Integration (Days 11-14)

### Day 11: IPC Handlers

**Implementation:**
- `src/main/handlers/stt.handlers.ts`: Main process handlers
- `src/preload/api/stt.api.ts`: Preload API surface
- IPC channels: `stt:start`, `stt:stop`, `stt:toggle`, `stt:status`
- Events: `stt:listening`, `stt:result`

**Success:** Renderer controls STT, receives events.

### Day 12: Routing Logic

**Priority System:**
1. Discord voice channel (if connected)
2. Active project session
3. General Toji prompt (fallback)

**Success:** Transcriptions route to correct destination.

### Day 13-14: UI & Testing

**Components:**
- `useSTT()` hook with state management
- `STTButton` component with visual feedback
- Hotkey registration (Ctrl+Shift+L)
- Status display in header

**Success:** UI functional, hotkey works, visual feedback clear.

---

## Testing Checklist

### Automated Tests
- STT service start/stop
- Wake word detection
- Silence detection and finalization
- Routing logic (all three priorities)
- IPC communication

### Manual Testing
- [ ] Button toggles mic activation
- [ ] Transcription appears in logs
- [ ] Silence triggers finalization
- [ ] Discord routing works
- [ ] Project routing works
- [ ] Hotkey functions correctly
- [ ] Cross-platform compatibility (Win/Mac/Linux)

---

## Deployment

### Packaging Requirements
- Bundle `base.en` model (~142MB)
- Bundle Silero VAD model (~1MB)
- Include `whisper-stream` binaries (all platforms)
- Configure `electron-builder.yml` extraResources
- Document microphone permissions

### electron-builder.yml
```yaml
extraResources:
  - from: 'resources/whisper/bin'
    to: 'whisper/bin'
  - from: 'resources/whisper/models'
    to: 'whisper/models'
    filter: ['*.bin']
```

---

## Success Metrics

### Performance
- Time to first chunk: <300ms
- Real-time factor: <0.5x
- CPU idle: <5%, active: <40%
- Memory: <500MB

### Accuracy
- Wake word detection: >95%
- Transcription accuracy: >80%
- False positives: <5%

### UX
- Button response: <100ms
- Visual feedback: <50ms
- End-to-end latency: <3s

---

## Risk Mitigation

| Week | Risk | Mitigation |
|------|------|------------|
| 1 | Binary build fails | Test all platforms early |
| 2 | Audio capture issues | Test multiple libraries |
| 3 | Integration complexity | Keep IPC layer thin |

---

**Timeline: Plan for 2 weeks, expect 3.** 🎯
