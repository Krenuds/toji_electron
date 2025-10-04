# Discord Streaming Flow Analysis

## Current Message Round Trip (Blocking)

### 1. User Types in Discord Channel

```
User: "Hey bot, create a new React component"
```

### 2. Discord.js Event Fired

```typescript
// DiscordService receives 'messageCreate' event
client.on('messageCreate', (message) => {
  plugin.handleMessage(message)
})
```

### 3. DiscordPlugin.handleMessage() Processes

```typescript
async handleMessage(message: Message): Promise<void> {
  // Ignore bots
  if (message.author.bot) return

  // Check if in project channel
  const isInTojiCategory = await projectManager.isInTojiCategory(message.channel.id)

  if (isInTojiCategory && projectManager.isProjectChannel(message.channel.id)) {
    // Switch to project
    await projectManager.switchToProject(message.channel.id)

    // Show typing indicator (lasts 10 seconds)
    await message.channel.sendTyping()

    // Process with streaming
    await projectManager.chatStreaming(message.content, {
      onChunk: async (text) => {
        // Currently just logs
        log('Streaming update: %d chars', text.length)
      },

      onComplete: async (fullText) => {
        // Send complete response
        await sendDiscordResponse(message, fullText)
      },

      onError: async (error) => {
        await message.reply('❌ Error: ' + error.message)
      }
    })
  }
}
```

### 4. sendDiscordResponse() Sends Reply

```typescript
export async function sendDiscordResponse(
  message: Message,
  response: string
): Promise<Message | undefined> {
  // Handle long messages (split if > 2000 chars)
  if (response.length > DISCORD_MAX_MESSAGE_LENGTH) {
    const chunks = splitMessage(response)
    let firstMessage: Message | undefined
    for (const chunk of chunks) {
      const sent = await message.reply(chunk)
      if (!firstMessage) firstMessage = sent
    }
    return firstMessage
  } else {
    return await message.reply(response)
  }
}
```

### 5. User Sees Response

```
Bot: "Here's your React component: [code block]..."
```

---

## The Problem

**Current Flow:**

```
User types → Typing indicator (10s) → [30-60s silence] → Full response appears
```

**User Experience Issues:**

1. Typing indicator expires after 10 seconds
2. User has no feedback for 30-60+ seconds
3. Appears like bot is frozen/broken
4. No way to cancel or see progress

---

## Discord.js Message Editing Capabilities

### Discord Message API Features

#### 1. **Message.reply()** - Initial Response

```typescript
const sentMessage = await message.reply('Initial text')
// Returns: Message object
```

#### 2. **Message.edit()** - Update Existing Message

```typescript
await sentMessage.edit('Updated text')
// Can be called multiple times
```

#### 3. **Message.edit() with Embeds**

```typescript
import { EmbedBuilder } from 'discord.js'

const embed = new EmbedBuilder()
  .setColor(0x33b42f)
  .setTitle('🤖 Processing...')
  .setDescription('Generating response...')
  .addFields({ name: 'Progress', value: '25%' })
  .setTimestamp()

await sentMessage.edit({ embeds: [embed] })
```

#### 4. **Combining Text + Embeds**

```typescript
await sentMessage.edit({
  content: 'Here is the partial response...',
  embeds: [progressEmbed]
})
```

#### 5. **Rate Limits**

- **5 message edits per 5 seconds** per channel
- **Solution**: Throttle updates to every 1000ms (1 per second)

---

## Proposed Streaming UI Flow

### Option A: Progressive Text Updates (Simple)

**Flow:**

````
1. User types message
2. Bot replies with: "🤖 Thinking..."
3. Bot edits message every 1s with growing text:
   - "Here's your React..."
   - "Here's your React component:\n\n```tsx\nimport..."
   - "Here's your React component:\n\n```tsx\nimport React...\n\nfunction MyComponent() {\n..."
4. Final edit with complete response
````

**Code:**

