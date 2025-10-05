# STT Implementation Options - Quick Reference

## TL;DR Recommendation

**Use whisper.cpp** with the `stream` example for real-time audio processing.

---

## Option Comparison Matrix

| Feature | whisper.cpp | whisper-node | Python Whisper | OpenAI API |
|---------|-------------|--------------|----------------|------------|
| **Speed** | ⭐⭐⭐⭐⭐ | ⭐⭐⭐⭐ | ⭐⭐⭐ | ⭐⭐⭐⭐ |
| **Real-time Streaming** | ✅ Yes | ❌ No | ❌ No | ❌ No |
| **Offline/Local** | ✅ Yes | ✅ Yes | ✅ Yes | ❌ No |
| **Electron Bundle Size** | ~150MB | ~150MB | ~500MB+ | 0MB |
| **Setup Complexity** | Medium | Low | High | Very Low |
| **Maintenance** | Active | Stale | Active | N/A |
| **Cost** | Free | Free | Free | $$$ |
| **VAD Built-in** | ✅ Yes | ❌ No | ❌ No | ❌ No |
| **Cross-platform** | ✅ Yes | ✅ Yes | ⚠️ Limited | ✅ Yes |

---

## Option 1: whisper.cpp (RECOMMENDED)

**What is it?**
C++ port of OpenAI's Whisper with real-time streaming support.

**Pros:**

- Real-time streaming with `examples/stream`
- Built-in VAD (Voice Activity Detection)
- Fast CPU inference (including Apple Silicon)
- Can bundle as binary with Electron
- Active community (43.6k GitHub stars)

**Cons:**

- Need to build/bundle native binaries
- Requires ffmpeg
- Model files to download (~75MB - 1.5GB)

**Best For:**
Real-time "listen" activation with streaming transcription.

---

## Option 2: whisper-node

**What is it?**
Node.js wrapper around whisper.cpp.

**Pros:**

- Simple JavaScript API
- Good for file-based transcription

**Cons:**

- No real-time streaming
- Last updated 2 years ago
- Requires pre-recorded .wav files

**Best For:**
Transcribing saved audio files, not live voice.

---

## Option 3: Python Whisper + Bridge

**What is it?**
Official OpenAI Python implementation with Node bridge.

**Pros:**

- Official implementation
- Most accurate

**Cons:**

- Requires Python runtime
- No streaming
- Complex deployment
- Slower than C++ version

**Best For:**
When you already have Python infrastructure.

---

## Option 4: OpenAI API (TTS endpoint repurpose?)

**What is it?**
Cloud-based API (if they add STT).

**Pros:**

- Zero bundle size
- No local compute

**Cons:**

- Requires internet
- Costs money per request
- Privacy concerns (audio sent to OpenAI)
- Latency

**Best For:**
When local processing isn't feasible.

---

## Recommended Stack

### Core: whisper.cpp

```bash
# Build whisper.cpp
git clone https://github.com/ggml-org/whisper.cpp.git
cd whisper.cpp
cmake -B build -DWHISPER_SDL2=ON
cmake --build build -j --config Release

# Download model
sh ./models/download-ggml-model.sh base.en

# Test streaming
./build/bin/whisper-stream -m ./models/ggml-base.en.bin
```

### Audio Capture: node-microphone

```bash
npm install node-microphone
```

Simple, cross-platform microphone capture.

### Integration Approach

```typescript
// Spawn whisper.cpp process
const whisper = spawn('whisper-stream', [
  '-m', modelPath,
  '--vad',
  '--vad-threshold', '0.5'
]);

// Pipe audio from microphone
microphone.pipe(whisper.stdin);

// Read transcription
whisper.stdout.on('data', (chunk) => {
  const text = chunk.toString();
  handleTranscription(text);
});
```

---

## Next Steps

1. **Phase 3.1:** Build whisper.cpp locally and test streaming
2. **Phase 3.2:** Implement audio capture with wake word detection
3. **Phase 3.3:** Integrate with Toji projects and Discord

See `PHASE3_STT_PLAN.md` for detailed implementation plan.
