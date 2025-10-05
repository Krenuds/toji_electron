# Phase 3: STT Implementation Roadmap

## Visual Timeline

```text
Week 1: Whisper Setup        Week 2: Audio Capture      Week 3: Integration
─────────────────────────    ──────────────────────     ────────────────────
│                            │                          │
├─ Day 1-2: Build whisper   ├─ Day 6-7: Audio capture  ├─ Day 11: IPC setup
│  • Clone repo              │  • node-microphone       │  • Handlers
│  • Build binaries          │  • Test mic access       │  • API surface
│  • Download models          │  • Stream to whisper    │
│                            │                          ├─ Day 12: Routing
├─ Day 3-4: Electron bundle  ├─ Day 8-9: Wake word     │  • Project context
│  • Copy to resources/      │  • Parse output          │  • Discord voice
│  • electron-builder.yml    │  • Activation logic      │  • Fallbacks
│  • Test packaging          │  • Buffer management     │
│                            │                          ├─ Day 13-14: UI
├─ Day 5: Service stub       ├─ Day 10: VAD & silence  │  • Button component
│  • stt-service.ts          │  • Silero VAD setup      │  • Status display
│  • Process spawning        │  • Silence detection     │  • Hotkey setup
│  • Path resolution         │  • Finalization logic    │  • Testing
│                            │                          │
✓ Milestone: Binary runs     ✓ Milestone: Audio works  ✓ Milestone: E2E works
```

---

## Phase 3.1: Whisper Setup (Days 1-5)

### Day 1: Clone & Build

```bash
# Morning: Clone whisper.cpp
git clone https://github.com/ggml-org/whisper.cpp.git

# Afternoon: Build
cmake -B build -DWHISPER_SDL2=ON
cmake --build build -j --config Release

# Evening: Test locally
./build/bin/whisper-stream -m ./models/ggml-base.en.bin
```

**Success:** Real-time mic transcription works locally.

---

### Day 2: Models & Testing

```bash
# Morning: Download models
sh ./models/download-ggml-model.sh base.en
sh ./models/download-ggml-model.sh tiny.en

# Afternoon: Test VAD
./models/download-vad-model.sh silero-v5.1.2
./build/bin/whisper-stream --vad ...

# Evening: Benchmark performance
./build/bin/whisper-bench -m models/ggml-base.en.bin
```

**Success:** All models work, VAD tested, performance acceptable.

---

### Day 3-4: Electron Bundle

```text
Project structure:
resources/
  whisper/
    bin/
      whisper-stream (or .exe on Windows)
    models/
      ggml-base.en.bin
      ggml-silero-v5.1.2.bin
```

```yaml
# electron-builder.yml
extraResources:
  - from: 'resources/whisper'
    to: 'whisper'
```

```bash
# Test packaging
npm run build
npm run build:win  # or :mac, :linux
```

**Success:** Binary and models bundle correctly, accessible at runtime.

---

### Day 5: Service Stub

```typescript
// src/main/services/stt-service.ts
export class STTService {
  private whisperProcess: ChildProcess | null = null;
  private modelPath: string;
  private binaryPath: string;

  constructor(config: ConfigProvider) {
    this.binaryPath = this.resolveWhisperBinary();
    this.modelPath = this.resolveModel('base.en');
  }

  async startListening(): Promise<void> {
    // Spawn whisper-stream
    // Pipe audio
    // Parse output
  }

  async stopListening(): Promise<void> {
    // Kill process
    // Clear buffers
  }
}
```

**Success:** Service spawns process, can start/stop.

---

## Phase 3.2: Audio Capture (Days 6-10)

### Day 6-7: Microphone Capture

```bash
npm install node-microphone
```

```typescript
import { spawn } from 'child_process';
import mic from 'node-microphone';

const microphone = mic({
  rate: 16000,      // 16kHz required by Whisper
  channels: 1,       // Mono
  bitwidth: 16,      // 16-bit PCM
  encoding: 'signed-integer'
});

const whisper = spawn(whisperBinaryPath, [
  '-m', modelPath,
  '--vad',
  '-'  // Read from stdin
]);

// Pipe audio to whisper
microphone.startRecording();
microphone.pipe(whisper.stdin);

// Read transcription
whisper.stdout.on('data', (chunk) => {
  console.log('Transcription:', chunk.toString());
});
```

