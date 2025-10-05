# Path A Implementation: Docker Optional Voice Services

## Overview

Implement Docker-based voice services following the proven architecture from the Python Toji bot, adapted for Electron with graceful fallback when Docker is unavailable.

## Architecture Alignment

### Python Toji Pattern (Reference)
```
Discord Bot → HTTP Clients → Docker Services
              (stt_client)    (Whisper:9000)
              (tts_client)    (Piper:9001)
```

### Electron Toji Pattern (Our Implementation)
```
Electron Main → HTTP Clients → Docker Services
                (fetch/axios)   (Whisper:9000)
                                (Piper:9001)
```

**Key Insight:** The Python bot already uses HTTP clients to external Docker services. We're doing the same thing, just from Electron instead of Python.

---

## Implementation Steps

### Phase 5A: Production Packaging Setup (2 hours)

#### 5A.1: Update electron-builder.yml
Add Docker service files to packaged app:

```yaml
extraResources:
  - from: "resources/docker-services"
    to: "docker-services"
    filter:
      - "**/*"
      - "!**/logs"
      - "!**/tmp"
      - "!**/__pycache__"
      - "!**/*.pyc"
      - "!**/models/*.onnx"
      - "!**/models/*.bin"
```

**What this does:**
- Includes service code in packaged app
- Excludes runtime artifacts and downloaded models
- ~50KB overhead (Python files + Dockerfiles)

#### 5A.2: Update DockerServiceManager for Packaged Apps

Current code assumes dev paths. Need to handle both:

```typescript
import { app } from 'electron'

private getServicesPath(): string {
  if (app.isPackaged) {
    // Production: resources are in app.asar.unpacked or process.resourcesPath
    return join(process.resourcesPath, 'docker-services')
  } else {
    // Development: relative to source
    return join(__dirname, '..', '..', 'resources', 'docker-services')
  }
}
```

**Changes needed:**
1. Add `getServicesPath()` helper method
2. Update all path references in build/start methods
3. Test both dev and packaged modes

#### 5A.3: Build State Caching

Avoid rebuilding images on every app start:

```typescript
interface BuildState {
  imagesBuilt: boolean
  whisperImageId?: string
  piperImageId?: string
  lastBuildDate?: string
}

private async loadBuildState(): Promise<BuildState>
private async saveBuildState(state: BuildState): Promise<void>
```

**Storage location:**
- Windows: `%APPDATA%/toji3/docker-state.json`
- macOS: `~/Library/Application Support/toji3/docker-state.json`
- Linux: `~/.config/toji3/docker-state.json`

---

### Phase 5B: HTTP Client Services (1 hour)

Following Python's `stt_client.py` and `tts_client.py` pattern.

#### Create STT Service (`src/main/services/whisper-client.ts`)

```typescript
export interface TranscriptionResult {
  text: string
  error?: string
}

export class WhisperClient {
  constructor(private baseUrl: string = 'http://localhost:9000') {}

  async transcribe(audioData: Buffer): Promise<TranscriptionResult> {
    // POST /asr with audio file
    // Returns: { text: "..." }
  }

  async checkHealth(): Promise<boolean> {
    // GET /health
  }
}
```

#### Create TTS Service (`src/main/services/piper-client.ts`)

```typescript
export interface TTSRequest {
  text: string
  voice?: string
}

export class PiperClient {
  constructor(private baseUrl: string = 'http://localhost:9001') {}

  async synthesize(request: TTSRequest): Promise<Buffer> {
    // POST /tts with JSON body
    // Returns: WAV audio as buffer
  }

  async listVoices(): Promise<string[]> {
    // GET /voices
  }

  async checkHealth(): Promise<boolean> {
    // GET /health
  }
}
```

**Implementation notes:**
- Use `node-fetch` or `axios` (already in deps?)
- Proper error handling (connection refused, timeout)
- Match Python client behavior exactly

---

### Phase 5C: Integration with Discord Plugin (1.5 hours)

#### 5C.1: Add Voice Service Manager

```typescript
// src/main/services/voice-service-manager.ts
export class VoiceServiceManager {
  private whisperClient: WhisperClient
  private piperClient: PiperClient
  private dockerManager: DockerServiceManager
  
  constructor() {
    this.dockerManager = new DockerServiceManager()
    // Clients created once services are running
  }

  async initialize(): Promise<VoiceServiceStatus> {
    // 1. Check Docker installed
    // 2. Start services if needed
    // 3. Wait for health checks
    // 4. Create HTTP clients
  }

  async transcribe(audio: Buffer): Promise<string>
  async speak(text: string): Promise<Buffer>
  
  getStatus(): VoiceServiceStatus
}
```

