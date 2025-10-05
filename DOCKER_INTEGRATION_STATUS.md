# Docker TTS/STT Integration - Implementation Status

**Branch**: `feature/docker-tts-integration`
**Base Commit**: `2d8a700` (before OpenAI TTS implementation)
**Strategy**: Option B - Bundle Docker services with Electron app

## ✅ Phase 1: Docker Service Manager (COMPLETE)

### Created Files

- `src/main/services/docker-service-manager.ts` - Core service manager
- `resources/docker-services/docker-compose.yml` - Service orchestration
- `resources/docker-services/README.md` - Documentation

### Features Implemented

- ✅ Docker detection and validation
- ✅ Docker Compose version detection (plugin vs standalone)
- ✅ Service startup with health check waiting
- ✅ Service shutdown and cleanup
- ✅ Periodic health monitoring
- ✅ Mode management (DISABLED, NOT_INSTALLED, STARTING, RUNNING, ERROR)
- ✅ Resource path handling (development vs production)
- ✅ Timeout and retry logic

### Architecture

```typescript
DockerServiceManager
├── checkDockerInstalled() - Verify Docker available
├── startServices() - Launch docker-compose
├── stopServices() - Graceful shutdown
├── getServiceHealth() - Check both services
└── waitForHealthy() - Startup synchronization
```

## 🚧 Phase 2: Service Implementation Files (TODO)

### Files to Copy from toji-services

From Whisper Service:

- [ ] `whisper-service/Dockerfile`
- [ ] `whisper-service/requirements.txt`
- [ ] `whisper-service/service.py`
- [ ] `whisper-service/config.py`
- [ ] `whisper-service/logger.py`

From Piper Service:

- [ ] `piper-service/Dockerfile`
- [ ] `piper-service/requirements.txt`
- [ ] `piper-service/service.py`
- [ ] `piper-service/config.py`

### Actions Required

1. Clone/copy service files from `Krenuds/toji-services` repo
2. Place in `resources/docker-services/whisper-service/`
3. Place in `resources/docker-services/piper-service/`
4. Test local docker-compose build and run

## 🚧 Phase 3: TTS/STT Client Services (TODO)

### Files to Create

- [ ] `src/main/services/tts-service.ts` - HTTP client for Piper
- [ ] `src/main/services/stt-service.ts` - HTTP client for Whisper

### Implementation

```typescript
// tts-service.ts
class TTSService {
  constructor(dockerManager: DockerServiceManager) {}
  async textToSpeech(text: string, voice?: string): Promise<Buffer>
  async listVoices(): Promise<Voice[]>
}

// stt-service.ts
class STTService {
  constructor(dockerManager: DockerServiceManager) {}
  async transcribe(audio: Buffer, language?: string): Promise<string>
  async detectLanguage(audio: Buffer): Promise<string>
}
```

## 🚧 Phase 4: Voice Module Integration (TODO)

### Updates Required

1. Integrate TTSService into VoiceModule
2. Add audio streaming for TTS playback
3. Implement STT audio capture from Discord
4. Handle Opus → PCM → WAV conversion
5. Connect transcription to message handler

### VoiceModule Methods

- [ ] `playTTS(text: string, sessionId: string)`
- [ ] `startListening(sessionId: string)`
- [ ] `stopListening(sessionId: string)`
- [ ] Handle audio streaming from Discord receiver

## 🚧 Phase 5: IPC Handlers (TODO)

### Handlers to Create

- [ ] `docker:check-installed` - Check Docker availability
- [ ] `docker:start-services` - Start services manually
- [ ] `docker:stop-services` - Stop services manually
- [ ] `docker:get-health` - Get current health status
- [ ] `docker:get-mode` - Get current mode

## 🚧 Phase 6: UI Integration (TODO)

### Settings Panel

Add Docker services section to settings:

- [ ] Docker installation status
- [ ] Service health indicators
- [ ] Manual start/stop controls
- [ ] Mode display (Running, Starting, Error, etc.)
- [ ] Fallback option toggle (use OpenAI API if Docker unavailable)

## 🚧 Phase 7: Packaging (TODO)

### electron-builder Configuration

Update `electron-builder.yml`:

```yaml
extraResources:
  - from: 'resources/docker-services'
    to: 'docker-services'
    filter:
      - '**/*'
```

### First-Run Experience

- [ ] Check Docker on first launch
- [ ] Show setup dialog if not installed
- [ ] Provide installation instructions
- [ ] Offer to continue without voice features
- [ ] Pull images in background (with progress)

## 🚧 Phase 8: Testing (TODO)

### Test Cases

- [ ] Docker not installed - graceful degradation
- [ ] Services fail to start - error handling
- [ ] Services become unhealthy during operation
- [ ] Manual service restart
- [ ] GPU vs CPU mode
- [ ] Model download on first run
- [ ] Multiple concurrent TTS requests
- [ ] STT with various audio formats

## Next Steps

1. **Copy service files from toji-services repo**

   ```bash
   # From toji-services repo
   cp -r whisper-service/* ../toji_electron/resources/docker-services/whisper-service/
   cp -r piper-service/* ../toji_electron/resources/docker-services/piper-service/
   ```

2. **Test local Docker services**

   ```bash
   cd resources/docker-services
   docker-compose build
   docker-compose up -d
   # Test health endpoints
   curl http://localhost:9000/health
   curl http://localhost:9001/health
   ```

3. **Create TTS/STT service clients**

4. **Integrate with VoiceModule**

5. **Add UI controls**

## Success Criteria

✅ **Phase 1 Complete When**:

- DockerServiceManager can detect Docker
- Can start/stop services via docker-compose
- Health checks work correctly
- Mode transitions properly

🎯 **Full Integration Complete When**:

- [ ] Voice commands are transcribed via Whisper
- [ ] TTS responses play via Piper
- [ ] Works without internet connection
- [ ] Gracefully degrades when Docker unavailable
- [ ] UI shows service status
- [ ] First-run setup guides user
- [ ] Packaged app includes all Docker files
- [ ] Works on clean Windows install

## Time Estimates

- ✅ Phase 1: Docker Service Manager - **COMPLETE**
- Phase 2: Service Files - **1 hour** (copy + test)
- Phase 3: HTTP Clients - **2 hours**
- Phase 4: Voice Module Integration - **4 hours**
- Phase 5: IPC Handlers - **1 hour**
- Phase 6: UI Integration - **2 hours**
- Phase 7: Packaging - **2 hours**
- Phase 8: Testing - **3 hours**

**Total Remaining**: ~15 hours (~2 days)