**Success:** Audio flows from mic → whisper → transcription output.

---

### Day 8-9: Wake Word Detection

```typescript
class STTService {
  private isActivelyListening = false;

  onTranscriptionChunk(text: string) {
    if (!this.isActivelyListening && text.toLowerCase().includes('listen')) {
      this.activateFullRecording();
      log('🎤 Wake word detected! Now recording...');
    }
  }

  activateFullRecording() {
    this.isActivelyListening = true;
    this.audioBuffer = [];
    this.startSilenceTimer();
  }
}
```

**Success:** Saying "listen" activates recording.

---

### Day 10: VAD & Silence Detection

```typescript
class STTService {
  private silenceTimeout: NodeJS.Timeout | null = null;
  private audioBuffer: Buffer[] = [];

  onTranscriptionChunk(text: string) {
    if (!this.isActivelyListening) return;

    // Add to buffer
    this.audioBuffer.push(Buffer.from(text));

    // Reset silence timer
    if (this.silenceTimeout) {
      clearTimeout(this.silenceTimeout);
    }

    // Set new silence timer
    this.silenceTimeout = setTimeout(() => {
      this.finalizeTranscription();
    }, 1500); // 1.5 seconds
  }

  async finalizeTranscription() {
    const fullText = this.audioBuffer.join(' ');
    log('✅ Transcription complete:', fullText);

    await this.sendToDestination(fullText);
    this.reset();
  }
}
```

**Success:** 1.5s of silence triggers finalization.

---

## Phase 3.3: Integration (Days 11-14)

### Day 11: IPC Handlers

```typescript
// src/main/handlers/stt.handlers.ts
export function setupSTTHandlers(sttService: STTService) {
  ipcMain.handle('stt:start', () => sttService.startListening());
  ipcMain.handle('stt:stop', () => sttService.stopListening());
  ipcMain.handle('stt:toggle', () => sttService.toggle());
  ipcMain.handle('stt:status', () => sttService.getStatus());

  // Events from main → renderer
  sttService.on('listening', () => {
    BrowserWindow.getAllWindows()[0]?.webContents.send('stt:listening');
  });

  sttService.on('transcription', (text: string) => {
    BrowserWindow.getAllWindows()[0]?.webContents.send('stt:result', text);
  });
}
```

```typescript
// src/preload/api/stt.api.ts
export const sttAPI = {
  start: () => ipcRenderer.invoke('stt:start'),
  stop: () => ipcRenderer.invoke('stt:stop'),
  toggle: () => ipcRenderer.invoke('stt:toggle'),
  onListening: (cb: () => void) => ipcRenderer.on('stt:listening', cb),
  onResult: (cb: (text: string) => void) => ipcRenderer.on('stt:result', (_, text) => cb(text))
};
```

**Success:** Renderer can control STT, receives events.

---

### Day 12: Routing Logic

```typescript
class STTService {
  async sendToDestination(text: string) {
    // Priority 1: Discord voice
    if (this.discordService.isVoiceConnected()) {
      const channelId = this.discordService.getCurrentVoiceChannelId();
      await this.discordService.sendMessage(channelId, text);
      log('📤 Sent to Discord voice channel');
      return;
    }

    // Priority 2: Active project
    const activeProject = this.configProvider.getActiveProject();
    if (activeProject) {
      await this.tojiService.sendMessage(activeProject.id, text);
      log('📤 Sent to active project:', activeProject.name);
      return;
    }

    // Priority 3: General prompt
    await this.tojiService.sendGeneralPrompt(text);
    log('📤 Sent to general Toji prompt');
  }
}
```

**Success:** Transcriptions route to correct destination.

---

### Day 13-14: UI Implementation

```typescript
// src/renderer/src/hooks/useSTT.ts
export const useSTT = () => {
  const [isListening, setIsListening] = useState(false);
  const [transcript, setTranscript] = useState<string>('');

  useEffect(() => {
    window.api.stt.onListening(() => setIsListening(true));
    window.api.stt.onStopped(() => setIsListening(false));
    window.api.stt.onResult((text) => setTranscript(text));
  }, []);

  const toggle = async () => {
    await window.api.stt.toggle();
  };

  return { isListening, transcript, toggle };
};
```

