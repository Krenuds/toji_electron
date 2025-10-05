# Phase 3 STT Research Complete ✅

## What We Accomplished

I've completed a comprehensive investigation into Speech-to-Text (STT) implementation options for Toji and created a complete implementation plan.

## 📚 Documentation Created (6 files)

### 1. **PHASE3_STT_INDEX.md** ← START HERE
Navigation hub for all STT documentation with quick links and workflow guide.

### 2. **PHASE3_STT_SUMMARY.md**
Executive summary: what we're building, why, and how. **Read this first!**

### 3. **PHASE3_STT_OPTIONS.md**
Technology comparison: whisper.cpp vs whisper-node vs Python vs API. Quick reference matrix.

### 4. **PHASE3_STT_PLAN.md**
Detailed implementation plan (30 pages):
- Full architecture
- Technical specifications
- Error handling
- Testing strategy
- Deployment guide

### 5. **PHASE3_STT_DECISIONS.md**
Decision matrices for every technical choice:
- Wake word strategies
- Model selection
- Audio capture
- UI placement
- Performance tuning

### 6. **PHASE3_STT_ROADMAP.md**
Day-by-day implementation timeline with code examples:
- Week 1: Whisper setup
- Week 2: Audio capture
- Week 3: Integration

### 7. **PHASE3_STT_QUICKSTART.md**
Get whisper.cpp running locally in 5 minutes. Test it now!

---

## 🎯 Key Findings

### Recommended Solution: whisper.cpp

**Why?**
- ✅ Real-time streaming (`examples/stream`)
- ✅ Built-in VAD (Voice Activity Detection)
- ✅ Fast CPU inference (Apple Silicon optimized)
- ✅ Bundle as binary with Electron
- ✅ Cross-platform (Windows/macOS/Linux)
- ✅ Active community (43.6k GitHub stars)

**Rejected Alternatives:**
- ❌ whisper-node: No real-time streaming, stale (2 years old)
- ❌ Python Whisper: Deployment complexity, slower
- ❌ OpenAI API: Privacy concerns, costs money, requires internet

---

## 🏗️ Architecture Overview

```text
User speaks → Microphone → node-microphone
                              ↓
            whisper.cpp (streaming) ← VAD filter
                              ↓
            Real-time transcription
                              ↓
       Silence detection (1.5s pause)
                              ↓
            Routing logic:
            1. Discord voice channel (if connected)
            2. Active Toji project (if open)
            3. General prompt (fallback)
```

---

## 📋 Implementation Plan: 3 Phases

### Phase 3.1: Whisper Setup (2-3 days)
- Build whisper.cpp locally
- Download base.en model (~142MB)
- Bundle binary + model with Electron
- Create STTService stub

**Success:** Binary runs, spawns from Node.js

### Phase 3.2: Audio Capture (3-4 days)
- Implement microphone capture (node-microphone)
- Wake word detection ("listen")
- VAD integration (Silero VAD)
- Silence detection (1.5s = done speaking)

**Success:** Voice activated, auto-stops on silence

### Phase 3.3: Integration (2-3 days)
- IPC handlers (stt.handlers.ts)
- Routing logic (project/Discord/prompt)
- UI button + hotkey (Ctrl+Shift+L)
- Real-time status display

**Success:** End-to-end voice input works

**Total Timeline:** 7-10 days (2-3 weeks)

---

## 🎤 User Experience Flow

1. User presses button or Ctrl+Shift+L
2. Microphone activates (visual feedback)
3. User speaks their message
4. 1.5 seconds of silence detected
5. Transcription finalized
6. Message sent to:
   - Discord voice channel (if in voice)
   - Active project context
   - Or general Toji prompt

---

## 🔧 Technical Decisions Made

| Decision | Choice | Rationale |
|----------|--------|-----------|
| **STT Engine** | whisper.cpp | Real-time streaming, fast, bundleable |
| **Model** | base.en (142MB) | Best balance of size/speed/accuracy |
| **Audio Capture** | node-microphone | Simple API, cross-platform |
| **Activation** | Button/Hotkey | Better battery than always-on |
| **Hotkey** | Ctrl+Shift+L | Low conflict risk, ergonomic |
| **Silence Timeout** | 1500ms | Handles natural pauses |
| **VAD Threshold** | 0.5 | Balanced sensitivity |
| **UI Placement** | Header button | Always visible, clear status |

---

## 📦 What Gets Bundled

```text
resources/
  whisper/
    bin/
      whisper-stream (or .exe)   ~10MB
    models/
      ggml-base.en.bin           ~142MB
      ggml-silero-v5.1.2.bin     ~1MB

Total added to app: ~153MB
```

---

## ✅ Next Steps (Priority Order)

### 1. Test Locally (Today - 5 minutes)
```bash
# Follow PHASE3_STT_QUICKSTART.md
git clone https://github.com/ggml-org/whisper.cpp.git
cd whisper.cpp
cmake -B build -DWHISPER_SDL2=ON
cmake --build build -j --config Release
sh ./models/download-ggml-model.sh base.en
./build/bin/whisper-stream -m ./models/ggml-base.en.bin
```

