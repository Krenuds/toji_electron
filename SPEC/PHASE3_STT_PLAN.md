# Phase 3: Speech-to-Text (STT) System Implementation Plan

## Executive Summary

Implement a real-time Speech-to-Text system using local Whisper models for voice interaction with Toji. Users will activate the system with the wake word "listen", speak their message, and have it transcribed and sent to the active project context.

---

## Research Findings: Local Whisper STT Options

### Option 1: whisper.cpp (C++ Implementation) ⭐ RECOMMENDED
**Repository:** https://github.com/ggml-org/whisper.cpp

**Pros:**
- ✅ High-performance C/C++ implementation without dependencies
- ✅ Excellent for CPU inference (including ARM/Apple Silicon)
- ✅ Real-time audio streaming support (`examples/stream`)
- ✅ Voice Activity Detection (VAD) built-in with Silero-VAD
- ✅ Cross-platform (Windows, macOS, Linux)
- ✅ Can be bundled as binary with Electron
- ✅ Multiple model sizes (tiny, base, small, medium, large, turbo)
- ✅ Low latency streaming mode with `stream` example
- ✅ Active development and large community (43.6k stars)
- ✅ Built-in examples for real-time microphone capture with SDL2

**Cons:**
- ⚠️ Requires building/bundling native binaries
- ⚠️ Need to download models (~39MB for tiny, ~1.5GB for large)
- ⚠️ Requires ffmpeg for audio processing

**Integration Approach:**
1. Bundle pre-built whisper.cpp binaries in `resources/` folder
2. Download/bundle Whisper models (recommend `base.en` for balance)
3. Use Node.js `child_process` to spawn whisper streaming server
4. Capture microphone audio via Electron's native APIs
5. Stream audio to whisper.cpp via stdin/IPC
6. Parse transcription output in real-time

---

### Option 2: whisper-node (Node.js Wrapper)
**Repository:** https://github.com/ariym/whisper-node
**NPM:** https://www.npmjs.com/package/whisper-node

**Pros:**
- ✅ JavaScript-friendly API
- ✅ Uses whisper.cpp under the hood
- ✅ Supports timestamp precision per word
- ✅ Multiple output formats (JSON, TXT, SRT, VTT)

**Cons:**
- ❌ Last published 2 years ago (maintenance concerns)
- ❌ No real-time streaming support (file-based only)
- ❌ Requires `.wav` files at 16kHz (needs conversion)
- ❌ Not suitable for live voice activation
- ❌ Limited community (1,715 weekly downloads)

**Verdict:** Not suitable for real-time "listen" activation use case.

---

### Option 3: Python Whisper with Node.js Bridge
**Repository:** https://github.com/openai/whisper

**Pros:**
- ✅ Official OpenAI implementation
- ✅ Well-documented and stable
- ✅ Excellent accuracy

**Cons:**
- ❌ Requires Python runtime (adds deployment complexity)
- ❌ Not designed for real-time streaming
- ❌ Slower than whisper.cpp
- ❌ More memory intensive
- ❌ Requires managing Python dependencies

**Verdict:** Not recommended due to deployment complexity and lack of real-time support.

---

## Recommended Architecture: whisper.cpp + Electron Native Audio

### System Components

