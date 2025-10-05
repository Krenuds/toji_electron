# TTS Implementation Complete

## Summary
Successfully implemented end-to-end Text-to-Speech (TTS) for Discord bot responses in voice channels using Piper TTS service.

## The Problem
Discord.js voice library requires audio in PCM or Opus format, but Piper TTS service returns WAV format. Attempting to play WAV directly with `StreamType.Arbitrary` failed silently.

## The Solution
Implemented FFmpeg transcoding pipeline to convert WAV to PCM in real-time:

```
Piper TTS (WAV) → Buffer → Readable Stream → FFmpeg (transcode) → PCM Stream → Discord Audio Player
```

### Technical Implementation
- **FFmpeg Args**: `-f wav -i pipe:0 -f s16le -ar 48000 -ac 2 pipe:1`
- **Audio Format**: 16-bit signed little-endian PCM at 48kHz stereo
- **Stream Type**: `StreamType.Raw` for PCM audio
- **Process**: Direct `child_process.spawn()` for FFmpeg execution

### Dependencies Added
- `@ffmpeg-installer/ffmpeg`: Provides FFmpeg binary across platforms

### Dependencies Removed
- `prism-media`: Initially attempted but not used in final solution

## Architecture

### Flow
1. User speaks in Discord voice channel
2. Whisper transcribes speech to text
3. Transcription sent as embed + text to Discord channel
4. Bot processes transcription message
5. OpenCode generates response
6. **[TTS]** Response text sent to Piper service
7. **[TTS]** Piper returns WAV audio buffer
8. **[TTS]** FFmpeg transcodes WAV → PCM
9. **[TTS]** PCM audio played in Discord voice channel

### Components Modified

#### `TTSPlayer.ts`
- Spawns FFmpeg process for transcoding
- Pipes WAV input to FFmpeg stdin
- Creates audio resource from FFmpeg stdout (PCM)
- Queue management for multiple TTS requests
- Error handling for FFmpeg process

#### `VoiceModule.ts`
- `speak()` method calls Piper TTS
- Converts ArrayBuffer to Buffer
- Queues audio to TTSPlayer
- Session management for TTS players

#### `DiscordPlugin.ts`
- Finds active voice session in message guild
- Calls `voiceModule.speak()` in onComplete callbacks
- Handles both project messages and mentions

## Testing Results
✅ Audio plays successfully in Discord voice channel
✅ Bot speaks responses immediately after text response
✅ Queue handles multiple messages correctly
✅ FFmpeg transcoding works reliably
✅ Error handling captures issues properly

## Git Commits
```
1bf70dd chore(deps): remove unused prism-media dependency
9c2434b refactor(discord): remove excessive debug logging from TTS
e2dd0d3 fix(discord): implement FFmpeg transcoding for TTS audio playback
```

## Key Learnings
1. Discord.js voice requires specific audio formats (PCM/Opus)
2. WAV format needs transcoding before playback
3. Direct FFmpeg spawn is more reliable than wrapper libraries
4. Proper error handling requires capturing stderr and exit codes
5. StreamType.Raw is for PCM, StreamType.Arbitrary didn't work for WAV

## Future Improvements
- [ ] Add voice selection (Piper supports multiple voices)
- [ ] Add speech rate control
- [ ] Implement audio caching for repeated phrases
- [ ] Add user preferences for TTS enable/disable
- [ ] Consider Opus encoding for better quality/bandwidth

## Related Files
- `src/plugins/discord/voice/TTSPlayer.ts` - Audio playback
- `src/plugins/discord/voice/VoiceModule.ts` - TTS orchestration
- `src/plugins/discord/DiscordPlugin.ts` - Integration with message flow
- `resources/docker-services/piper-service/` - Piper TTS service
- `src/main/services/voice-service-manager.ts` - Service management

## Documentation
- See `VOICE_INTEGRATION.md` for overall voice system
- See `DISCORD_VOICE_SYSTEM.md` in SPEC/ for architecture