**Speak into mic → see real-time transcription!**

### 2. Review Documentation (Today - 30 minutes)
- Read [PHASE3_STT_SUMMARY.md](./PHASE3_STT_SUMMARY.md)
- Scan [PHASE3_STT_ROADMAP.md](./PHASE3_STT_ROADMAP.md)
- Check [PHASE3_STT_DECISIONS.md](./PHASE3_STT_DECISIONS.md) for any decisions to adjust

### 3. Start Phase 3.1 (This Week)
Follow [PHASE3_STT_ROADMAP.md](./PHASE3_STT_ROADMAP.md) day-by-day:
- Day 1: Clone & build
- Day 2: Models & testing
- Days 3-4: Electron bundle
- Day 5: Service stub

---

## 🤔 Questions to Resolve

Before starting implementation, confirm these choices:

### 1. Wake Word Strategy
- [ ] **Recommended:** Button/Hotkey only (simpler, better battery)
- [ ] Alternative: Always-on "listen" detection (more magical, higher CPU)

### 2. Model to Bundle
- [ ] **Recommended:** base.en (142MB, good accuracy)
- [ ] Alternative: tiny.en (75MB, faster but less accurate)

### 3. Transcription Routing Priority
- [ ] **Recommended:** Discord voice → Active project → General prompt
- [ ] Alternative: User-configurable priority order

### 4. UI Placement
- [ ] **Recommended:** Header bar button (always visible)
- [ ] Alternative: Floating action button (less obtrusive)

### 5. Implementation Start Date
- [ ] Start this week (Phase 3.1)
- [ ] Wait until [other priority] is done

---

## 📊 Risk Assessment

| Risk | Likelihood | Impact | Mitigation |
|------|------------|--------|------------|
| Binary build fails | Medium | High | Pre-build for all platforms |
| High CPU usage | Low | Medium | Use tiny.en, add low-power mode |
| Mic permission issues | Low | Medium | Clear UI prompts |
| Poor accuracy | Low | Low | VAD filtering, allow retry |

---

## 💡 Future Enhancements (Phase 4+)

Not in MVP, but easy to add later:
- ⏳ Always-on wake word detection
- ⏳ Custom wake words
- ⏳ Speaker diarization (tinydiarize)
- ⏳ Multi-language support
- ⏳ Transcription history/search
- ⏳ Continuous conversation mode

---

## 🎓 What I Learned

### whisper.cpp is Perfect for This
- Built for real-time use cases
- Excellent community support
- Production-ready with 43.6k stars
- Already has streaming examples we can copy

### Node.js Integration is Straightforward
- Spawn whisper-stream as child process
- Pipe audio via stdin
- Parse stdout for transcriptions
- Same pattern as TTS service

### VAD is Critical
- Silero VAD model is built-in
- Filters out background noise
- Detects start/end of speech
- Makes transcriptions much cleaner

---

## 📖 Recommended Reading Order

1. **PHASE3_STT_INDEX.md** ← You are here
2. **PHASE3_STT_SUMMARY.md** ← High-level overview
3. **PHASE3_STT_QUICKSTART.md** ← Test locally RIGHT NOW
4. **PHASE3_STT_ROADMAP.md** ← Day-by-day plan
5. **PHASE3_STT_PLAN.md** ← Deep technical details (reference)
6. **PHASE3_STT_DECISIONS.md** ← Decision matrices (when making choices)

---

## 🚀 Ready to Start?

### Immediate Action (5 minutes)
👉 **Go to [PHASE3_STT_QUICKSTART.md](./PHASE3_STT_QUICKSTART.md)** and get whisper.cpp running locally.

Seeing it work will:
- Validate the approach
- Build confidence
- Show real-time transcription quality
- Help you make informed decisions

### After Testing
Come back and we can:
1. Adjust decisions if needed
2. Start Phase 3.1 implementation
3. Create STTService stub
4. Begin day-by-day roadmap

---

## 📁 All Files Created

```text
SPEC/
  PHASE3_STT_INDEX.md        ← Navigation hub
  PHASE3_STT_SUMMARY.md      ← Executive summary
  PHASE3_STT_OPTIONS.md      ← Tech comparison
  PHASE3_STT_PLAN.md         ← Full detailed plan
  PHASE3_STT_ROADMAP.md      ← Day-by-day timeline
  PHASE3_STT_DECISIONS.md    ← Decision matrices
  PHASE3_STT_QUICKSTART.md   ← Local setup guide
  PHASE3_RESEARCH_COMPLETE.md ← This file
```

---

**Research phase complete! Ready to build.** 🎤✨

What would you like to do next?
1. Test whisper.cpp locally (PHASE3_STT_QUICKSTART.md)
2. Review and adjust decisions (PHASE3_STT_DECISIONS.md)
3. Start Phase 3.1 implementation (PHASE3_STT_ROADMAP.md)