```
┌─────────────────────────────────────────────────────────────┐
│                     Electron Renderer                        │
│  ┌──────────────────────────────────────────────────────┐   │
│  │ User Interface (Chakra UI)                           │   │
│  │  - Visual feedback during listening                  │   │
│  │  - Transcription display                             │   │
│  │  - "Listen" button / hotkey                          │   │
│  └────────────────────┬─────────────────────────────────┘   │
│                       │ IPC                                  │
└───────────────────────┼──────────────────────────────────────┘
                        │
┌───────────────────────┼──────────────────────────────────────┐
│                 Electron Main Process                        │
│                       │                                      │
│  ┌────────────────────┴──────────────────────────────────┐  │
│  │ STT Service (stt-service.ts)                          │  │
│  │  - Microphone capture (node-microphone or native)     │  │
│  │  - Wake word detection ("listen")                     │  │
│  │  - Audio buffering & VAD                              │  │
│  │  - Silence detection (end of speech)                  │  │
│  │  - Whisper.cpp process management                     │  │
│  └─────────────────┬─────────────────────────────────────┘  │
│                    │ spawn/stdio                             │
│  ┌─────────────────┴─────────────────────────────────────┐  │
│  │ whisper.cpp Binary (resources/whisper-stream)         │  │
│  │  - Real-time audio processing                         │  │
│  │  - Silero VAD integration                             │  │
│  │  - Transcription output                               │  │
│  └─────────────────┬─────────────────────────────────────┘  │
│                    │                                         │
│  ┌─────────────────┴─────────────────────────────────────┐  │
│  │ Project/Discord Integration                           │  │
│  │  - Send transcription to active project               │  │
│  │  - Send to Discord channel                            │  │
│  │  - Send to Toji MCP tools                             │  │
│  └───────────────────────────────────────────────────────┘  │
└─────────────────────────────────────────────────────────────┘
```

---

## Implementation Plan: 3 Phases

## Phase 3.1: Local Whisper STT Server Setup ⚡

**Goal:** Get whisper.cpp running locally with real-time audio capture.

### Tasks:
1. **Download & Build whisper.cpp**
   ```bash
   git clone https://github.com/ggml-org/whisper.cpp.git
   cd whisper.cpp
   cmake -B build -DWHISPER_SDL2=ON
   cmake --build build -j --config Release
   ```

2. **Download Whisper Models**
   ```bash
   # Base model (good balance, ~142MB)
   sh ./models/download-ggml-model.sh base.en

   # Optional: Tiny for testing (faster, less accurate, ~75MB)
   sh ./models/download-ggml-model.sh tiny.en
   ```

3. **Test Real-Time Streaming**
   ```bash
   # Test with microphone
   ./build/bin/whisper-stream -m ./models/ggml-base.en.bin -t 8 --step 500 --length 5000
   ```

4. **Bundle Binary with Electron**
   - Copy built binary to `resources/whisper/`
   - Copy models to `resources/whisper/models/`
   - Update `electron-builder.yml` to include these resources

5. **Create STT Service Stub**
   - Create `src/main/services/stt-service.ts`
   - Implement binary path resolution
   - Test spawning whisper.cpp process

### Success Metrics:
- ✅ whisper.cpp builds successfully
- ✅ Real-time microphone transcription works locally
- ✅ Binary and models bundle with Electron app
- ✅ Can spawn and communicate with whisper process

---

## Phase 3.2: Audio Capture & Wake Word Detection 🎤

**Goal:** Capture audio, detect "listen" wake word, and determine when user is done speaking.

### Tasks:

#### 1. Microphone Audio Capture
**Option A: node-microphone (Recommended)**
```bash
npm install node-microphone
```
- Simple API
- Cross-platform
- Returns audio stream

**Option B: Native Electron Audio (More Complex)**
```javascript
navigator.mediaDevices.getUserMedia({ audio: true })
```
- Requires renderer -> main IPC
- More control over audio format

#### 2. Wake Word Detection: "listen"
**Approach:**
- Use whisper.cpp streaming mode continuously in background
- Listen for "listen" keyword in transcription output
- On detection, start buffering full audio for main transcription

**Alternative (Low Power):**
- Only activate whisper on manual button press/hotkey
- Avoids continuous audio processing
- Better battery/CPU usage

#### 3. Voice Activity Detection (VAD)
```bash
# Download Silero VAD model
./models/download-vad-model.sh silero-v5.1.2

# Use with whisper
./build/bin/whisper-cli --vad \
  --vad-model ./models/ggml-silero-v5.1.2.bin \
  --vad-threshold 0.5 \
  --vad-min-silence-duration-ms 1000
```

