# Auto-Switch Voice Sessions Feature

## Overview

Implemented automatic voice session switching to improve user experience. Users no longer need to manually leave their current voice session before joining a new one.

## Problem

**Before:**

```
User in voice session for Project A
↓
User types /voice join in Project B channel
↓
❌ Error: "You already have an active voice session. Use /voice leave first."
↓
User forced to manually run /voice leave
↓
User runs /voice join again
```

This was frustrating and added unnecessary friction.

## Solution

**After:**

```
User in voice session for Project A
↓
User types /voice join in Project B channel
↓
✅ Bot automatically leaves Project A voice
✅ Bot joins Project B voice
↓
User sees: "🔄 Voice Session Switched"
```

Seamless and user-friendly!

## Implementation Details

### VoiceModule Changes

Updated `joinVoiceChannel()` method to automatically clean up existing sessions:

```typescript
// Check if user already has a session - automatically leave it
const existingSessionId = this.userSessions.get(userId)
if (existingSessionId) {
  const existingSession = this.sessions.get(existingSessionId)
  if (existingSession) {
    log(
      `User ${userId} already has an active session: ${existingSessionId}, automatically leaving...`
    )

    try {
      // Clean up the existing session
      existingSession.connection.destroy()
      existingSession.status = 'disconnected'
      this.sessions.delete(existingSessionId)
      this.userSessions.delete(userId)
      this.emit('sessionEnded', existingSessionId)
      log(`Successfully left previous session ${existingSessionId}`)
    } catch (error) {
      log(`Error leaving previous session:`, error)
      // Continue anyway - we'll create a new session
    }
  }
}

// Continue with creating new session...
```

### Command Changes

Updated `/voice join` to detect switching and provide appropriate feedback:

```typescript
// Check if user already has a session - inform them we're switching
const existingSession = voiceModule.getUserSession(interaction.user.id)
const isSwitching = existingSession !== undefined

// Join the voice channel (auto-leaves previous session)
const session = await voiceModule.joinVoiceChannel(...)

// Show different title based on whether switching or first join
await interaction.editReply({
  embeds: [{
    title: isSwitching ? '🔄 Voice Session Switched' : '🎙️ Voice Session Started',
    // ... include switch notification if switching
  }]
})
```

## User Experience

### First Join (No Existing Session)

```
🎙️ Voice Session Started
Connected to 🎙️-my-project

Project: my-project
Session ID: voice-123-456
Status: ✅ Connected
Voice Channel: #🎙️-my-project

Next Steps:
Join the voice channel to start talking!
Your conversation will be routed to this project.
Use /voice leave to disconnect.
```

### Switching Sessions

```
🔄 Voice Session Switched
Connected to 🎙️-another-project

🔄 Switched Sessions
Automatically left previous voice session and joined this one.

Project: another-project
Session ID: voice-123-789
Status: ✅ Connected
Voice Channel: #🎙️-another-project

Next Steps:
Join the voice channel to start talking!
Your conversation will be routed to this project.
Use /voice leave to disconnect.
```

## Benefits

### ✅ User-Friendly

No manual cleanup required - bot handles everything automatically.

### ✅ Intuitive

Works like switching tabs - just join the new project's voice channel.

### ✅ Clear Feedback

Users are informed when a session switch occurs vs. a fresh join.

### ✅ Robust

Error handling ensures new session is created even if old session cleanup fails.

### ✅ Logged

All session switches are logged for debugging:

```
User alice already has an active session: voice-alice-123, automatically leaving...
Successfully left previous session voice-alice-123
Created session ID: voice-alice-456
```

## Edge Cases Handled

### 1. **Orphaned Session Reference**

If `userSessions` has a reference but session doesn't exist:

```typescript
if (existingSession) {
  // Only cleanup if session actually exists
}
```

### 2. **Cleanup Failure**

If destroying previous connection throws error:

```typescript
try {
  existingSession.connection.destroy()
} catch (error) {
  log(`Error leaving previous session:`, error)
  // Continue anyway - we'll create a new session
}
```

### 3. **Same Channel Rejoin**

User can re-run `/voice join` in same project - bot will:

- Leave existing session
- Create new session
- Reconnect to same voice channel
- Show "Switched" message (technically correct)

## Testing Checklist

- [x] Code compiles without errors
- [x] TypeScript types are correct
- [x] Auto-switch logic implemented
- [x] Proper cleanup of previous session
- [x] Switch detection works
- [x] Different embed titles for switch vs. join
- [x] Switch notification field appears
- [ ] Test in Discord: Join project A voice
- [ ] Test in Discord: Join project B voice (should auto-switch)
- [ ] Verify bot leaves A and joins B
- [ ] Verify "Switched Sessions" message appears
- [ ] Test edge case: Rejoin same project

## Future Enhancements

### Multi-Guild Support

When bot is in multiple Discord servers:

- Track sessions per guild
- Allow switching between guilds
- Prevent cross-guild interference

### Session History

Track recent switches:

```typescript
interface SessionHistory {
  userId: string
  switches: Array<{
    from: string // Previous project
    to: string // New project
    timestamp: Date
  }>
}
```

Use for analytics or undo functionality.

### Voice Follow Mode

Optional feature: Bot automatically follows user between voice channels:

```typescript
client.on('voiceStateUpdate', (oldState, newState) => {
  // If user moves to different voice channel
  // Auto-switch bot to that project's voice channel
})
```

---

**Document Status**: Implemented ✅  
**Last Updated**: 2025-10-04  
**Related Files**:

- `src/plugins/discord/voice/VoiceModule.ts`
- `src/plugins/discord/commands/voice.ts`
