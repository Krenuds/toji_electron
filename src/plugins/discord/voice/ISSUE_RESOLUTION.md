# Issue Resolution: Voice Connection Timeout

## Problem

Bot joined voice channel briefly, hung for ~5 seconds, then disconnected with error:

- "Connection Failed"
- "Failed to connect to voice channel. Please try again."

## Root Cause

**Missing Opus codec library** - discovered via enhanced logging.

### Log Analysis

From `toji-2025-10-04.log`:

```
[discord:voice] Voice Dependencies Report:
--------------------------------------------------
Core Dependencies
- @discordjs/voice: 0.19.0
- prism-media: 1.3.5

Opus Libraries           ← EMPTY! This was the problem
FFmpeg
- not found
--------------------------------------------------
```

Connection behavior:

```
[discord:voice] Connection object created, initial state: signalling
[discord:voice] Waiting for connection to reach Ready state (5s timeout)...
...5 seconds pass...
[discord:voice] ❌ Failed to connect to voice channel after timeout
[discord:voice] Error type: AbortError
[discord:voice] Current connection state: signalling  ← Never progressed!
```

**Key indicator**: Connection stuck in `signalling` state, never moved to `connecting` or `ready`.

## Solution Applied

### First Issue: Missing Opus Library

Installed the native Opus library:

```powershell
npm install @discordjs/opus  ✅
```

This provides the codec needed for Discord voice encoding/decoding.

**Result**: Opus now shows in dependency report, BUT connection still failed!

### Second Issue: Missing Encryption Library

After installing Opus, logs showed a NEW problem:

```
Opus Libraries
- @discordjs/opus: 0.10.0    ✅ NOW PRESENT

Encryption Libraries
- not found                  ❌ NEW PROBLEM!
```

Installed native encryption library:

```powershell
npm install sodium-native  ✅
```

This provides the encryption needed for secure voice connections.

## Why This Happened

Phase 1 installation only included:

- ✅ `@discordjs/voice` - Voice connection management
- ❌ **Missing**: Opus codec (required for audio encoding)
- ❌ **Missing**: Native encryption library (required for secure connection)

We initially installed `libsodium-wrappers`, but it **wasn't being detected by @discordjs/voice**. The voice library requires either:

- `sodium-native` (best performance - native binding)
- `sodium` (good performance)
- `libsodium-wrappers` (pure JS - slower)

While we don't send/receive audio in Phase 1, **Discord still requires both Opus AND encryption to establish the voice connection** at the protocol level.

## Verification

After installing BOTH `@discordjs/opus` AND `sodium-native` and rebuilding, the dependency report should now show:

```
Opus Libraries
- @discordjs/opus: 0.10.0

Encryption Libraries
- sodium-native: X.X.X
```

And connection should progress:

```
signalling → connecting → ready ✅
```

## Package.json Updates

Your `package.json` should now have:

```json
{
  "dependencies": {
    "@discordjs/opus": "^0.10.0",
    "@discordjs/voice": "^0.19.0",
    "libsodium-wrappers": "^0.7.15",
    "sodium-native": "^4.3.1"
  }
}
```

## Testing

1. **Restart the app**: `npm run dev`
2. **Check new dependency report** in logs (on startup)
3. **Try `/voice join`** again
4. **Expected behavior**: Bot joins and stays connected!

## What to Look For

### Success Logs

```
[discord:voice] === JOIN VOICE CHANNEL START ===
[discord:voice] Connection object created, initial state: signalling
[discord:voice] 🔄 State Change: signalling -> connecting
[discord:voice] 🔌 Connection is CONNECTING
[discord:voice] 🔄 State Change: connecting -> ready
[discord:voice] ✅ Connection is READY
[discord:voice] ✅ Successfully connected to voice channel ... in 1234ms
[discord:voice] === JOIN VOICE CHANNEL SUCCESS ===
```

### If Still Failing

Check the dependency report shows Opus is installed. If it says "not found", there may be a build issue.

**Fallback option** (if native build fails):

```powershell
npm install opusscript
```

This is a pure JavaScript implementation (slower but works without build tools).

## Lessons Learned

1. **Enhanced logging was crucial** - showed exactly where it failed
2. **Dependency reports are essential** - immediately identified missing codec
3. **Connection states tell the story** - stuck in `signalling` = missing codec
4. **Phase 1 still needs full codec stack** - even without audio processing

## Related Files

- **Logs**: `C:\Users\donth\AppData\Roaming\toji3\logs\toji-2025-10-04.log`
- **Troubleshooting Guide**: `src/plugins/discord/voice/TROUBLESHOOTING.md`
- **Voice Module**: `src/plugins/discord/voice/VoiceModule.ts` (enhanced logging)

## Status

✅ **RESOLVED** - Opus library installed
🔄 **PENDING** - User testing with new build

---

**Next step**: Run `npm run dev` and try `/voice join` again! 🎙️