**Configuration:**
- `--vad-threshold`: 0.5 (adjust for sensitivity)
- `--vad-min-silence-duration-ms`: 1000 (1 second silence = end of speech)
- `--vad-min-speech-duration-ms`: 250 (minimum 250ms to be considered speech)

#### 4. Silence Detection Logic
```typescript
class STTService {
  private silenceTimeout: NodeJS.Timeout | null = null;
  private isListening = false;
  private audioBuffer: Buffer[] = [];

  onTranscriptionChunk(text: string) {
    // Clear existing silence timer
    if (this.silenceTimeout) {
      clearTimeout(this.silenceTimeout);
    }

    // Set new silence timer
    this.silenceTimeout = setTimeout(() => {
      this.finalizeTranscription();
    }, 1500); // 1.5 seconds of silence = done speaking
  }

  async finalizeTranscription() {
    // Process buffered audio
    const fullTranscript = await this.processAudioBuffer();
    this.sendToActiveProject(fullTranscript);
    this.reset();
  }
}
```

### Success Metrics:
- ✅ Microphone audio captured in real-time
- ✅ "listen" wake word detection works reliably
- ✅ VAD detects start/end of speech
- ✅ 1-2 seconds of silence triggers finalization

---

## Phase 3.3: Integration with Projects & Discord 🔗

**Goal:** Send transcribed text to the correct destination (active project, Discord channel, or Toji MCP).

### Tasks:

#### 1. IPC Handler for STT
```typescript
// src/main/handlers/stt.handlers.ts
import { ipcMain } from 'electron';
import { STTService } from '../services/stt-service';

export function setupSTTHandlers(sttService: STTService) {
  ipcMain.handle('stt:start-listening', async () => {
    return sttService.startListening();
  });

  ipcMain.handle('stt:stop-listening', async () => {
    return sttService.stopListening();
  });

  ipcMain.on('stt:transcription-complete', (event, transcript: string) => {
    // Forward to active project/channel
  });
}
```

#### 2. Determine Active Context
```typescript
class STTService {
  async sendTranscription(text: string) {
    const activeProject = this.configProvider.getActiveProject();

    if (activeProject) {
      // Option 1: Send as message to project via Toji MCP
      await this.tojiService.sendMessage(activeProject.id, text);

      // Option 2: If Discord voice is active, send to Discord
      if (this.discordService.isVoiceActive()) {
        const channel = this.discordService.getActiveVoiceChannel();
        await this.discordService.sendMessage(channel.id, text);
      }
    } else {
      // Fallback: Send to general Toji prompt
      await this.tojiService.sendGeneralPrompt(text);
    }
  }
}
```

#### 3. Discord Voice Integration
```typescript
// If user is in Discord voice, send transcription to that channel
if (discordVoiceManager.isConnected()) {
  const channelId = discordVoiceManager.getCurrentChannelId();
  await discordClient.sendTextMessage(channelId, transcript);
}
```

#### 4. UI Integration
```typescript
// src/renderer/src/components/STTControl.tsx
import { useSTT } from '../hooks/useSTT';

export const STTControl: React.FC = () => {
  const { isListening, transcript, startListening, stopListening } = useSTT();

  return (
    <Box>
      <Button
        colorScheme={isListening ? 'red' : 'blue'}
        onClick={isListening ? stopListening : startListening}
      >
        {isListening ? '🎤 Listening...' : '🎤 Press to Speak'}
      </Button>

      {transcript && (
        <Text fontSize="sm" color="gray.600">
          {transcript}
        </Text>
      )}
    </Box>
  );
};
```

#### 5. Hotkey Support
```typescript
// Global hotkey: Ctrl+Shift+L to start listening
ipcMain.on('register-stt-hotkey', () => {
  globalShortcut.register('CommandOrControl+Shift+L', () => {
    sttService.toggleListening();
  });
});
```

### Success Metrics:
- ✅ Transcription sent to active project context
- ✅ Transcription sent to Discord channel if voice active
- ✅ UI shows real-time listening status
- ✅ Hotkey activates/deactivates listening