```typescript
// src/renderer/src/components/STTButton.tsx
export const STTButton: React.FC = () => {
  const { isListening, transcript, toggle } = useSTT();

  return (
    <Tooltip label={isListening ? 'Stop listening' : 'Start voice input (Ctrl+Shift+L)'}>
      <IconButton
        aria-label="Voice input"
        icon={isListening ? <Icon as={FaMicrophoneSlash} /> : <Icon as={FaMicrophone} />}
        colorScheme={isListening ? 'red' : 'blue'}
        onClick={toggle}
        isLoading={isListening}
        loadingText="Listening..."
      />
      {transcript && (
        <Text fontSize="xs" color="gray.500" mt={1}>
          {transcript.substring(0, 50)}...
        </Text>
      )}
    </Tooltip>
  );
};
```

```typescript
// Add to Header.tsx
<HStack>
  <STTButton />
  <ProjectSelector />
  {/* other header items */}
</HStack>
```

**Success:** UI shows status, button works, hotkey registered.

---

## Testing Checklist

### Unit Tests (Day 14)

```typescript
describe('STTService', () => {
  it('should start listening on button press', async () => { });
  it('should detect wake word', () => { });
  it('should finalize on silence', () => { });
  it('should route to active project', async () => { });
  it('should fallback to general prompt', async () => { });
});
```

### Integration Tests (Day 14)

```typescript
describe('STT E2E', () => {
  it('should capture audio from microphone', async () => { });
  it('should spawn whisper process', async () => { });
  it('should parse transcription output', () => { });
  it('should send to Discord', async () => { });
});
```

### Manual Testing (Day 14)

- [ ] Click button → mic activates
- [ ] Speak → see transcription in logs
- [ ] 2s silence → transcription sent
- [ ] Discord voice active → message appears in channel
- [ ] No project → sent to general prompt
- [ ] Hotkey (Ctrl+Shift+L) → toggles listening
- [ ] Works on Windows
- [ ] Works on macOS
- [ ] Works on Linux

---

## Deployment Checklist

### Pre-Release

- [ ] Bundle base.en model (~142MB)
- [ ] Bundle Silero VAD model (~1MB)
- [ ] Include whisper-stream binaries for all platforms
- [ ] Test on Windows, macOS, Linux
- [ ] Document microphone permissions
- [ ] Add error recovery for missing binaries

### electron-builder.yml

```yaml
extraResources:
  - from: 'resources/whisper/bin'
    to: 'whisper/bin'
    filter: ['**/*']
  - from: 'resources/whisper/models'
    to: 'whisper/models'
    filter: ['*.bin']

win:
  target:
    - nsis
  extraFiles:
    - from: 'resources/whisper/bin/whisper-stream.exe'
      to: 'resources/whisper/bin'

mac:
  extraFiles:
    - from: 'resources/whisper/bin/whisper-stream'
      to: 'resources/whisper/bin'

linux:
  extraFiles:
    - from: 'resources/whisper/bin/whisper-stream'
      to: 'resources/whisper/bin'
```

---

## Success Metrics

### Performance

- ✅ Time to first transcription chunk: <300ms
- ✅ Real-time factor: <0.5x (faster than real-time)
- ✅ CPU usage (idle): <5%
- ✅ CPU usage (active): <40%
- ✅ Memory usage: <500MB

### Accuracy

- ✅ Wake word detection: >95% in quiet environment
- ✅ Transcription accuracy: >80% in normal conditions
- ✅ False positive rate: <5%

### UX

- ✅ Button response time: <100ms
- ✅ Visual feedback delay: <50ms
- ✅ End-to-end latency (speak → message): <3s

---

## Risk Mitigation Timeline

| Week | Risk | Mitigation Activity |
|------|------|---------------------|
| Week 1 | Binary build fails | Test on all platforms early |
| Week 2 | Audio capture issues | Test multiple libraries |
| Week 3 | Integration complexity | Keep IPC layer thin |

---

**Timeline is aggressive but achievable. Plan for 2 weeks, expect 3.** 🎯
