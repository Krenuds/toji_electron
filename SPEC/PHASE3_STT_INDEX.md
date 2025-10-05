# Phase 3: Speech-to-Text - Documentation Index

## Quick Start (5 minutes)

**Want to see it working right now?**

👉 **[PHASE3_STT_QUICKSTART.md](./PHASE3_STT_QUICKSTART.md)** - Get whisper.cpp running locally in 5 minutes

---

## Overview Documents

### 📋 [PHASE3_STT_SUMMARY.md](./PHASE3_STT_SUMMARY.md)

**Read this first!** High-level overview of the entire STT system.

- What we're building
- Why whisper.cpp
- Architecture diagram
- 3 implementation phases
- Key decisions
- Success criteria

**Time to read:** 10 minutes

---

### 🔍 [PHASE3_STT_OPTIONS.md](./PHASE3_STT_OPTIONS.md)

Quick comparison of different STT technologies.

- whisper.cpp vs whisper-node vs Python
- Comparison matrix
- Pros/cons of each
- Why we chose whisper.cpp

**Time to read:** 5 minutes

---

## Implementation Documents

### 📘 [PHASE3_STT_PLAN.md](./PHASE3_STT_PLAN.md)

**Most detailed document.** Full implementation plan with all technical details.

- Research findings
- Architecture diagrams
- 3 phases with detailed tasks
- Technical specifications
- Audio format requirements
- Model selection
- Configuration schema
- Error handling
- Testing strategy
- Deployment considerations

**Time to read:** 30 minutes
**Use for:** Deep technical reference

---

### 🗺️ [PHASE3_STT_ROADMAP.md](./PHASE3_STT_ROADMAP.md)

Day-by-day implementation timeline with code examples.

- Visual timeline (3 weeks)
- Day 1: Clone & build
- Day 2: Models & testing
- Days 3-4: Electron bundle
- Day 5: Service stub
- Days 6-7: Audio capture
- Days 8-9: Wake word detection
- Day 10: VAD & silence
- Days 11-14: Integration & UI
- Testing checklist
- Deployment checklist

**Time to read:** 20 minutes
**Use for:** Daily implementation guide

---

### 🎯 [PHASE3_STT_DECISIONS.md](./PHASE3_STT_DECISIONS.md)

Decision matrices for all technical choices.

- Wake word strategy comparison
- Model selection matrix
- Audio capture library comparison
- Routing priority
- UI placement options
- Hotkey options
- VAD sensitivity tuning
- Silence detection timing
- Deployment strategy
- Error recovery
- Performance optimization
- Testing environments
- Full configuration schema

**Time to read:** 15 minutes
**Use for:** Making technical decisions

---

## Quick Reference

### Technology Stack

```text
whisper.cpp (C++)      ← STT engine
  ↓
node-microphone        ← Audio capture
  ↓
STTService (TS)        ← Main service
  ↓
IPC Handlers           ← Electron bridge
  ↓
React Hooks + UI       ← User interface
  ↓
Project/Discord        ← Integration
```

### Key Files to Create

```text
src/
  main/
    services/
      stt-service.ts              ← Core STT logic
    handlers/
      stt.handlers.ts             ← IPC handlers
  preload/
    api/
      stt.api.ts                  ← IPC bridge
  renderer/
    src/
      hooks/
        useSTT.ts                 ← React hook
      components/
        STTButton.tsx             ← UI component

resources/
  whisper/
    bin/
      whisper-stream              ← Binary
    models/
      ggml-base.en.bin            ← Model (~142MB)
      ggml-silero-v5.1.2.bin      ← VAD model (~1MB)
```

### Model Recommendations

| Environment | Model | Reason |
|-------------|-------|--------|
| **Production** | base.en | Best balance (142MB) |
| **Testing** | tiny.en | Fast, small (75MB) |
| **Desktop Power Users** | small.en | Better accuracy (466MB) |
| **Low-end Devices** | tiny.en | Lighter CPU usage |

### Commands Cheat Sheet

```bash
# Build whisper.cpp
cmake -B build -DWHISPER_SDL2=ON
cmake --build build -j --config Release

# Download model
sh ./models/download-ggml-model.sh base.en

# Test streaming
./build/bin/whisper-stream -m ./models/ggml-base.en.bin

# Download VAD
./models/download-vad-model.sh silero-v5.1.2

# Test with VAD
./build/bin/whisper-stream \
  -m ./models/ggml-base.en.bin \
  --vad \
  --vad-model ./models/ggml-silero-v5.1.2.bin
```

---

## Implementation Phases

### Phase 3.1: Whisper Setup (2-3 days)

**Goal:** Build and bundle whisper.cpp

📖 **Documents:**

- [PHASE3_STT_ROADMAP.md](./PHASE3_STT_ROADMAP.md) (Days 1-5)
- [PHASE3_STT_QUICKSTART.md](./PHASE3_STT_QUICKSTART.md)

**Tasks:**

- Build whisper.cpp locally
- Download models
- Bundle with Electron
- Create service stub

**Success:** Binary runs, spawns from Node.js

---

### Phase 3.2: Audio Capture (3-4 days)

**Goal:** Capture audio and detect speech boundaries

📖 **Documents:**

- [PHASE3_STT_ROADMAP.md](./PHASE3_STT_ROADMAP.md) (Days 6-10)
- [PHASE3_STT_DECISIONS.md](./PHASE3_STT_DECISIONS.md) (Audio Capture)

