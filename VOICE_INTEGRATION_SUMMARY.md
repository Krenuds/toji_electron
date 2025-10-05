# Voice Integration Summary

**Quick reference for the comprehensive voice pipeline documentation.**

---

## Document Purpose

`VOICE_INTEGRATION.md` is a complete technical specification of the **Whisper STT + Piper TTS voice pipeline** from the Python/Discord implementation of Toji. This serves as:

1. **Historical Reference** - Documents the working implementation from the original Python bot
2. **Migration Guide** - Provides patterns and architecture for Electron/TypeScript rebuild  
3. **Implementation Blueprint** - Complete system design with code examples and rationale

---

## Key Architecture Components

### Core Pipeline
```
Discord Voice → StreamingAudioSink → AudioProcessor → Whisper STT
                                                          ↓
                                                    Transcription
                                                          ↓
Discord Audio ← FFmpeg/Opus ← TTSHandler ← Piper TTS ← Claude LLM
```

### Critical Files (Python Implementation)

| Component | File | Purpose |
|-----------|------|---------|
| **Coordination** | `audio_manager.py` | Voice client management, streaming orchestration |
| **Audio Capture** | `discord_sink.py` | Discord voice callback handler, buffering, timers |
| **Audio Processing** | `audio_processor.py` | Stereo→mono, resampling, WAV generation |
| **STT Client** | `stt_client.py` | HTTP client for Whisper service (port 9000) |
| **TTS Client** | `tts_client.py` | HTTP client for Piper service (port 9001) |
| **TTS Handler** | `tts_handler.py` | TTS generation, chunking, Discord playback |
| **Text Cleanup** | `tts_parser.py` | Markdown/formatting removal for natural speech |
| **Voice Logic** | `voice_handlers.py` | Transcription processing, command detection |

---

## Key Technical Decisions

### 1. **Timer-Based Speech Detection** ✓
Instead of VAD (Voice Activity Detection), uses two timers per user:
- **Speech End Timer (1.5s):** Fires after user stops speaking
- **Force Timer (6.0s):** Prevents infinite buffering

**Rationale:** Simpler, more reliable, configurable for different conversation styles.

### 2. **Connection Pooling** ✓
HTTP client maintains persistent keepalive connections to STT/TTS services.

**Impact:** Saves 50-100ms per request by eliminating TCP handshake overhead.

### 3. **Thread-Safe Audio Bridging** ✓
Discord voice callbacks run on a separate thread. Uses `call_soon_threadsafe()` to bridge to bot's async event loop.

**Prevents:** Race conditions, deadlocks, and callback errors during shutdown.

### 4. **Parallel TTS Generation** ✓
Splits long text into sentence chunks, generates audio in parallel, then concatenates.

**Impact:** Reduces latency for long responses by 40-60%.

### 5. **Wake Word Filtering** ✓
Optional "listen" keyword detection. Only processes speech containing the wake word.

**Feature:** Wake word can appear anywhere in speech (not just at start).

### 6. **Event-Driven Coordination** ✓
Audio feedback (acknowledgment sounds, background music) coordinated via pub-sub event bus.

**Benefits:** Loose coupling, easy to add/remove features without touching core pipeline.

---

## Performance Profile

**Measured Latencies (End-to-End):**

| Stage | Time | Optimizations Applied |
|-------|------|----------------------|
| Speech capture | ~20ms/packet | Discord frame rate |
| Speech end detection | 1.5s | Configurable timer |
| Audio format conversion | ~50ms | NumPy resampling |
| Whisper transcription | 200-500ms | 16kHz audio, connection pooling |
| Claude processing | 1-3s | Streaming response |
| TTS generation | 300-800ms | Parallel chunking, connection pooling |
| Audio playback start | ~50ms | FFmpeg encoding |
| **Total (voice → voice)** | **3-6s** | Sub-500ms pipeline, AI dominates latency |

---

## Configuration Highlights

**Essential Settings:**

```yaml
# Voice behavior
discord:
  voice:
    wake_word: "listen"              # Optional keyword filtering
    auto_join: true                  # Join designated channel on startup
    default_channel: "Toji"          # THE designated voice channel

# Audio processing timing
audio:
  speech_end_delay: 1.5              # Wait time after speech
  min_speech_duration: 1.0           # Minimum to process
  force_process_threshold: 6.0       # Max buffer time

# External services
whisper:
  service_url: "http://localhost:9000"  # STT service
tts:
  service_url: "http://localhost:9001"  # TTS service

# Connection optimization
services:
  connection_pool_size: 10           # HTTP keepalive pool
  timeout: 30.0                      # Request timeout
```