#### 5C.2: Discord Plugin Integration

Update `src/plugins/discord/voice/` to use VoiceServiceManager:

```typescript
// In voice command handlers
const voiceService = getVoiceServiceManager()

if (!voiceService.isAvailable()) {
  await interaction.reply('Voice services not available. Install Docker?')
  return
}

const transcription = await voiceService.transcribe(audioBuffer)
```

---

### Phase 5D: UI for Docker Setup (1.5 hours)

#### Frontend Component: Docker Setup Modal

```typescript
// src/renderer/src/components/VoiceSetup/DockerSetupModal.tsx
interface DockerSetupModalProps {
  onComplete: () => void
}

export function DockerSetupModal({ onComplete }: DockerSetupModalProps) {
  // Steps:
  // 1. Check Docker installed
  // 2. Show progress during build (6 minutes)
  // 3. Success/failure state
}
```

**UX Flow:**
```
[ Voice Features Unavailable ]

Docker Desktop is required for voice transcription and text-to-speech.

Status: ❌ Not Installed

[ Download Docker Desktop ]  [ Learn More ]  [ Skip ]

---

(After Docker installed and building)

[ Setting Up Voice Services ]

⏳ Building Whisper service... (3-4 minutes)
✅ Whisper service ready
⏳ Building Piper service... (2-3 minutes)

This only happens once.

[Cancel]
```

---

### Phase 5E: Settings Integration (30 min)

Add voice settings panel:

```typescript
// Settings UI
Voice Services:
  Status: ✅ Running | ⚠️ Disabled | ❌ Not Available
  
  [x] Enable voice transcription (Whisper)
  [x] Enable text-to-speech (Piper)
  
  [ Test Microphone ]  [ Test Speakers ]
  
  [Restart Services]  [View Logs]
```

---

## Testing Plan

### Manual Testing Checklist

**Development Mode:**
- [ ] Services start from `resources/docker-services/`
- [ ] Health checks pass
- [ ] Transcription works
- [ ] TTS works
- [ ] Services survive app restart

**Packaged Mode:**
- [ ] Build with `npm run build:win` (or mac/linux)
- [ ] Services start from `app.asar.unpacked/`
- [ ] First run builds images (progress shown)
- [ ] Subsequent runs skip build
- [ ] Voice features work end-to-end

**Edge Cases:**
- [ ] Docker not installed → graceful fallback
- [ ] Docker installed but not running → helpful error
- [ ] Services fail to start → retry logic
- [ ] Network issues → proper timeout handling

---

## Implementation Order

1. ✅ **Commit current state** (done)
2. ⏱️ **5A.2:** Fix production paths in DockerServiceManager (30 min)
3. ⏱️ **5A.1:** Update electron-builder.yml (15 min)
4. ⏱️ **5A.3:** Add build state caching (45 min)
5. ⏱️ **5B:** Create HTTP clients (1 hour)
6. ⏱️ **5C:** Integrate with Discord (1.5 hours)
7. ⏱️ **5D:** Add UI components (1.5 hours)
8. ⏱️ **5E:** Settings panel (30 min)
9. ⏱️ **Testing:** Full QA (1 hour)

**Total: ~6-7 hours** to production-ready

---

## Success Criteria

When complete, the app should:

1. ✅ **Detect Docker** presence automatically
2. ✅ **Build services** on first voice feature use (with progress)
3. ✅ **Cache build state** to avoid rebuilds
4. ✅ **Gracefully degrade** when Docker unavailable
5. ✅ **Show helpful UI** for setup and troubleshooting
6. ✅ **Match Python bot behavior** for voice processing
7. ✅ **Work in both dev and production** builds

---

## Migration Path to Native Binaries (Future)

If Docker proves problematic, we can later:

1. Create `whisper-native.ts` and `piper-native.ts` clients
2. Implement same interface as HTTP clients
3. Swap implementation in VoiceServiceManager
4. Zero changes to Discord plugin or UI

**This architecture keeps options open!**

---

## Reference: Python Toji Ports

Based on GitHub research:
- Whisper STT: Port **9000** (Python uses 9002, we aligned to toji-services)
- Piper TTS: Port **9001**
- Health: `GET /health` → `{ "status": "healthy" }`
- STT: `POST /asr` with audio file
- TTS: `POST /tts` with JSON `{ "text": "..." }`

---

## Next Steps

Ready to implement? Let's start with **5A.2** (production paths) since it's the foundation for everything else.

Say **"Start 5A.2"** and I'll implement the production path fixes!