**Tasks:**

- Implement microphone capture
- Wake word detection
- VAD integration
- Silence detection

**Success:** Audio captured, wake word works, silence ends transcription

---

### Phase 3.3: Integration (2-3 days)

**Goal:** Route transcriptions and build UI

📖 **Documents:**

- [PHASE3_STT_ROADMAP.md](./PHASE3_STT_ROADMAP.md) (Days 11-14)
- [PHASE3_STT_DECISIONS.md](./PHASE3_STT_DECISIONS.md) (UI Placement)

**Tasks:**

- IPC handlers
- Routing logic (Project/Discord)
- UI components
- Hotkey registration

**Success:** End-to-end voice input works

---

## Common Questions

### Q: Why not use OpenAI's API?

**A:** Privacy concerns, requires internet, costs money, no real-time streaming.

### Q: Why whisper.cpp over Python Whisper?

**A:** Faster (C++), real-time streaming support, easier to bundle with Electron.

### Q: Do we need always-on wake word detection?

**A:** No, starting with button/hotkey activation. Always-on is optional later.

### Q: What about speaker diarization?

**A:** Phase 4+. whisper.cpp supports tinydiarize, but not MVP.

### Q: How big is the download?

**A:** ~142MB for base.en model + ~10MB binary. Total app size +~200MB.

### Q: What languages are supported?

**A:** English-only initially (base.en). Multilingual models available later.

### Q: Does it work offline?

**A:** Yes! 100% local processing. No internet required.

---

## Prerequisites

### Development

- Node.js 18+
- CMake 3.15+
- C++ compiler (MSVC/GCC/Clang)
- SDL2 library (for audio)
- FFmpeg (for audio conversion)

### Runtime

- Microphone access
- ~500MB RAM
- ~1GB disk space (for models)
- Modern CPU (whisper.cpp is CPU-optimized)

---

## Timeline Overview

```text
Week 1: Whisper Setup (Phase 3.1)
├─ Days 1-2: Build & test locally
├─ Days 3-4: Bundle with Electron
└─ Day 5: Service stub

Week 2: Audio Capture (Phase 3.2)
├─ Days 6-7: Microphone capture
├─ Days 8-9: Wake word detection
└─ Day 10: VAD & silence

Week 3: Integration (Phase 3.3)
├─ Day 11: IPC handlers
├─ Day 12: Routing logic
└─ Days 13-14: UI & testing

Total: 14 days (2-3 weeks)
```

---

## Success Criteria

### Must Have

- ✅ Real-time audio transcription
- ✅ Start/stop via button or hotkey
- ✅ Silence detection (auto-stop)
- ✅ Send to active project or Discord
- ✅ Works on Windows/macOS/Linux

### Nice to Have (Phase 4+)

- ⏳ Always-on wake word detection
- ⏳ Custom wake words
- ⏳ Speaker diarization
- ⏳ Multi-language support
- ⏳ Transcription history

---

## Resources

### External Links

- whisper.cpp GitHub: <https://github.com/ggml-org/whisper.cpp>
- Streaming example: <https://github.com/ggml-org/whisper.cpp/tree/master/examples/stream>
- Whisper models: <https://huggingface.co/ggerganov/whisper.cpp>
- node-microphone: <https://www.npmjs.com/package/node-microphone>

### Project Files

- [TTS Service](../src/main/services/tts-service.ts) (reference for similar pattern)
- [Discord Plugin](../src/plugins/discord/) (voice integration reference)
- [Toji Tools](../src/main/toji/) (MCP tool integration examples)

---

## Next Steps

### Today

1. ✅ Read [PHASE3_STT_SUMMARY.md](./PHASE3_STT_SUMMARY.md)
2. ✅ Review [PHASE3_STT_OPTIONS.md](./PHASE3_STT_OPTIONS.md)
3. 🎯 **Run [PHASE3_STT_QUICKSTART.md](./PHASE3_STT_QUICKSTART.md)** to test whisper.cpp locally

### This Week

1. Complete Phase 3.1 (Whisper Setup)
2. Start Phase 3.2 (Audio Capture)

### Next Week

1. Complete Phase 3.2
2. Start Phase 3.3 (Integration)

### Week After

1. Complete Phase 3.3
2. Testing & polish
3. Deploy!

---

## Document Workflow

```text
New to project?
  → Start: PHASE3_STT_SUMMARY.md
  → Then: PHASE3_STT_OPTIONS.md
  → Test: PHASE3_STT_QUICKSTART.md

Planning/Architecture?
  → Read: PHASE3_STT_PLAN.md
  → Decide: PHASE3_STT_DECISIONS.md

Implementing?
  → Follow: PHASE3_STT_ROADMAP.md (day by day)
  → Reference: PHASE3_STT_PLAN.md (technical details)

Making choices?
  → Use: PHASE3_STT_DECISIONS.md (decision matrices)
```

---

## Feedback & Updates

As you implement, update these documents with:

- Actual timelines vs estimates
- Technical issues encountered
- Solutions to problems
- Performance benchmarks
- Platform-specific gotchas

This keeps the docs useful for future reference!

---

**Ready to start? Go to [PHASE3_STT_QUICKSTART.md](./PHASE3_STT_QUICKSTART.md)!** 🎤✨
