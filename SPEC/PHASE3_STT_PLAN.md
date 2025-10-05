# Phase 3: Speech-to-Text (STT) System Implementation Plan

## Executive Summary
Implement real-time Speech-to-Text using local Whisper models for voice interaction with Toji. Users activate with wake word "listen", speak their message, and have it transcribed to active project context.

## Architecture: whisper.cpp + Electron

**Recommended:** whisper.cpp (https://github.com/ggml-org/whisper.cpp)
- High-performance C/C++ implementation
- Real-time streaming with VAD (Silero-VAD)
- Cross-platform, bundleable binary
- Model: `base.en` (142MB, good balance)

### System Flow
```
Renderer (Chakra UI) → IPC → Main Process (STT Service)
  ├─ Microphone capture (node-microphone)
  ├─ Wake word detection ("listen")
  ├─ Audio buffering & VAD
  └─ Whisper.cpp process → Transcription → Project/Discord
```

---

## Implementation Phases

### Phase 3.1: Whisper Setup
**Goal:** Get whisper.cpp running with real-time audio.

**Tasks:**
1. Build whisper.cpp: `cmake -B build -DWHISPER_SDL2=ON && cmake --build build -j --config Release`
2. Download model: `sh ./models/download-ggml-model.sh base.en`
3. Test streaming: `./build/bin/whisper-stream -m ./models/ggml-base.en.bin -t 8 --step 500 --length 5000`
4. Bundle: Copy binary to `resources/whisper/`, models to `resources/whisper/models/`
5. Update `electron-builder.yml` extraResources
6. Create `src/main/services/stt-service.ts` with binary path resolution

**Success:** Binary builds, bundles, and spawns from Electron.

---

### Phase 3.2: Audio Capture & Wake Word
**Goal:** Capture audio, detect "listen" wake word, determine end of speech.

**Tasks:**
1. **Microphone:** Install `node-microphone`, capture audio stream
2. **Wake Word:** Use whisper streaming to detect "listen" keyword (or button/hotkey for lower power)
3. **VAD Setup:** Download Silero VAD, configure: `--vad-threshold 0.5 --vad-min-silence-duration-ms 1000 --vad-min-speech-duration-ms 250`
4. **Silence Detection:** Implement timeout (1.5s silence = done speaking)

```typescript
class STTService {
  onTranscriptionChunk(text: string) {
    clearTimeout(this.silenceTimeout);
    this.silenceTimeout = setTimeout(() => this.finalizeTranscription(), 1500);
  }
  async finalizeTranscription() {
    const transcript = await this.processAudioBuffer();
    this.sendToActiveProject(transcript);
  }
}
```

**Success:** Audio captured, wake word detected, VAD works, silence triggers finalization.

---

### Phase 3.3: Integration with Projects & Discord
**Goal:** Send transcribed text to correct destination (active project, Discord, or Toji MCP).

**Tasks:**

1. **IPC Handlers:** Create `src/main/handlers/stt.handlers.ts`
```typescript
ipcMain.handle('stt:start-listening', async () => sttService.startListening());
ipcMain.handle('stt:stop-listening', async () => sttService.stopListening());
```

2. **Context Resolution:** Determine active destination
```typescript
async sendTranscription(text: string) {
  const activeProject = this.configProvider.getActiveProject();
  if (activeProject) {
    await this.tojiService.sendMessage(activeProject.id, text);
  }
  if (this.discordService.isVoiceActive()) {
    const channel = this.discordService.getActiveVoiceChannel();
    await this.discordService.sendMessage(channel.id, text);
  }
}
```

3. **UI Integration:** Create `src/renderer/src/components/STTControl.tsx`
```typescript
export const STTControl: React.FC = () => {
  const { isListening, transcript, startListening, stopListening } = useSTT();
  return (
    <ActionButton
      variant={isListening ? 'danger' : 'primary'}
      onClick={isListening ? stopListening : startListening}
    >
      {isListening ? '🎤 Listening...' : '🎤 Press to Speak'}
    </ActionButton>
  );
};
```

4. **Hotkey:** Register `Ctrl+Shift+L` to toggle listening

**Success:** Transcription sent to active project, Discord channel, UI shows status, hotkey works.

---

## Technical Specifications

### Audio Format
- Sample Rate: 16kHz, Mono, 16-bit PCM

### Whisper Models
| Model | Size | RAM | Speed | Use Case |
|-------|------|-----|-------|----------|
| tiny.en | 75MB | ~1GB | ~10x | Testing |
| base.en | 142MB | ~1GB | ~7x | **Recommended** |
| small.en | 466MB | ~2GB | ~4x | Better accuracy |
| medium.en | 1.5GB | ~5GB | ~2x | Desktop only |

### Performance Targets
- Time to First Chunk: <300ms
- Real-time Factor: <0.5x
- Wake Word Detection: <500ms
- End-of-Speech Detection: 1-2s silence

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
    "autoSendTo": "active-project"
  }
}
```

---

## Error Handling

1. **Microphone Permission Denied:** Prompt user to enable in system settings
2. **Whisper Binary Missing:** Download on first use
3. **Model Not Downloaded:** Auto-download base.en (~142MB)
4. **No Active Project:** Fallback to general Toji prompt
5. **Discord Not Connected:** Fallback to last active channel

---

## Deployment

### Binary Bundling
```yaml
# electron-builder.yml
extraResources:
  - from: 'resources/whisper'
    to: 'whisper'
    filter: ['**/*']
```

### Model Strategy
Bundle `base.en` by default (142MB), allow user to download larger models if needed.

---

## Timeline
| Phase | Tasks | Time |
|-------|-------|------|
| 3.1: Whisper Setup | Build, bundle, test | 2-3 days |
| 3.2: Audio Capture | Microphone, VAD, wake word | 3-4 days |
| 3.3: Integration | IPC, routing, UI | 2-3 days |
| **Total** | | **7-10 days** |

---

## Resources
- whisper.cpp: https://github.com/ggml-org/whisper.cpp
- Streaming: https://github.com/ggml-org/whisper.cpp/tree/master/examples/stream
- VAD: https://github.com/ggml-org/whisper.cpp#voice-activity-detection-vad
- node-microphone: https://www.npmjs.com/package/node-microphone