```typescript
let sentMessage: Message | undefined
let lastUpdate = Date.now()
const UPDATE_THROTTLE = 1000 // 1 second

await projectManager.chatStreaming(message.content, {
  onChunk: async (text) => {
    const now = Date.now()

    if (!sentMessage) {
      // Send initial message
      sentMessage = await message.reply('🤖 Thinking...')
    } else if (now - lastUpdate >= UPDATE_THROTTLE) {
      // Update with cumulative text
      await sentMessage.edit(text.substring(0, 1990)) // Leave room for indicators
      lastUpdate = now
    }
  },

  onComplete: async (fullText) => {
    if (sentMessage) {
      await sendDiscordResponse(message, fullText) // Final, properly formatted
    }
  }
})
```

**Pros:**

- Simple implementation
- Shows actual content as it arrives
- Users see progress naturally

**Cons:**

- Lots of edits = API calls
- Text might be incomplete/malformed mid-stream
- Code blocks look broken until complete

---

### Option B: Progress Embed + Final Text (Recommended)

**Flow:**

```
1. User types message
2. Bot replies with progress embed:
   ╔═══════════════════════════════════╗
   ║ 🤖 Toji is thinking...           ║
   ║                                   ║
   ║ ▓▓▓▓▓░░░░░░░░░░ 33%              ║
   ║ Status: Generating response...    ║
   ║ Tokens: 150 / ~500               ║
   ╚═══════════════════════════════════╝

3. Update embed every 1s:
   ╔═══════════════════════════════════╗
   ║ 🤖 Toji is working...            ║
   ║                                   ║
   ║ ▓▓▓▓▓▓▓▓▓▓░░░░░ 66%              ║
   ║ Status: Writing code...           ║
   ║ Tokens: 300 / ~500               ║
   ╚═══════════════════════════════════╝

4. Final response replaces embed with text:
   "Here's your React component: [complete code]"
```

**Code:**

```typescript
import { EmbedBuilder } from 'discord.js'
import { DISCORD_COLORS } from '../constants'

let sentMessage: Message | undefined
let lastUpdate = Date.now()
let charCount = 0
const UPDATE_THROTTLE = 1000 // 1 second

await projectManager.chatStreaming(message.content, {
  onChunk: async (text) => {
    charCount = text.length
    const now = Date.now()

    if (!sentMessage) {
      // Send initial progress embed
      const embed = new EmbedBuilder()
        .setColor(DISCORD_COLORS.PENDING)
        .setTitle('🤖 Toji is thinking...')
        .setDescription('Analyzing your request and generating a response...')
        .addFields({ name: '📊 Progress', value: '▓░░░░░░░░░░ 10%' })
        .setTimestamp()

      sentMessage = await message.reply({ embeds: [embed] })
      lastUpdate = now
    } else if (now - lastUpdate >= UPDATE_THROTTLE) {
      // Update progress embed
      const progress = Math.min(90, Math.floor((charCount / 2000) * 100)) // Max 90% until complete
      const progressBar = createProgressBar(progress)

      const embed = new EmbedBuilder()
        .setColor(DISCORD_COLORS.PENDING)
        .setTitle('🤖 Toji is working...')
        .setDescription('Writing response...')
        .addFields(
          { name: '📊 Progress', value: progressBar },
          { name: '📝 Characters', value: `${charCount}`, inline: true }
        )
        .setTimestamp()

      await sentMessage.edit({ embeds: [embed] })
      lastUpdate = now
    }
  },

  onComplete: async (fullText) => {
    if (sentMessage) {
      // Replace embed with final text response
      await sentMessage.delete() // Remove progress message
    }
    await sendDiscordResponse(message, fullText) // Send complete response
  },

  onError: async (error) => {
    if (sentMessage) {
      const embed = new EmbedBuilder()
        .setColor(DISCORD_COLORS.ERROR)
        .setTitle('❌ Error')
        .setDescription(error.message)
        .setTimestamp()

      await sentMessage.edit({ embeds: [embed] })
    }
  }
})

function createProgressBar(percent: number): string {
  const filled = Math.floor(percent / 10)
  const empty = 10 - filled
  return '▓'.repeat(filled) + '░'.repeat(empty) + ` ${percent}%`
}
```

