# STT Implementation Decision Matrix

## Wake Word Strategy Comparison

| Approach | Pros | Cons | CPU Impact | Battery Impact | UX |
|----------|------|------|------------|----------------|-----|
| **Always-on "listen" detection** | Hands-free, feels like magic | False positives possible | Medium-High | High | ⭐⭐⭐⭐⭐ |
| **Button/Hotkey activation** | No false positives, lower resource use | Requires manual action | Low | Low | ⭐⭐⭐ |
| **Hybrid: Button + continuous after first activation** | Best of both worlds | More complex logic | Medium | Medium | ⭐⭐⭐⭐ |

**Recommendation:** Start with **Button/Hotkey** for MVP, add always-on as optional feature later.

---

## Model Selection Matrix

| Model | Bundle Size | RAM Usage | Speed | Accuracy | Best For |
|-------|-------------|-----------|-------|----------|----------|
| **tiny.en** | 75MB | ~1GB | 10x | 60% | Testing, low-end laptops |
| **base.en** ⭐ | 142MB | ~1GB | 7x | 75% | **Production default** |
| **small.en** | 466MB | ~2GB | 4x | 85% | Power users, desktop only |
| **medium.en** | 1.5GB | ~5GB | 2x | 90% | Studio/server use |

**Recommendation:** Bundle **base.en** by default, allow download of larger models in settings.

---

## Audio Capture Library Comparison

| Library | Complexity | Cross-platform | Electron-friendly | Maintenance |
|---------|------------|----------------|-------------------|-------------|
| **node-microphone** | Low | ✅ Yes | ✅ Yes | Active |
| **node-record-lpcm16** | Low | ✅ Yes | ✅ Yes | Stale (3 years) |
| **Native Electron Media** | High | ✅ Yes | ✅ Yes | N/A (built-in) |
| **sox** | Medium | ⚠️ Requires sox binary | ✅ Yes | Active |

**Recommendation:** **node-microphone** for simplicity and active maintenance.

---

## Transcription Routing Priority

| Priority | Destination | Logic |
|----------|-------------|-------|
| 1 | **Discord Voice Channel** | If user is in voice, send as text message |
| 2 | **Active Toji Project** | If project is open, send as prompt |
| 3 | **Last Active Channel** | If no project, send to last used Discord channel |
| 4 | **General Toji Prompt** | Fallback: no context |

**Recommendation:** Implement all 4 with user-configurable priority order.

---

## UI Placement Options

### Option A: Header Bar (Global)

```text
┌─────────────────────────────────────────┐
│ Toji   Projects   Discord   [🎤 Listen] │
└─────────────────────────────────────────┘
```

**Pros:** Always accessible, clear status
**Cons:** Takes header space

### Option B: Floating Action Button (FAB)

```text
                          ┌─────────┐
                          │ Content │
                          │         │
                          │         │
                          │    [🎤] │ ← Bottom right
                          └─────────┘
```

**Pros:** Unobtrusive, modern UX
**Cons:** Can obscure content

### Option C: Project Panel Integration

```text
┌─────────────────┐
│ Active Project  │
│ ─────────────── │
│ [🎤 Voice Input]│
│ [💬 Text Input] │
└─────────────────┘
```

**Pros:** Contextual, clear purpose
**Cons:** Only visible when project open

### Option D: Hotkey Only (No UI)

**Pros:** Zero UI clutter, power user friendly
**Cons:** Discoverability issue

**Recommendation:** **Option A + Option D** (Header button + global hotkey)

---

## Hotkey Options

| Hotkey | Platform Availability | Conflict Risk | Ergonomics |
|--------|----------------------|---------------|------------|
| **Ctrl+Shift+L** | All | Low | ⭐⭐⭐⭐ |
| **Ctrl+Space** | All | Medium (IDE autocomplete) | ⭐⭐⭐⭐⭐ |
| **Alt+V** | All | Low | ⭐⭐⭐ |
| **F12** | All | High (DevTools) | ⭐⭐ |
| **Cmd+Shift+L** (Mac) | macOS only | Low | ⭐⭐⭐⭐ |

**Recommendation:** **Ctrl+Shift+L** (cross-platform, low conflict)

---

## VAD Sensitivity Tuning

| Threshold | Pros | Cons | Use Case |
|-----------|------|------|----------|
| **0.3** | Catches quiet speech | Many false positives | Quiet environments |
| **0.5** ⭐ | Balanced | Occasional false positives | **Default** |
| **0.7** | Few false positives | May miss quiet speech | Noisy environments |
| **0.9** | Almost no false positives | Misses lots of speech | Very noisy |

**Recommendation:** Default to **0.5**, allow user adjustment in settings.

---

## Silence Detection Timing