---

## Technical Specifications

### Audio Format Requirements
- **Sample Rate:** 16kHz (Whisper requirement)
- **Channels:** Mono
- **Bit Depth:** 16-bit PCM
- **Format:** WAV or PCM stream

### Whisper Model Selection
| Model | Size | RAM | Speed | Use Case |
|-------|------|-----|-------|----------|
| tiny.en | 75MB | ~1GB | ~10x | Testing, low-power devices |
| base.en | 142MB | ~1GB | ~7x | **Recommended for production** |
| small.en | 466MB | ~2GB | ~4x | Better accuracy, more resources |
| medium.en | 1.5GB | ~5GB | ~2x | High accuracy, desktop only |

**Recommendation:** Start with `base.en` for good balance.

### Performance Targets
- **Time to First Chunk:** <300ms
- **Real-time Factor:** <0.5x (process audio faster than real-time)
- **Wake Word Detection Latency:** <500ms
- **End-of-Speech Detection:** 1-2 seconds of silence

---

## Configuration Schema

```typescript
// opencode.json extension
{
  "stt": {
    "enabled": true,
    "wakeWord": "listen",
    "modelPath": "resources/whisper/models/ggml-base.en.bin",
    "binaryPath": "resources/whisper/whisper-stream",
    "vad": {
      "enabled": true,
      "threshold": 0.5,
      "minSilenceDurationMs": 1000,
      "minSpeechDurationMs": 250
    },
    "hotkey": "CommandOrControl+Shift+L",
    "autoSendTo": "active-project" // "active-project" | "discord" | "prompt"
  }
}
```

---

## Error Handling & Edge Cases

### 1. Microphone Permission Denied
```typescript
try {
  await sttService.startListening();
} catch (error) {
  if (error.message.includes('permission')) {
    showNotification('Microphone permission required. Please enable in system settings.');
  }
}
```

### 2. Whisper Binary Missing
```typescript
if (!fs.existsSync(whisperBinaryPath)) {
  log('❌ Whisper binary not found. Downloading...');
  await downloadWhisperBinary();
}
```

### 3. Model Not Downloaded
```typescript
if (!fs.existsSync(modelPath)) {
  log('⚠️ Whisper model not found. Downloading base.en (~142MB)...');
  await downloadWhisperModel('base.en');
}
```

### 4. No Active Project
```typescript
if (!activeProject) {
  // Fallback: Send to general Toji prompt
  await tojiService.sendGeneralPrompt(transcript);
}
```

### 5. Discord Voice Not Connected
```typescript
if (!discordVoiceManager.isConnected()) {
  // Fallback: Send as text message to last active channel
  await discordService.sendToLastActiveChannel(transcript);
}
```

---

## Testing Strategy

### Unit Tests
- Audio buffer management
- Silence detection logic
- Wake word parsing
- Context resolution (which project/channel)

### Integration Tests
- Whisper.cpp binary spawning
- Audio stream piping
- Transcription output parsing
- IPC communication

### Manual Testing Checklist
- [ ] Microphone captures audio
- [ ] "listen" wake word activates transcription
- [ ] 2 seconds of silence ends transcription
- [ ] Transcription sent to active project
- [ ] Transcription sent to Discord channel (if voice active)
- [ ] UI shows listening status
- [ ] Hotkey toggles listening
- [ ] Works on Windows/macOS/Linux
- [ ] Low CPU usage when idle
- [ ] Accurate transcription in noisy environments

---

## Deployment Considerations

### Binary Bundling
```yaml
# electron-builder.yml
extraResources:
  - from: 'resources/whisper'
    to: 'whisper'
    filter: ['**/*']
```

### Model Download Strategy
**Option 1: Bundle with App (Recommended for base.en)**
- Pros: No network required, instant activation
- Cons: Larger app size (~142MB extra)

**Option 2: Download on First Use**
- Pros: Smaller initial app size
- Cons: Requires network, first-run delay