**Pros:**

- Clean, professional UI
- No broken/malformed text visible
- Progress indicator keeps user engaged
- Final response is clean and complete
- Can add rich metadata (tokens, status, etc.)

**Cons:**

- More complex to implement
- Need to delete/replace message at end

---

### Option C: Hybrid - Embed + Partial Text

**Flow:**

````
1. Send progress embed
2. Add growing text field in embed
3. Replace with final formatted response

╔═══════════════════════════════════╗
║ 🤖 Toji is working... (66%)      ║
║                                   ║
║ Preview:                          ║
║ Here's your React component:     ║
║ ```tsx                            ║
║ import React from 'react'...     ║
║                                   ║
║ [Streaming in progress...]        ║
╚═══════════════════════════════════╝
````

**Pros:**

- Best of both worlds
- Users see content AND progress

**Cons:**

- Most complex
- Embed description has character limits (4096)
- Might look cluttered

---

## Recommendation: **Option B (Progress Embed)**

### Why?

1. **Professional UI** - Looks polished and intentional
2. **Clear Feedback** - User knows exactly what's happening
3. **No Visual Glitches** - No broken code blocks or malformed text
4. **Extensible** - Can add more metadata (model used, tokens, time, etc.)
5. **Works with Long Responses** - No truncation issues during streaming

### Implementation Checklist

- [ ] Create `createProgressEmbed()` utility in `utils/messages.ts`
- [ ] Create `updateProgressEmbed()` utility
- [ ] Create `createProgressBar()` helper
- [ ] Add throttling logic (1000ms) to `DiscordPlugin.handleMessage()`
- [ ] Handle both project channels and @mentions
- [ ] Add error embed fallback
- [ ] Test with long responses (>2000 chars)
- [ ] Test rate limiting behavior
- [ ] Add unit tests for embed creation

### Files to Modify

1. **`src/plugins/discord/utils/messages.ts`**
   - Add embed creation utilities
   - Export progress bar helpers

2. **`src/plugins/discord/DiscordPlugin.ts`**
   - Update both streaming callback blocks (lines 123 & 159)
   - Add throttling logic
   - Handle message deletion and replacement

3. **`src/plugins/discord/constants.ts`**
   - Already has `DISCORD_COLORS.PENDING` - good to go!

---

## Additional Enhancements (Future)

### 1. Show Token Count (if available from OpenCode SDK)

```typescript
.addFields({ name: '🔢 Tokens', value: `${tokens} / ~${estimatedTotal}` })
```

### 2. Show Time Elapsed

```typescript
const elapsed =
  Date.now() - startTime.addFields({ name: '⏱️ Time', value: `${Math.floor(elapsed / 1000)}s` })
```

### 3. Show Model Being Used

```typescript
.addFields({ name: '🤖 Model', value: 'Claude 3.5 Sonnet' })
```

### 4. Cancel Button (Advanced)

```typescript
import { ActionRowBuilder, ButtonBuilder, ButtonStyle } from 'discord.js'

const row = new ActionRowBuilder().addComponents(
  new ButtonBuilder()
    .setCustomId('cancel_generation')
    .setLabel('Cancel')
    .setStyle(ButtonStyle.Danger)
)

await sentMessage.edit({ embeds: [embed], components: [row] })
```

---

## Next Steps

1. ✅ Research Discord.js embed API (DONE)
2. ⏭️ Implement Option B progress embeds
3. ⏭️ Test with real Discord bot
4. ⏭️ Add throttling and rate limit handling
5. ⏭️ Create reusable embed utilities
6. ⏭️ Document patterns for future features
