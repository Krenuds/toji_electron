# Discord Embed System Specification

## Overview

The Discord bot displays real-time progress embeds during AI response generation, showing activity indicators, character counts, and tool usage. This provides users with continuous visual feedback during potentially long-running operations (30-60+ seconds).

---

## Core Architecture

### Files

| File                                    | Purpose                                |
| --------------------------------------- | -------------------------------------- |
| `src/plugins/discord/utils/messages.ts` | Embed builders and activity indicators |
| `src/plugins/discord/DiscordPlugin.ts`  | Message handlers with embed lifecycle  |
| `src/plugins/discord/constants.ts`      | Color palette for embeds               |

### Data Flow

```text
OpenCode SDK Event Stream
    ↓
Toji Main Process (src/main/toji/index.ts)
    ↓ (IPC callbacks: onChunk, onTool, onComplete, onError)
DiscordPlugin Message Handlers
    ↓ (creates/updates embeds via)
messages.ts Embed Builders
    ↓ (sends to)
Discord API
```

---

## Embed Lifecycle

### 1. Initial State (First Chunk)

```javascript
onChunk fires → createProgressEmbed() → message.reply()
```

Shows:

- 🤖 Title: "Toji is thinking..."
- ⚡ Description: "Processing your request..."
- 📊 Activity: "⟩ 1 updates"
- 📝 Characters: (if > 0)
- 🔧 Tools: (if any active)

### 2. Update State (Every 1 Second)

```javascript
onChunk fires (throttled) → updateProgressEmbed() → message.edit()
```

Shows:

- 🤖 Title: "Toji is working..."
- ⚡ Description: "Generating response..."
- 📊 Activity: "⟩⟩⟩ 3 updates" (cycles 1-5 chevrons)
- 📝 Characters: 1,234 (formatted with commas)
- 🔧 Tools: Running/completed tool list

### 3. Tool Event State (Immediate)

```javascript
onTool fires → updateProgressEmbed() → message.edit()
```

**Not throttled** - updates immediately for important events:

- Tool starts running
- Tool completes

### 4. Completion State

```javascript
onComplete fires → progressMessage.delete() → sendDiscordResponse()
```

Removes progress embed and sends final response text.

### 5. Error State

```javascript
onError fires → createErrorEmbed() → message.edit()
```

Replaces progress with error embed showing helpful suggestions.

---

## Activity Indicator

### Location

`src/plugins/discord/utils/messages.ts` → `createActivityIndicator(updateCount)`

### Behavior

Shows cycling chevrons based on update count:

- Update 1: `⟩     1 updates`
- Update 2: `⟩⟩    2 updates`
- Update 3: `⟩⟩⟩   3 updates`
- Update 4: `⟩⟩⟩⟩  4 updates`
- Update 5: `⟩⟩⟩⟩⟩ 5 updates`
- Update 6: `⟩     6 updates` (cycles back)

### Formula

```typescript
const chevronCount = Math.min(5, (updateCount % 5) + 1)
const chevrons = '⟩'.repeat(chevronCount)
const spaces = ' '.repeat(5 - chevronCount)
return `${chevrons}${spaces} ${updateCount} updates`
```

### Why This Works

- **Visual animation** - Chevrons cycle to show activity
- **No fake progress** - Count shows actual events, not estimated percentage
- **Honest feedback** - Users see real data, not misleading bars

---

## Tool Activity Tracking

### File Location

`src/plugins/discord/utils/messages.ts` → `ToolActivity` interface

### Structure

```typescript
interface ToolActivity {
  pending: string[] // Tool call IDs pending
  running: Map<string, { name: string; title?: string }> // Currently running
  completed: string[] // Tool names completed
  errors: string[] // Tool names that errored
}
```

### Display Format

```text
🔧 Tools

- `🔄` = Running
- `✅` = Completed
- `❌` = Error

### Update Function

`updateToolActivity(tools, event)` - Called when `onTool` fires

---

## Throttling System

### Purpose

Prevent Discord API rate limiting (max 5 edits per 5 seconds per channel)

### Implementation

```typescript
const UPDATE_THROTTLE = 1000 // 1 second between updates
let lastUpdate = Date.now()

if (now - lastUpdate >= UPDATE_THROTTLE) {
  // Actually update embed
  updateCount++
  await progressMessage.edit({ embeds: [embed] })
  lastUpdate = now
} else {
  // Skip this update
  log('⏸️ Throttled: skipping update')
}
```

### Critical Rule

**Only increment `updateCount` when embed ACTUALLY updates**, not on every chunk event.

### Exceptions

Tool events (`onTool`) **bypass throttling** for immediate feedback on important actions.

---

## Color Palette

### Constants File

`src/plugins/discord/constants.ts` → `DISCORD_COLORS`

### Usage

```typescript
DISCORD_COLORS.PENDING // 0xffa500 (orange) - active operations
DISCORD_COLORS.SUCCESS // 0x33b42f (green)  - completed
DISCORD_COLORS.ERROR // 0xff0000 (red)    - errors
DISCORD_COLORS.INFO // 0x3b82f6 (blue)   - informational
```

Progress embeds use `PENDING` (orange).

---

## Common Edit Scenarios

### Change Activity Indicator Style

**File:** `src/plugins/discord/utils/messages.ts`  
**Function:** `createActivityIndicator(updateCount: number)`

Replace chevron animation with:

- Spinner: `const frames = ['⠋', '⠙', '⠹', '⠸', '⠼', '⠴', '⠦', '⠧', '⠇', '⠏']`
- Dots: `const dots = '●'.repeat(count) + '○'.repeat(5 - count)`
- Custom: Modify the formula

### Change Embed Colors

**File:** `src/plugins/discord/constants.ts`  
Modify `DISCORD_COLORS` values (use hex: `0xRRGGBB`)

### Add New Embed Fields

**File:** `src/plugins/discord/utils/messages.ts`  
**Functions:** `createProgressEmbed()` or `updateProgressEmbed()`

```typescript
embed.addFields({
  name: '⏱️ Time',
  value: `${elapsedSeconds}s`,
  inline: true
})
```

### Change Update Frequency

**File:** `src/plugins/discord/DiscordPlugin.ts`  
**Line:** `const UPDATE_THROTTLE = 1000`

Change milliseconds (1000 = 1 second). **Warning:** Discord limits 5 edits per 5 seconds.

### Add Thumbnail/Image

**File:** `src/plugins/discord/utils/messages.ts`

```typescript
embed
  .setThumbnail('https://your-url.com/icon.png') // Small top-right
  .setImage('https://your-url.com/banner.png') // Large bottom
