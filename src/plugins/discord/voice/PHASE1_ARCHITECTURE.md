# Voice System - Phase 1 Architecture

## Overview

The voice system has been redesigned to follow Toji's **project-centric architecture**. Voice sessions are now tightly integrated with Discord project channels, ensuring that conversations are always routed to the correct project context.

## Core Principles

### 1. **Project-Channel Coupling**

- **One voice channel per project** - Each project gets a dedicated voice channel
- **Commands only work in project channels** - `/voice` commands must be used in project text channels
- **Automatic context routing** - Voice input is routed to the correct project in Toji

### 2. **Dynamic Channel Management**

Voice channels are created on-demand:

```
User types: /voice join
    ↓
In #my-project text channel
    ↓
Bot creates/finds: 🎙️-my-project voice channel
    ↓
Bot joins voice channel
    ↓
Session linked to project path
```

### 3. **Session Tracking**

Each voice session maintains:

- **Project Path**: The filesystem path to the Toji project
- **Project Channel ID**: The Discord text channel for the project
- **Voice Channel ID**: The Discord voice channel
- **User ID**: Who initiated the session

## Implementation Details

### Command Flow

#### `/voice join` (in #my-project)

```typescript
1. Validate: Is this a project channel?
   └─> projectManager.isProjectChannel(channelId)

2. Get project info
   └─> projectManager.getProjectByChannel(channelId)
   └─> Returns: { projectName, projectPath, channelId }

3. Get or create voice channel
   └─> Find existing: 🎙️-my-project
   └─> Or create new voice channel in same category

4. Join voice channel
   └─> voiceModule.joinVoiceChannel(
         voiceChannel,
         userId,
         projectPath,      // <-- Project context!
         projectChannelId  // <-- Where to route messages
       )

5. Store session with project context
   └─> Session now knows which project it belongs to
```

#### `/voice leave` (in #my-project)

```typescript
1. Validate: Is this a project channel?
2. Leave voice channel
3. Clean up session
4. Voice channel remains for future use
```

#### `/voice status` (in #my-project)

```typescript
1. Validate: Is this a project channel?
2. Get user's session
3. Display:
   - Project name
   - Voice channel
   - Project text channel
   - Duration
   - Connection status
```

### Voice Channel Naming

Voice channels follow this naming convention:

```
🎙️-{project-name}
```

**Examples:**

- Project: `my-app` → Voice: `🎙️-my-app`
- Project: `toji-electron` → Voice: `🎙️-toji-electron`

**Benefits:**

- Visual indicator with microphone emoji
- Easy to identify which project a voice channel belongs to
- Consistent naming across all projects

### Channel Organization

```
📁 Toji Desktop (Category)
├── 💬 my-app (Text Channel)
├── 🎙️ my-app (Voice Channel) ← Created on first /voice join
├── 💬 another-project (Text Channel)
└── 🎙️ another-project (Voice Channel) ← Created on demand
```

## Data Structures

### VoiceSession

```typescript
interface VoiceSession {
  id: string // "voice-{userId}-{timestamp}"
  config: {
    userId: string // Discord user ID
    guildId: string // Discord server ID
    channelId: string // Voice channel ID
    projectPath?: string // 🆕 Toji project path
    projectChannelId?: string // 🆕 Discord text channel ID
  }
  connection: VoiceConnection // Discord voice connection
  startTime: Date // When session started
  status: 'connecting' | 'connected' | 'disconnected' | 'error'

  // Quick access fields
  projectPath?: string // 🆕 Direct access to project path
  projectChannelId?: string // 🆕 Direct access to text channel
}
```

### VoiceModule Methods

```typescript
class VoiceModule {
  // Join with project context
  async joinVoiceChannel(
    channel: VoiceChannel,
    userId: string,
    projectPath?: string, // 🆕 Project path
    projectChannelId?: string // 🆕 Text channel ID
  ): Promise<VoiceSession>

  // Leave voice channel
  async leaveVoiceChannel(userId: string): Promise<void>

  // Get user's active session
  getUserSession(userId: string): VoiceSession | undefined

  // Get connection status
  getConnectionStatus(userId: string): string
}
```

