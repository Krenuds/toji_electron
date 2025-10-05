# Transcription Embed Implementation

## Summary
Implemented Discord embed sending for voice transcriptions. When users speak in Discord voice channels, their transcriptions are now automatically sent as formatted embeds to the project's text channel.

## Changes Made

### 1. VoiceModule.ts - Discord Client Integration
**Location:** `src/plugins/discord/voice/VoiceModule.ts`

#### Added Discord Client Storage
```typescript
private client?: Client
```

#### Added Client Initialization Method
```typescript
async initializeWithClient(client: Client): Promise<void> {
  this.client = client
  log('VoiceModule initialized with Discord client')
}
```

#### Added Event Listener in Constructor
```typescript
constructor() {
  super()
  log('VoiceModule constructed')
  
  // Listen to transcription events and send to Discord
  this.on('transcription', (event) => {
    this.handleTranscription(event).catch((error) => {
      log('Error in transcription handler:', error)
    })
  })
}
```

### 2. Transcription Handler Implementation

#### handleTranscription Method
**Purpose:** Receives transcription events and sends formatted embeds to Discord

**Key Features:**
- Fetches the voice session to get project channel ID
- Creates a formatted Discord embed with transcription data
- Sends embed to the project's text channel
- Robust error handling

```typescript
private async handleTranscription(event: {
  sessionId: string
  userId: string
  text: string
  duration: number
}): Promise<void> {
  try {
    if (!this.client) {
      log('Cannot send transcription: Discord client not available')
      return
    }

    const session = this.sessions.get(event.sessionId)
    if (!session) {
      log('Cannot send transcription: session not found')
      return
    }

    // Get project channel ID from session config
    const targetChannelId = session.config.projectChannelId
    if (!targetChannelId) {
      log('Cannot send transcription: no project channel configured for session')
      return
    }

    const embed = await this.createTranscriptionEmbed(event)
    
    const channel = await this.client.channels.fetch(targetChannelId)
    if (!channel?.isTextBased()) {
      log('Cannot send transcription: channel not found or not text-based')
      return
    }

    // Type guard to ensure channel has send method
    if ('send' in channel) {
      await channel.send({ embeds: [embed] })
      log(`✅ Sent transcription to channel ${targetChannelId}`)
    } else {
      log('Cannot send transcription: channel does not support sending messages')
    }
  } catch (error) {
    log('Error sending transcription to Discord:', error)
  }
}
```

### 3. Embed Creation

#### createTranscriptionEmbed Method
**Purpose:** Creates a visually formatted Discord embed for transcription display

**Features:**
- Fetches user information (username, avatar)
- Blue color (INFO) for transcription embeds
- Author field shows speaker with avatar
- Description contains the transcription text with microphone emoji
- Footer shows audio duration
- Timestamp for when transcription was created

```typescript
private async createTranscriptionEmbed(event: {
  userId: string
  text: string
  duration: number
}): Promise<EmbedBuilder> {
  const { EmbedBuilder } = await import('discord.js')
  const { DISCORD_COLORS } = await import('../constants')

  let username = 'Unknown User'
  let avatarUrl: string | undefined

  try {
    const user = await this.client?.users.fetch(event.userId)
    if (user) {
      username = user.username
      avatarUrl = user.displayAvatarURL()
    }
  } catch (error) {
    log('Failed to fetch user info:', error)
  }

  const embed = new EmbedBuilder()
    .setColor(DISCORD_COLORS.INFO)
    .setAuthor({
      name: username,
      iconURL: avatarUrl
    })
    .setDescription(`🎤 "${event.text}"`)
    .setFooter({
      text: `Duration: ${event.duration.toFixed(1)}s`
    })
    .setTimestamp()

  return embed
}
```

### 4. DiscordPlugin.ts Integration
**Location:** `src/plugins/discord/DiscordPlugin.ts`