| Duration | Pros | Cons | Use Case |
|----------|------|------|----------|
| **500ms** | Feels responsive | May cut off mid-sentence | Short commands |
| **1000ms** | Good balance | Slight delay | Normal speech |
| **1500ms** ⭐ | Handles pauses | Feels slow | **Thoughtful speech** |
| **2000ms** | Never cuts off | Frustrating wait | Long monologues |

**Recommendation:** **1500ms** default, configurable in settings.

---

## Deployment Strategy

| Approach | Pros | Cons | App Size |
|----------|------|------|----------|
| **Bundle all binaries** | Zero network needed | Large download | +500MB |
| **Bundle binary + base.en** ⭐ | Works offline, reasonable size | +200MB | **+200MB** |
| **Download on first use** | Small initial download | Requires network | +50MB initial |
| **Hybrid: tiny bundled, larger downloaded** | Best of both | More complex | +100MB initial |

**Recommendation:** **Bundle binary + base.en** for best UX.

---

## Error Recovery Strategies

| Error | User Impact | Recovery Strategy |
|-------|-------------|-------------------|
| **Mic permission denied** | High | Show OS settings link, fallback to text input |
| **Binary missing** | High | Auto-download from GitHub releases |
| **Model missing** | High | Auto-download on first use with progress bar |
| **Whisper crash** | Medium | Auto-restart process, show retry button |
| **No audio detected** | Low | Show "Speak now..." prompt, check mic levels |
| **Poor transcription** | Low | Allow manual retry, show confidence score |

---

## Performance Optimization Options

| Technique | Impact | Complexity | When to Use |
|-----------|--------|------------|-------------|
| **Use tiny.en model** | -50% CPU, -50% accuracy | Low | Low-end devices |
| **Reduce threads (-t 2)** | -30% CPU | Low | Background mode |
| **Longer step size (--step 1000)** | -40% CPU, +latency | Low | Non-real-time use |
| **Disable VAD** | -10% CPU, more false positives | Low | Quiet environments |
| **GPU acceleration** | -80% CPU, +setup complexity | High | Desktop with NVIDIA GPU |

**Recommendation:** Start with defaults, add performance mode toggle later.

---

## Testing Environments

| Scenario | Purpose | Expected Result |
|----------|---------|-----------------|
| **Quiet room** | Baseline accuracy | 95%+ accuracy |
| **Office noise** | Realistic use | 80%+ accuracy with VAD |
| **Music playing** | Worst case | 60%+ accuracy, may need retry |
| **Multiple speakers** | Future diarization | Single speaker tracked |
| **Accented speech** | Accessibility | 70%+ accuracy (model limitation) |
| **Whispered speech** | Edge case | May require sensitivity boost |

---

## Integration Test Matrix

| Test | Input | Expected Output | Priority |
|------|-------|-----------------|----------|
| **Wake word activation** | Say "listen" | Start recording | High |
| **Silence detection** | 2s pause | Finalize transcription | High |
| **Active project routing** | Voice input | Sent to project | High |
| **Discord voice routing** | Voice input in VC | Sent to Discord | High |
| **Hotkey toggle** | Ctrl+Shift+L | Start/stop listening | Medium |
| **Mic permission denied** | Block mic | Show error + fallback | Medium |
| **Binary crash** | Kill process | Auto-restart | Low |
| **No active context** | Voice with no project | General prompt | Low |

---

## Configuration Schema (Full)

```typescript
interface STTConfig {
  enabled: boolean;
  wakeWord: string | null; // null = button-only activation
  hotkey: string;
  model: 'tiny.en' | 'base.en' | 'small.en' | 'medium.en';
  vad: {
    enabled: boolean;
    threshold: number; // 0.0-1.0
    minSilenceDurationMs: number;
    minSpeechDurationMs: number;
  };
  routing: {
    priority: Array<'discord-voice' | 'active-project' | 'last-channel' | 'general'>;
    requireConfirmation: boolean; // Show preview before sending
  };
  performance: {
    threads: number; // CPU threads
    stepMs: number; // Processing interval
    contextLengthMs: number; // Audio context window
  };
  ui: {
    showRealTimeTranscript: boolean;
    showConfidenceScore: boolean;
    visualFeedback: 'icon' | 'waveform' | 'minimal';
  };
}
```

---

## Decision Summary

### Phase 3.1 Decisions

- ✅ Use whisper.cpp with streaming
- ✅ Bundle base.en model
- ✅ Cross-platform binary builds

### Phase 3.2 Decisions

- ✅ Button/hotkey activation (not always-on)
- ✅ node-microphone for audio capture
- ✅ Silero VAD with 0.5 threshold
- ✅ 1500ms silence = end of speech

### Phase 3.3 Decisions

- ✅ Priority: Discord voice → Active project → General
- ✅ Header button + Ctrl+Shift+L hotkey
- ✅ Show real-time status, not partial transcripts
- ✅ Auto-send after finalization (no confirmation)

---

**All technical decisions documented. Ready to implement!** 🚀
