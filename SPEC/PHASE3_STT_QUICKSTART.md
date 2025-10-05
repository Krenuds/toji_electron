# STT Quick Start Guide

## Get whisper.cpp Running Locally (5 minutes)

### Step 1: Clone and Build

```bash
# Clone repo
git clone https://github.com/ggml-org/whisper.cpp.git
cd whisper.cpp

# Build with streaming support
cmake -B build -DWHISPER_SDL2=ON
cmake --build build -j --config Release
```

### Step 2: Download Model

```bash
# Fast, decent quality (~142MB)
sh ./models/download-ggml-model.sh base.en

# OR tiny for testing (~75MB, faster)
sh ./models/download-ggml-model.sh tiny.en
```

### Step 3: Test Real-Time Streaming

```bash
# Start microphone streaming
./build/bin/whisper-stream -m ./models/ggml-base.en.bin -t 4 --step 500 --length 5000
```

**Speak into your microphone** - you should see real-time transcription!

---

## Test Wake Word Detection

Speak the word "listen" and watch the output. The streaming mode will capture it in real-time.

### Parameters Explained

- `-m`: Model path
- `-t 4`: Use 4 CPU threads
- `--step 500`: Process every 500ms
- `--length 5000`: Use 5 seconds of audio context

---

## Test VAD (Voice Activity Detection)

```bash
# Download VAD model
./models/download-vad-model.sh silero-v5.1.2

# Run with VAD
./build/bin/whisper-stream \
  -m ./models/ggml-base.en.bin \
  --vad \
  --vad-model ./models/ggml-silero-v5.1.2.bin \
  --vad-threshold 0.5
```

**Try speaking with pauses** - VAD will filter out silence and only process speech.

---

## Key Parameters to Tune

### For Real-Time Feel

```bash
--step 500        # Process every 500ms (default 3000ms)
--length 5000     # 5s context window (default 10000ms)
-t 8              # More threads = faster (adjust to your CPU)
```

### For Accuracy

```bash
-m models/ggml-small.en.bin   # Larger model
--no-timestamps               # Faster decoding
--language en                 # Explicit language
```

### For Wake Word Detection

```bash
--vad                         # Enable VAD
--vad-threshold 0.5           # Sensitivity (0.0-1.0)
--vad-min-silence-duration-ms 1000  # 1s silence = end of speech
```

---

## Expected Output

```
whisper_init_from_file_with_params: loading model from './models/ggml-base.en.bin'
...
main: processing...

[00:00:00.000 --> 00:00:02.500]   Hello, can you hear me?
[00:00:02.500 --> 00:00:05.000]   This is a test of the whisper system.
[00:00:05.000 --> 00:00:07.500]   Listen to my voice.
```

---

## Troubleshooting

### Issue: "command not found: whisper-stream"

**Solution:** Build first with `cmake --build build -j --config Release`

### Issue: No microphone access

**Solution:** Grant microphone permissions in system settings

### Issue: SDL2 error

**Solution:** Install SDL2 library:

```bash
# macOS
brew install sdl2

# Ubuntu/Debian
sudo apt install libsdl2-dev

# Windows
# Download from https://www.libsdl.org/
```

### Issue: High CPU usage

**Solution:** Use smaller model (tiny.en) or reduce threads with `-t 2`

---

## Next: Integrate with Electron

Once whisper.cpp works locally, you're ready to integrate it into the Electron app!

See `PHASE3_STT_PLAN.md` for integration steps.

---

## Useful Commands

```bash
# List available models
ls models/ggml-*.bin

# Test with audio file instead of microphone
./build/bin/whisper-cli -m models/ggml-base.en.bin -f audio.wav

# Benchmark performance
./build/bin/whisper-bench -m models/ggml-base.en.bin

# Check version
./build/bin/whisper-cli --version
```

---

## Model Selection Guide

| Model | Size | RAM | Speed | Best For |
|-------|------|-----|-------|----------|
| tiny.en | 75MB | ~1GB | ~10x | Testing, low-end devices |
| **base.en** | **142MB** | **~1GB** | **~7x** | **Production (recommended)** |
| small.en | 466MB | ~2GB | ~4x | Better accuracy |
| medium.en | 1.5GB | ~5GB | ~2x | High accuracy, desktop only |

---

**That's it! You now have local STT running.** 🎤✨

Next step: Build the Electron integration service.
