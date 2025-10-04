# Voice Connection Troubleshooting Guide

## Issue: "Connection Failed" - Bot joins then disconnects

### Symptoms

- Bot appears in voice channel briefly
- Hangs for a few seconds
- Disconnects with "Connection Failed" error
- Error message: "Failed to connect to voice channel. Please try again."

## Enhanced Logging

The VoiceModule now has extensive logging to help diagnose connection issues. When you run `/voice join`, check the logs at:

```
C:\donth\AppData\Roaming\toji3\logs\main.log
```

### What to Look For

#### 1. **Dependency Check** (on bot startup)

```
[discord:voice] Initializing VoiceModule
[discord:voice] Voice Dependencies Report:
--------------------------------------------------
Core Dependencies
- @discordjs/voice: 0.19.0
- prism-media: X.X.X

Opus Libraries
- @discordjs/opus: not found (or version)
- opusscript: not found (or version)

Encryption Libraries
- sodium: not found (or version)
- libsodium-wrappers: 0.7.15

FFmpeg
- version: not found (or installed version)
- libopus: no (or yes)
--------------------------------------------------
```

**What's needed:**

- ✅ At least ONE Opus library
- ✅ At least ONE Encryption library (we have libsodium-wrappers)
- ⚠️ FFmpeg is optional for Phase 1 (needed later for audio processing)

#### 2. **Join Attempt Logs**

```
[discord:voice] === JOIN VOICE CHANNEL START ===
[discord:voice] User: 123456789
[discord:voice] Channel ID: 987654321
[discord:voice] Channel Name: General
[discord:voice] Guild ID: 111222333
[discord:voice] Guild Name: Test Server
[discord:voice] Created session ID: voice-123456789-1728...
[discord:voice] Calling joinVoiceChannel from @discordjs/voice...
[discord:voice] Voice adapter available: true
[discord:voice] Connection object created, initial state: signalling
[discord:voice] Connection handlers setup complete
[discord:voice] Waiting for connection to reach Ready state (5s timeout)...
```

#### 3. **State Change Logs**

Watch for the state transitions:

```
[discord:voice] 🔄 State Change [voice-...]: signalling -> connecting
[discord:voice] 📡 Connection is CONNECTING
[discord:voice] 🔄 State Change [voice-...]: connecting -> ready
[discord:voice] ✅ Connection is READY
[discord:voice] ✅ Successfully connected to voice channel ... in 1234ms
```

**Problem indicators:**

- **Stuck in signalling/connecting**: Network/firewall issue
- **Goes to disconnected quickly**: Opus/encryption library missing
- **Timeout after 5s**: Voice adapter or Discord API issue

#### 4. **Error/Disconnect Logs**

If it fails, you'll see:

```
[discord:voice] ❌ Connection Error [voice-...]:
[discord:voice] Error name: ...
[discord:voice] Error message: ...
[discord:voice] Error stack: ...

[discord:voice] 🔄 State Change [voice-...]: connecting -> disconnected
[discord:voice] ⚠️ Connection DISCONNECTED
[discord:voice] Disconnect reason: 4006
[discord:voice] Close code: 4006
```

## Common Causes & Solutions

### 1. **Missing Opus Library**

**Symptom**: Disconnects immediately with close code 4006

**Check**:

```powershell
npm list @discordjs/opus opusscript
```

**Solution**:

```powershell
npm install @discordjs/opus
```

If build fails (Windows):

```powershell
npm install --global --production --add-python-to-path windows-build-tools
npm install @discordjs/opus
```

Or use the fallback:

```powershell
npm install opusscript
```

### 2. **Missing/Bad Encryption Library**

**Symptom**: Connection hangs or fails with crypto errors

**Check**:

```powershell
npm list libsodium-wrappers sodium sodium-native
```

**Solution** (we already have libsodium-wrappers, but verify):

```powershell
npm install libsodium-wrappers --force
```

For better performance:

```powershell
npm install sodium-native
```

### 3. **Voice Adapter Not Available**

**Symptom**: Log shows `Voice adapter available: false`

**Cause**: Discord.js client intents not configured properly

**Solution**: Check your Discord client initialization has:

```typescript
import { Client, GatewayIntentBits } from 'discord.js'

const client = new Client({
  intents: [
    GatewayIntentBits.Guilds,
    GatewayIntentBits.GuildVoiceStates, // ← REQUIRED
    GatewayIntentBits.GuildMessages
  ]
})
```

### 4. **Firewall/Network Issues**

**Symptom**: Stuck in "connecting" state, times out after 5s

**Logs show**:

```
[discord:voice] 🔌 Connection is CONNECTING
...5 seconds pass...
[discord:voice] ❌ Failed to connect to voice channel after timeout
[discord:voice] Current connection state: connecting
```

**Solution**:

1. Check firewall allows Discord voice (UDP ports)
2. Test on different network
3. Check Discord service status
4. Verify bot has CONNECT and SPEAK permissions

### 5. **Bot Permissions**

**Symptom**: Error before even attempting connection

**Check**: Bot needs these permissions in the voice channel:

- ✅ CONNECT
- ✅ SPEAK
- ✅ VIEW_CHANNEL

**Solution**: Update bot's role permissions or channel overrides

### 6. **Discord API Outage**

**Symptom**: Connection fails across all servers

**Check**: https://discordstatus.com/

**Solution**: Wait for Discord to resolve issues

## Testing Steps

1. **Rebuild with new logging:**

   ```powershell
   npm run build
   ```

2. **Start in dev mode:**

   ```powershell
   npm run dev
   ```

3. **Attempt to join voice:**

   ```
   /voice join
   ```

4. **Watch logs in real-time:**
   - Open: `C:\donth\AppData\Roaming\toji3\logs\main.log`
   - Search for: `[discord:voice]`

5. **Copy relevant log section and share**

## What to Share When Reporting Issues

When reporting connection failures, include:

1. **Dependency Report** (from startup logs)
2. **Full join attempt log** (from `=== JOIN START ===` to `=== FAILED ===`)
3. **State change sequence**
4. **Any error messages with stack traces**
5. **Close code** (if disconnected)

## Quick Diagnostic Command

You can run this in your console to check voice deps:

```typescript
import { generateDependencyReport } from '@discordjs/voice'
console.log(generateDependencyReport())
```

Or add a `/voice deps` command to check from Discord.

## Expected Timeline

- **Signalling**: 0-500ms
- **Connecting**: 500-2000ms
- **Ready**: Should reach within 2-3 seconds total

If it takes longer than 5 seconds, something is wrong.

---

## Next Steps After Diagnosis

Once you identify the issue from logs:

1. **Missing dependencies**: Install them
2. **Permission issues**: Fix bot role/channel permissions
3. **Network issues**: Test different network/check firewall
4. **Code issues**: Share logs for further analysis

The enhanced logging will tell us exactly what's happening! 🔍
