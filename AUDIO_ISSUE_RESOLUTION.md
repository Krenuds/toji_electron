# Audio Duration Issue - Root Cause & Resolution

## Problem Summary

Voice transcription was failing because audio was being captured in tiny fragments (0.11s, 0.47s, 0.06s) instead of complete speech segments, even though users spoke continuously for 5-10 seconds.

## Investigation Timeline

### Initial Symptoms
- User spoke for 8.5 seconds (wall clock)
- Only 285ms of audio captured
- Average chunk size: **156 bytes** (expected ~3840 bytes)
- 350 chunks received over 8.5 seconds ≈ 42 chunks/second

### Root Cause Discovery

Discord.js `AudioReceiveStream` returns **compressed Opus packets** (~150-200 bytes), **NOT** decoded PCM audio.

**Evidence:**
```
Expected PCM: 3840 bytes per 20ms frame (48kHz stereo 16-bit)
Actually received: 156 bytes per packet (Opus compressed)
```

The code was treating Opus packets as PCM, causing wildly incorrect duration calculations:
- 54,732 bytes of Opus ≈ 285ms of "PCM" (wrong!)
- 54,732 bytes of Opus → **~400KB PCM after decoding** ≈ actual duration

## Solution

### Core Fix: Add Opus Decoder Pipeline

```typescript
import { opus } from 'prism-media'

// Create Opus decoder
const opusDecoder = new opus.Decoder({
  rate: 48000,      // Discord audio rate
  channels: 2,      // Stereo
  frameSize: 960    // 20ms at 48kHz
})

// Pipe: AudioReceiveStream (Opus) → OpusDecoder (PCM)
stream.pipe(opusDecoder)

opusDecoder.on('data', (chunk: Buffer) => {
  buffer.pcmData.push(chunk) // Now chunk is PCM!
})
```

### Supporting Changes

1. **Externalize prism-media in build config:**
   ```typescript
   rollupOptions: {
     external: ['prism-media', 'ffmpeg-static']
   }
   ```
   Prevents bundling optional native dependencies.

2. **Simplify subscription management:**
   - Removed `activeSubscriptions` Map (redundant with `userBuffers`)
   - Check `userBuffers.has(userId)` to detect existing subscriptions
   - Subscriptions naturally persist across multiple speech segments

## Results

**Before Opus Decoder:**
- Chunk size: 156 bytes (Opus)
- Duration calculation: Completely wrong
- Transcription: Failed (audio too short)

**After Opus Decoder:**
- Chunk size: 3840 bytes (PCM)
- Duration calculation: Accurate
- Transcription: **Working!** ✅

Example successful transcription:
```
[17:49:14] Processing audio: 407,040 bytes
[17:49:14] Audio duration: 1.60s
[17:49:16] Transcription: "Listen, can you hear me now?"
```

## Key Learnings

### 1. AudioReceiveStream Returns Opus
Despite documentation suggesting otherwise, `@discordjs/voice`'s `AudioReceiveStream` returns **Opus packets by default**, not PCM. The `@discordjs/opus` package being installed doesn't automatically decode them.

### 2. Opus vs PCM Sizes
- **Opus packet**: ~150-200 bytes (compressed)
- **PCM frame (20ms)**: 3840 bytes (48kHz stereo 16-bit)
- **Compression ratio**: ~20:1

### 3. Speaking Events Are Informational
Discord fires `speaking.start` events multiple times during natural pauses. These are **NOT** signals to create new subscriptions - the subscription should persist throughout the voice session.

## What Was Actually Needed

### Essential Changes ✅
1. **Opus decoder pipeline** - The actual fix
2. **Build config externalization** - Required for prism-media
3. **Persistent subscriptions** - Don't delete after processing

### Debugging Code (Removed) 🗑️
1. Verbose logging (chunk counts, periodic updates)
2. `activeSubscriptions` Map (redundant)
3. Complex "reuse subscription" logic (unnecessary)

## Files Modified

**Core Implementation:**
- `src/plugins/discord/voice/AudioReceiver.ts` - Added Opus decoder
- `electron.vite.config.ts` - Externalized prism-media

**Cleanup:**
- Removed 50+ lines of debugging logging
- Simplified subscription management
- Cleaned up audio-processor logging

## Testing

Voice transcription now works correctly:
1. `/voice join` - Bot joins voice channel
2. User speaks for 5+ seconds
3. Audio correctly captured as full speech segment
4. Whisper transcription succeeds
5. Result emitted to Discord plugin

## References

- **Original Python Implementation**: `VOICE_INTEGRATION.md`
- **Discord.js Voice Docs**: Uses AudioReceiveStream (returns Opus by default)
- **prism-media**: Required for Opus decoding in Node.js