```

### Change Titles/Descriptions

**File:** `src/plugins/discord/utils/messages.ts`

```typescript
.setTitle('🤖 Custom Title')
.setDescription('⚡ Custom description')
```

---

## Debugging

### Enable Detailed Logs

Check: `C:\Users\[user]\AppData\Roaming\toji3\logs\toji-YYYY-MM-DD.log`

Search for:

- `onChunk fired` - Shows throttling behavior
- `Updated progress embed` - Confirms embed updates
- `Throttled: skipping` - Shows skipped updates
- `Tool event` - Shows tool activity

### Common Issues

**Chevrons jumping/not animating:**

- Check `updateCount++` only happens when embed updates (not on every chunk)
- Verify throttling is working (1000ms between updates)

**Updates too slow/fast:**

- Adjust `UPDATE_THROTTLE` constant
- Check Discord rate limiting (max 5 edits/5sec)

**Tool section not showing:**

- Verify `onTool` callback is registered
- Check `updateToolActivity()` is being called
- Ensure tool events have `status: 'running'` or `'completed'`

**Embed not deleting on completion:**

- Check `onComplete` callback deletes `progressMessage`
- Verify no errors preventing completion flow

---

## Future Enhancements

### Potential Features (Not Implemented)

1. **Elapsed Time Tracking**

   ```typescript
   const startTime = Date.now()
   const elapsed = Math.floor((Date.now() - startTime) / 1000)
   embed.addFields({ name: '⏱️ Time', value: `${elapsed}s` })
   ```

2. **Token Count Display**

   ```typescript
   embed.addFields({ name: '🔢 Tokens', value: `~${estimatedTokens}` })
   ```

3. **Model Information**

   ```typescript
   embed.addFields({ name: '🤖 Model', value: modelName })
   ```

4. **Cancel Button**

   ```typescript
   import { ActionRowBuilder, ButtonBuilder } from 'discord.js'
   const button = new ButtonBuilder()
     .setCustomId('cancel_generation')
     .setLabel('Cancel')
     .setStyle(ButtonStyle.Danger)
   ```

5. **Response Preview**

   ```typescript
   embed.setDescription(`Preview: ${responseText.slice(0, 100)}...`)
   ```

---

## Testing Checklist

Before committing embed changes:

- [ ] Test short response (<1000 chars)
- [ ] Test long response (>2000 chars)
- [ ] Test with tool usage (file read, grep, etc.)
- [ ] Test error handling (disconnect mid-stream)
- [ ] Test in project channel
- [ ] Test with @mention (outside Toji category)
- [ ] Verify chevrons animate smoothly
- [ ] Verify character count updates
- [ ] Verify tool list displays correctly
- [ ] Check Discord for visual correctness (colors, layout)
- [ ] Run `npm run typecheck`
- [ ] Run `npm run format`
- [ ] Commit with conventional commit message

---

## Quick Start for AI

### "I need to modify the Discord progress embeds"

1. **Read this spec file** to understand architecture
2. **Identify what to change** (see "Common Edit Scenarios")
3. **Locate the file** (usually `messages.ts` or `DiscordPlugin.ts`)
4. **Make changes** following existing patterns
5. **Test** using checklist above
6. **Format and commit** with conventional message

### "The embeds aren't updating correctly"

1. **Check logs** in `AppData\Roaming\toji3\logs\`
2. **Verify throttling** - should update every ~1 second
3. **Check `updateCount` logic** - only increments on actual updates
4. **Review callbacks** - `onChunk`, `onTool`, `onComplete` all registered?
5. **See "Debugging" section** above

### "I want to add a new feature to embeds"

1. **Read "Future Enhancements"** section
2. **Determine data source** - do we have the data?
3. **Add to embed builders** in `messages.ts`
4. **Pass data through** from `DiscordPlugin.ts`
5. **Test thoroughly** per checklist

---

## References

- **Discord.js Embed Documentation:** <https://discord.js.org/docs/packages/builders/main/EmbedBuilder:Class>
- **Discord Rate Limits:** 5 edits per 5 seconds per channel
- **OpenCode SDK Events:** `message.part.updated`, `session.idle`, `session.error`
- **Related Specs:** `DISCORD_STREAMING_FLOW.md`, `TOOL_EVENT_TRACKING.md`

---

**Last Updated:** October 4, 2025  
**Status:** ✅ Fully Implemented and Working