## Integration with Toji

### Current State (Phase 1)

Voice sessions **store** project context but don't **use** it yet:

```typescript
const session = {
  id: 'voice-123-456',
  projectPath: 'C:/Projects/my-app', // Stored
  projectChannelId: '1234567890' // Stored
  // ... but not yet used for routing
}
```

### Future State (Phase 2+)

When we add audio input/output:

```typescript
// User speaks in 🎙️-my-app
onUserAudio(audioData) {
  const session = getUserSession(userId)

  // Switch Toji to this project context
  await toji.switchToProject(session.projectPath)

  // Process audio → text
  const text = await stt(audioData)

  // Send to Toji with project context
  const response = await toji.chat(text)

  // Send response to project text channel
  await sendToChannel(session.projectChannelId, response)

  // Send audio response to voice channel
  await tts(response)
}
```

## Validation & Error Handling

### Command Validation

All `/voice` commands validate:

1. **Channel Type**: Must be used in a project text channel
2. **Project Exists**: Channel must be mapped to a Toji project
3. **Permissions**: Bot must have voice permissions
4. **Single Session**: User can only have one active session

### Error Messages

- ❌ Not in project channel → "This command can only be used in a project channel!"
- ❌ No project found → "Could not find project information for this channel."
- ❌ Already in session → "You already have an active voice session. Use /voice leave first."
- ❌ Can't create channel → "Failed to create/find voice channel for this project."

## Migration from Old Implementation

### What Changed

| Old Implementation           | New Implementation                              |
| ---------------------------- | ----------------------------------------------- |
| User joins any voice channel | Bot creates dedicated voice channel per project |
| Command works anywhere       | Command only works in project channels          |
| No project context           | Full project context stored in session          |
| User picks voice channel     | Voice channel picked by project name            |

### Backwards Compatibility

⚠️ **Breaking Change**: Users can no longer use `/voice join` in their own voice channels.

**Migration Path:**

1. User must be in a project text channel (e.g., `#my-app`)
2. User types `/voice join`
3. Bot creates/joins `🎙️-my-app`
4. User manually joins `🎙️-my-app` voice channel

## Testing Checklist

- [ ] `/voice join` in non-project channel → Error message
- [ ] `/voice join` in project channel → Voice channel created
- [ ] `/voice join` when voice channel exists → Reuses existing channel
- [ ] `/voice join` twice → Error: already in session
- [ ] `/voice leave` → Successfully disconnects
- [ ] `/voice status` → Shows project info
- [ ] Voice channel naming correct: `🎙️-{project-name}`
- [ ] Multiple projects → Multiple voice channels created
- [ ] Session stores correct `projectPath`
- [ ] Session stores correct `projectChannelId`

## Next Steps (Phase 2)

Once audio input/output is implemented:

1. **Audio Input**: Capture user speech from voice channel
2. **STT**: Convert speech to text (Whisper or Realtime API)
3. **Project Routing**: Use `session.projectPath` to route to correct Toji project
4. **TTS**: Convert AI response to speech
5. **Audio Output**: Play response in voice channel
6. **Transcript Logging**: Post conversation to project text channel

## Architecture Benefits

### ✅ Clear Context

Every voice session knows exactly which project it belongs to.

### ✅ Scalable

Multiple projects can have voice sessions simultaneously without interference.

### ✅ User-Friendly

Users don't need to manually specify project context - it's inferred from the channel.

### ✅ Maintainable

Voice channel lifecycle is simple: create on demand, persist across sessions.

### ✅ Future-Proof

Project context is stored but not yet used, making Phase 2 implementation straightforward.

---

**Document Status**: Implemented ✅  
**Last Updated**: 2025-10-04  
**Phase**: 1 - Project-Based Voice Channels  
**Next Phase**: Audio Input/Output Integration