---

## Migration to TypeScript/Electron

### Must Preserve

1. **Async HTTP with Connection Pooling**
   - Use `axios` with keepalive or similar
   - Maintain singleton clients

2. **Timer-Based Speech Detection**
   - `setTimeout()` per user for speech end
   - Cancel/reschedule on new audio

3. **Thread-Safe Audio Processing**
   - Discord.js voice callbacks run separately
   - Bridge safely to main event loop

4. **Event-Driven Coordination**
   - Use `EventEmitter` for audio events
   - Maintain loose coupling between components

5. **Per-User Audio Buffering**
   - Isolate users with separate buffers/timers
   - Prevent concurrent speaking issues

### Discord.js Equivalents

| py-cord/Python | Discord.js/TypeScript |
|----------------|----------------------|
| `VoiceClient` | `VoiceConnection` |
| `StreamingAudioSink` | `VoiceReceiver` + custom processor |
| `voice_client.play()` | `AudioPlayer` + `createAudioResource()` |
| `guild.voice_client` | `getVoiceConnection(guildId)` |

---

## External Service Architecture

### Whisper STT (Port 9000)
- **Technology:** faster-whisper (optimized Whisper implementation)
- **Input:** WAV audio (16kHz mono)
- **Output:** JSON `{"text": "transcription"}`
- **Deployment:** Docker container

### Piper TTS (Port 9001)
- **Technology:** Piper TTS engine
- **Input:** JSON `{"text": "...", "voice": "..."}`
- **Output:** WAV audio data
- **Deployment:** Docker container

**Both services expose `/health` endpoints for monitoring.**

---

## Notable Implementation Details

### 1. Bot Voice Filtering
Bot filters out its own audio to prevent feedback loop:
```python
if self.bot_user_id and user_id == self.bot_user_id:
    return  # Don't process bot's voice
```

### 2. Whisper Hallucination Detection
Filters out noise artifacts that Whisper transcribes as repeated characters:
```python
if len(set(text.replace(' ', ''))) <= 2:
    return {"text": ""}  # "aaaa" = hallucination
```

### 3. Silence Trimming
Energy-based windowed detection trims silence from start/end of audio before sending to Whisper.

### 4. Graceful Shutdown
Prevents race conditions by:
- Setting shutdown flag
- Stopping recording before disconnecting
- Checking flag in all callbacks

---

## Troubleshooting Quick Reference

| Issue | Solution |
|-------|----------|
| "No opus library found" | Install `libopus0` (Linux) or `opus` (macOS) |
| "Error code 4006" | Already patched - use framework's voice state |
| "Service unavailable" | Check Whisper/Piper services with `/health` |
| "Empty transcriptions" | Check `min_speech_duration`, try longer speech |
| "Bot hears itself" | Verify `bot_user_id` set in sink |
| "High latency" | Enable connection pooling, use faster Whisper model |

---

## Event Flow Diagram

```
User Speech Detected
         ↓
AUDIO_SPEECH_END → Acknowledgment "bing" sound
         ↓
AUDIO_TRANSCRIPTION_START → Send to Whisper
         ↓
Transcription Complete → Check for voice commands
         ↓
AUDIO_LLM_START → Start background music + Claude processing
         ↓
Claude Response Ready
         ↓
AUDIO_LLM_COMPLETE → Stop background music
         ↓
AUDIO_TTS_START → Generate speech with Piper
         ↓
TTS Audio Ready → Play in Discord voice
         ↓
AUDIO_TTS_COMPLETE → Ready for next input
```

---

## Related Files

- **`VOICE_INTEGRATION.md`** - Complete technical documentation (this summary)
- **`CLAUDE.md`** - General bot architecture and development guide
- **`src/voice/CLAUDE.md`** - Voice module specific documentation
- **`config/settings.yaml`** - Configuration reference
- **`requirements.txt`** - Python dependencies

---

## Document Metadata

**Created:** October 2025  
**Original Implementation:** Python 3.8+ with py-cord  
**Target Platform:** Electron/TypeScript (future migration)  
**Status:** Production-tested architecture from working bot

---

## FOR THE EMPEROR! ⚔️

*This documentation preserves the battle-tested voice integration architecture for future implementations.*