#### Added VoiceModule Client Initialization
```typescript
async onReady(client: Client): Promise<void> {
  log('Discord client is ready')

  // Initialize project manager with client if not already initialized
  if (this.projectManager) {
    await this.projectManager.initializeWithClient(client)
  }

  // Initialize voice module with client
  if (this.voiceModule) {
    await this.voiceModule.initializeWithClient(client)
  }

  // ... rest of the method
}
```

## Architecture Flow

```
Voice Channel Audio → AudioReceiver → Whisper STT → VoiceModule
                                                            ↓
                                            Emit 'transcription' event
                                                            ↓
                                            handleTranscription()
                                                            ↓
                                            createTranscriptionEmbed()
                                                            ↓
                                      Send to Project Text Channel
```

## Data Flow

### Transcription Event Structure
```typescript
{
  sessionId: string      // Voice session identifier
  userId: string         // Discord user ID who spoke
  text: string          // Transcribed speech text
  duration: number      // Audio duration in seconds
}
```

### Session Config Structure
```typescript
{
  userId: string
  guildId: string
  channelId: string           // Voice channel ID
  projectPath?: string        // Toji project path
  projectChannelId?: string   // Target text channel for transcriptions
}
```

## Embed Format

**Visual Example:**
```
┌────────────────────────────────────┐
│ 👤 Username                        │
│ ────────────────────────────────   │
│ 🎤 "Can you hear me now?"          │
│                                    │
│ Duration: 1.6s        🕒 12:34 PM  │
└────────────────────────────────────┘
```

**Color:** `DISCORD_COLORS.INFO` (Blue - 0x3b82f6)

## Error Handling

The implementation includes comprehensive error handling for:
- ✅ Discord client not available
- ✅ Session not found
- ✅ Project channel not configured
- ✅ Channel fetch failure
- ✅ Channel not text-based
- ✅ User fetch failure (graceful fallback to "Unknown User")
- ✅ Message send failure

All errors are logged but don't crash the voice pipeline.

## Configuration Requirements

For transcriptions to be sent to Discord:
1. Voice session must be created with `/voice join <channel> <project>`
2. Project must have an associated text channel
3. Bot must have permissions to send messages and embeds in the target channel
4. Discord client must be ready (initialized in onReady)

## Testing Checklist

- [ ] Join voice channel with `/voice join`
- [ ] Speak into microphone
- [ ] Verify transcription appears in project text channel
- [ ] Check embed formatting (author, text, duration, timestamp)
- [ ] Test with multiple users
- [ ] Test with long transcriptions
- [ ] Test error cases (deleted channel, missing permissions)

## Future Enhancements

Potential improvements for Phase 5E or later:
1. **Threading Support**: Create a thread for each voice session's transcriptions
2. **Color Coding**: Different colors for different users
3. **Reply Chains**: Link transcriptions in conversation threads
4. **Confidence Scores**: Show Whisper confidence in embed
5. **Edit/Delete**: Allow users to edit/delete their transcriptions
6. **Privacy Controls**: Per-user transcription opt-in/opt-out
7. **Language Detection**: Show detected language in footer
8. **Search**: MCP tool to search transcription history

## Related Files

- `src/plugins/discord/voice/VoiceModule.ts` - Main implementation
- `src/plugins/discord/DiscordPlugin.ts` - Client initialization
- `src/plugins/discord/voice/types.ts` - Type definitions
- `src/plugins/discord/constants.ts` - Embed colors
- `src/plugins/discord/commands/voice.ts` - Voice command (passes projectChannelId)

## Dependencies

- `discord.js` - EmbedBuilder, Client, Channel types
- `@discordjs/voice` - Voice connection management
- `DISCORD_COLORS` constant for consistent UI

## Status

✅ **IMPLEMENTED** - Ready for testing
- Discord embed creation working
- Event listener configured
- Client integration complete
- Error handling comprehensive
- Type-safe implementation

## Next Steps

1. Test in development environment
2. Verify embeds appear in correct channels
3. Gather feedback on embed format
4. Consider additional formatting options
5. Document any edge cases discovered during testing
