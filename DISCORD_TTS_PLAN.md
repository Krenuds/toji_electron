# Discord TTS/STT Integration Plan

## Selected Approach: Docker-based toji-services

### Architecture

```
[Electron Main Process]
         |
         v
[DockerServiceManager] --> [docker-compose]
         |                        |
         v                        v
[TTSService] -----HTTP----> [Piper:9001]
[STTService] -----HTTP----> [Whisper:9000]
         |
         v
[VoiceModule] --> Discord Voice Connection
```

## Phase 1: Docker Integration

### 1.1 Bundle Docker Compose Files

- [ ] Copy toji-services docker-compose.yml to app resources
- [ ] Create `resources/docker-services/` directory structure
- [ ] Add Dockerfiles for whisper and piper services
- [ ] Create model download scripts

### 1.2 Docker Service Manager

Create `src/main/services/docker-service-manager.ts`:

```typescript
class DockerServiceManager {
  async checkDockerInstalled(): Promise<boolean>
  async startServices(): Promise<void>
  async stopServices(): Promise<void>
  async getServiceHealth(): Promise<HealthStatus>
  async pullImages(): Promise<void>
}
```

### 1.3 HTTP TTS Client

Update `src/main/services/tts-service.ts`:

```typescript
class TTSService {
  private useDocker: boolean
  private piperUrl = 'http://localhost:9001'

  async textToSpeech(text: string, voice?: string): Promise<Buffer> {
    if (this.useDocker) {
      return this.piperTTS(text, voice)
    }
    return this.openAITTS(text) // Fallback
  }

  private async piperTTS(text: string, voice?: string): Promise<Buffer> {
    const response = await fetch(`${this.piperUrl}/tts`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ text, voice })
    })
    return Buffer.from(await response.arrayBuffer())
  }
}
```

## Phase 2: STT Integration

### 2.1 Audio Capture from Discord

Update `src/plugins/discord/voice/VoiceModule.ts`:

```typescript
class VoiceModule {
  async startListening(sessionId: string): Promise<void> {
    // Subscribe to audio from Discord voice connection
    const receiver = this.connection.receiver

    receiver.speaking.on('start', (userId) => {
      const audioStream = receiver.subscribe(userId, {
        end: { behavior: EndBehaviorType.AfterSilence, duration: 500 }
      })

      // Convert Opus -> PCM -> WAV
      const pcmStream = new prism.opus.Decoder({ rate: 48000, channels: 2 })
      audioStream.pipe(pcmStream)

      // Collect audio chunks
      const chunks: Buffer[] = []
      pcmStream.on('data', (chunk) => chunks.push(chunk))
      pcmStream.on('end', () => this.transcribeAudio(chunks))
    })
  }

  private async transcribeAudio(audioChunks: Buffer[]): Promise<void> {
    const wavBuffer = this.createWAVBuffer(audioChunks)
    const text = await this.sttService.transcribe(wavBuffer)
    this.emit('transcription', { text })
  }
}
```

### 2.2 Whisper HTTP Client

Create `src/main/services/stt-service.ts`:

```typescript
class STTService {
  private whisperUrl = 'http://localhost:9000'

  async transcribe(audioBuffer: Buffer): Promise<string> {
    const formData = new FormData()
    formData.append('audio_file', new Blob([audioBuffer]), 'audio.wav')
    formData.append('output', 'txt')
    formData.append('language', 'en')

    const response = await fetch(`${this.whisperUrl}/asr`, {
      method: 'POST',
      body: formData
    })

    const result = await response.json()
    return result.text
  }
}
```

## Phase 3: Packaging

### 3.1 Docker Desktop Dependency

- [ ] Add installer check for Docker Desktop
- [ ] Show setup instructions if not installed
- [ ] Provide download link: https://www.docker.com/products/docker-desktop

### 3.2 First-Run Setup

```typescript
// On app first launch
app.on('ready', async () => {
  const dockerManager = new DockerServiceManager()

  if (!(await dockerManager.checkDockerInstalled())) {
    // Show dialog: "Docker required for TTS/STT"
    // Option to continue without voice features
    return
  }

  // Pull images in background
  await dockerManager.pullImages()

  // Start services
  await dockerManager.startServices()
})
```

### 3.3 Resource Files

```
resources/
  docker-services/
    docker-compose.yml
    whisper-service/
      Dockerfile
      requirements.txt
      service.py
      config.py
      logger.py
    piper-service/
      Dockerfile
      requirements.txt
      service.py
      config.py
```

## Phase 4: Fallback Strategy

### 4.1 Graceful Degradation

```typescript
enum TTSMode {
  DOCKER_PIPER, // Best quality, requires Docker
  OPENAI_API, // Good quality, requires API key
  BROWSER_TTS, // Basic quality, always available
  NONE
}

class TTSService {
  private mode: TTSMode

  async initialize(): Promise<void> {
    if (await this.checkDockerServices()) {
      this.mode = TTSMode.DOCKER_PIPER
    } else if (this.apiKey) {
      this.mode = TTSMode.OPENAI_API
    } else {
      this.mode = TTSMode.BROWSER_TTS
      // Use electron's speech synthesis
    }
  }
}
```

## Alternative: Pure Node.js Approach

If Docker is too heavy:

### Option A: ONNX Runtime

```typescript
import * as ort from 'onnxruntime-node'

// Use Whisper ONNX models
const session = await ort.InferenceSession.create('./models/whisper-small.onnx')
```

### Option B: @huggingface/transformers

```typescript
import { pipeline } from '@huggingface/transformers'

const transcriber = await pipeline('automatic-speech-recognition', 'Xenova/whisper-tiny.en')
```

### Option C: External Services Only

- ElevenLabs for TTS (best quality)
- Deepgram for STT (fastest)
- Azure Speech Services (balanced)

## Decision Points

1. **Docker acceptable?**
   - YES → Use toji-services (RECOMMENDED)
   - NO → Go with Option B or C

2. **GPU required?**
   - YES → Docker + GPU passthrough
   - NO → CPU-only Docker or ONNX

3. **Distribution size concern?**
   - YES → External APIs + fallback
   - NO → Bundle everything

## Next Steps

1. Prototype DockerServiceManager
2. Test health checks and startup
3. Implement HTTP clients
4. Add UI for service status
5. Package with electron-builder
6. Test on clean Windows install

## Estimated Effort

- **Docker integration**: 2-3 days
- **Audio pipeline**: 2-3 days
- **Testing + polish**: 2 days
- **Total**: ~1 week

## Success Metrics

✅ Voice commands transcribed in <2s
✅ TTS response latency <500ms
✅ Works without internet (local processing)
✅ Graceful fallback when Docker unavailable
✅ Simple user setup experience
