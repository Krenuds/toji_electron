# Phase 3: Speech-to-Text - Documentation Index

## Quick Start

👉 **[PHASE3_STT_QUICKSTART.md](./PHASE3_STT_QUICKSTART.md)** - Get whisper.cpp running locally in 5 minutes

---

## Core Documents

### 📋 [PHASE3_STT_SUMMARY.md](./PHASE3_STT_SUMMARY.md)
**Read this first!** High-level overview: what we're building, why whisper.cpp, architecture, 3 phases, decisions, success criteria.

### 🔍 [PHASE3_STT_OPTIONS.md](./PHASE3_STT_OPTIONS.md)
Quick comparison of STT technologies (whisper.cpp vs alternatives) with pros/cons.

### 📘 [PHASE3_STT_PLAN.md](./PHASE3_STT_PLAN.md)
**Most detailed.** Full implementation plan: architecture, specifications, audio formats, models, config, error handling, testing, deployment.

### 🗺️ [PHASE3_STT_ROADMAP.md](./PHASE3_STT_ROADMAP.md)
Day-by-day timeline (3 weeks): build setup, audio capture, integration, checklists.

### 🎯 [PHASE3_STT_DECISIONS.md](./PHASE3_STT_DECISIONS.md)
Decision matrices: wake word, models, audio capture, routing, UI, hotkeys, VAD, deployment, config schema.

---

## Quick Reference

### Technology Stack
```text
whisper.cpp (C++) → node-microphone → STTService (TS) → IPC → React Hooks + UI → Project/Discord
```

### Key Files
```text
src/main/services/stt-service.ts       ← Core STT logic
src/main/handlers/stt.handlers.ts      ← IPC handlers
src/preload/api/stt.api.ts             ← IPC bridge
src/renderer/src/hooks/useSTT.ts       ← React hook
src/renderer/src/components/STTButton.tsx ← UI component
resources/whisper/bin/whisper-stream   ← Binary
resources/whisper/models/ggml-base.en.bin ← Model (~142MB)
```

### Models
- **Production:** base.en (142MB, best balance)
- **Testing:** tiny.en (75MB, fast)
- **Power Users:** small.en (466MB, better accuracy)

### Build Commands
```bash
cmake -B build -DWHISPER_SDL2=ON && cmake --build build -j --config Release
sh ./models/download-ggml-model.sh base.en
./build/bin/whisper-stream -m ./models/ggml-base.en.bin --vad --vad-model ./models/ggml-silero-v5.1.2.bin
```

---

## Implementation Phases

### Phase 3.1: Whisper Setup (2-3 days)
**Goal:** Build and bundle whisper.cpp  
**Docs:** [ROADMAP Days 1-5](./PHASE3_STT_ROADMAP.md), [QUICKSTART](./PHASE3_STT_QUICKSTART.md)  
**Tasks:** Build whisper.cpp, download models, bundle with Electron, create service stub  
**Success:** Binary runs, spawns from Node.js

### Phase 3.2: Audio Capture (3-4 days)
**Goal:** Capture audio and detect speech boundaries  
**Docs:** [ROADMAP Days 6-10](./PHASE3_STT_ROADMAP.md), [DECISIONS Audio](./PHASE3_STT_DECISIONS.md)  
**Tasks:** Microphone capture, wake word detection, VAD integration, silence detection  
**Success:** Audio captured, wake word works, silence ends transcription

### Phase 3.3: Integration (2-3 days)
**Goal:** Route transcriptions and build UI  
**Docs:** [ROADMAP Days 11-14](./PHASE3_STT_ROADMAP.md), [DECISIONS UI](./PHASE3_STT_DECISIONS.md)  
**Tasks:** IPC handlers, routing logic (Project/Discord), UI components, hotkey registration  
**Success:** End-to-end voice input works

---

## Common Questions

**Q: Why not OpenAI's API?**  
A: Privacy concerns, requires internet, costs money, no real-time streaming.

**Q: Why whisper.cpp over Python?**  
A: Faster (C++), real-time streaming, easier Electron bundling.

**Q: Always-on wake word?**  
A: No, starting with button/hotkey. Always-on is optional later.

**Q: Speaker diarization?**  
A: Phase 4+. whisper.cpp supports tinydiarize, but not MVP.

**Q: Download size?**  
A: ~142MB model + ~10MB binary = ~200MB total app increase.

**Q: Languages?**  
A: English-only initially (base.en). Multilingual models available later.

**Q: Offline support?**  
A: Yes! 100% local processing.

---

## Prerequisites

### Development
- Node.js 18+, CMake 3.15+, C++ compiler (MSVC/GCC/Clang), SDL2, FFmpeg

### Runtime
- Microphone access, ~500MB RAM, ~1GB disk space, modern CPU

---

## Timeline

```text
Week 1: Whisper Setup (Phase 3.1)    Days 1-5
Week 2: Audio Capture (Phase 3.2)    Days 6-10
Week 3: Integration (Phase 3.3)      Days 11-14
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

### Phase 4+
- ⏳ Always-on wake word detection
- ⏳ Custom wake words
- ⏳ Speaker diarization
- ⏳ Multi-language support
- ⏳ Transcription history

---

## Resources

### External
- [whisper.cpp GitHub](https://github.com/ggml-org/whisper.cpp)
- [Streaming example](https://github.com/ggml-org/whisper.cpp/tree/master/examples/stream)
- [Whisper models](https://huggingface.co/ggerganov/whisper.cpp)
- [node-microphone](https://www.npmjs.com/package/node-microphone)

### Internal
- [TTS Service](../src/main/services/tts-service.ts) - reference pattern
- [Discord Plugin](../src/plugins/discord/) - voice integration
- [Toji Tools](../src/main/toji/) - MCP tool examples

---

## Document Workflow

```text
New to project?
  → PHASE3_STT_SUMMARY.md → PHASE3_STT_OPTIONS.md → PHASE3_STT_QUICKSTART.md

Planning/Architecture?
  → PHASE3_STT_PLAN.md → PHASE3_STT_DECISIONS.md

Implementing?
  → PHASE3_STT_ROADMAP.md (day by day) + PHASE3_STT_PLAN.md (technical details)

Making choices?
  → PHASE3_STT_DECISIONS.md (decision matrices)
```

---

## Next Steps

### Today
1. ✅ Read [PHASE3_STT_SUMMARY.md](./PHASE3_STT_SUMMARY.md)
2. ✅ Review [PHASE3_STT_OPTIONS.md](./PHASE3_STT_OPTIONS.md)
3. 🎯 Run [PHASE3_STT_QUICKSTART.md](./PHASE3_STT_QUICKSTART.md)

### This Week: Complete Phase 3.1 (Whisper Setup), start Phase 3.2 (Audio Capture)
### Next Week: Complete Phase 3.2, start Phase 3.3 (Integration)
### Week After: Complete Phase 3.3, testing, deploy!

---

**Ready to start? Go to [PHASE3_STT_QUICKSTART.md](./PHASE3_STT_QUICKSTART.md)!** 🎤✨