**Recommendation:** Bundle `base.en` by default, allow user to download larger models if needed.

---

## Future Enhancements (Phase 4+)

### 1. Speaker Diarization
- Detect multiple speakers in same audio
- Tag transcriptions with speaker IDs
- Uses tinydiarize model

### 2. Custom Wake Words
- Allow user to configure custom wake word
- Use lightweight keyword spotting model

### 3. Continuous Conversation Mode
- Stay active after transcription
- Multi-turn voice conversations
- Auto-send responses via TTS

### 4. Language Detection
- Auto-detect language spoken
- Switch models dynamically
- Translate to English

### 5. Transcription History
- Store all voice inputs
- Search previous transcriptions
- Export to markdown

---

## Risks & Mitigations

| Risk | Impact | Mitigation |
|------|--------|------------|
| Whisper binary fails to build for some platforms | High | Provide pre-built binaries for all platforms |
| High CPU usage on low-end devices | Medium | Use tiny.en model, add "low power mode" |
| Wake word false positives | Low | Require button press instead, or tune VAD threshold |
| Microphone permission issues | Medium | Clear UI prompts, fallback to text input |
| Poor accuracy in noisy environments | Medium | Use VAD filtering, allow manual retry |

---

## Success Criteria

### Phase 3.1 Complete When:
- ✅ whisper.cpp builds and runs locally
- ✅ Real-time streaming works with microphone
- ✅ Binary bundles with Electron app

### Phase 3.2 Complete When:
- ✅ Audio capture from microphone works
- ✅ "listen" wake word activates transcription
- ✅ Silence detection ends transcription
- ✅ VAD filters out non-speech audio

### Phase 3.3 Complete When:
- ✅ Transcription sent to active project
- ✅ Transcription sent to Discord channel
- ✅ UI shows real-time status
- ✅ Hotkey works reliably
- ✅ All integration tests pass

---

## Timeline Estimate

| Phase | Tasks | Estimated Time |
|-------|-------|----------------|
| 3.1: Whisper Setup | Build, bundle, test | 2-3 days |
| 3.2: Audio Capture | Microphone, VAD, wake word | 3-4 days |
| 3.3: Integration | IPC, routing, UI | 2-3 days |
| **Total** | | **7-10 days** |

---

## Resources & Documentation

### Whisper.cpp
- GitHub: https://github.com/ggml-org/whisper.cpp
- Real-time Streaming: https://github.com/ggml-org/whisper.cpp/tree/master/examples/stream
- VAD Documentation: https://github.com/ggml-org/whisper.cpp#voice-activity-detection-vad

### Audio Capture
- node-microphone: https://www.npmjs.com/package/node-microphone
- Electron Audio: https://www.electronjs.org/docs/latest/api/media-recorder

### Voice Activity Detection
- Silero VAD: https://github.com/snakers4/silero-vad
- Integration: https://github.com/ggml-org/whisper.cpp#silero-vad

---

## Next Steps

1. **Review this plan** - Confirm approach and priorities
2. **Set up development environment** - Install dependencies
3. **Start Phase 3.1** - Build whisper.cpp locally
4. **Create STT service stub** - Scaffold code structure
5. **Implement audio capture** - Test microphone access
6. **Integrate with Toji** - Connect to existing project system

---

## Questions to Resolve

1. **Wake Word Strategy:**
   - Always-on listening with "listen" detection?
   - Or button/hotkey activation only?

2. **Model Size:**
   - Bundle base.en (142MB) by default?
   - Or start with tiny.en (75MB) for smaller app size?

3. **Target Destination Priority:**
   - Active project first?
   - Discord voice channel if connected?
   - User-configurable preference?

4. **Battery/Performance:**
   - Always-on VAD monitoring?
   - Or idle until manual activation?

5. **Transcription Display:**
   - Show real-time partial results?
   - Or only final transcription?

---

**Ready to implement! Let's discuss priorities and start Phase 3.1.** 🎤✨
