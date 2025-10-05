# Discord Embed System Specification

## Overview

Real-time progress embeds during AI response generation showing activity indicators, character counts, and tool usage for 30-60+ second operations.

## Core Architecture

**Key Files:**
- `src/plugins/discord/utils/messages.ts` - Embed builders and activity indicators
- `src/plugins/discord/DiscordPlugin.ts` - Message handlers with embed lifecycle
- `src/plugins/discord/constants.ts` - Color palette

**Data Flow:**
```
OpenCode SDK → Toji Main Process → DiscordPlugin → messages.ts → Discord API
```

## Embed Lifecycle

### States

1. **Initial** (First Chunk)
   - `onChunk → createProgressEmbed() → message.reply()`
   - Shows: 🤖 "Toji is thinking...", ⚡ "Processing...", 📊 Activity, 📝 Chars, 🔧 Tools

2. **Update** (Every 1 Second, Throttled)
   - `onChunk → updateProgressEmbed() → message.edit()`
   - Shows: 🤖 "Toji is working...", cycling chevrons (⟩⟩⟩), character count, tool list

3. **Tool Event** (Immediate, Not Throttled)
   - `onTool → updateProgressEmbed() → message.edit()`
   - Updates when tools start/complete

4. **Completion**
   - `onComplete → progressMessage.delete() → sendDiscordResponse()`

5. **Error**
   - `onError → createErrorEmbed() → message.edit()`

## Activity Indicator

**Location:** `src/plugins/discord/utils/messages.ts` → `createActivityIndicator(updateCount)`

**Formula:**
```typescript
const chevronCount = Math.min(5, (updateCount % 5) + 1)
const chevrons = '⟩'.repeat(chevronCount)
const spaces = ' '.repeat(5 - chevronCount)
return `${chevrons}${spaces} ${updateCount} updates`
```

**Pattern:** Cycles 1-5 chevrons: `⟩`, `⟩⟩`, `⟩⟩⟩`, `⟩⟩⟩⟩`, `⟩⟩⟩⟩⟩`, then repeats

## Tool Activity Tracking

**Location:** `src/plugins/discord/utils/messages.ts` → `ToolActivity` interface

```typescript
interface ToolActivity {
  pending: string[]
  running: Map<string, { name: string; title?: string }>
  completed: string[]
  errors: string[]
}
```

**Display:** `🔄` Running, `✅` Completed, `❌` Error
**Update:** `updateToolActivity(tools, event)` called on `onTool` events

## Throttling System

**Purpose:** Prevent Discord API rate limiting (max 5 edits per 5 seconds per channel)

**Implementation:**
```typescript
const UPDATE_THROTTLE = 1000 // 1 second between updates
if (now - lastUpdate >= UPDATE_THROTTLE) {
  updateCount++
  await progressMessage.edit({ embeds: [embed] })
  lastUpdate = now
}
```

**Critical:** Only increment `updateCount` on actual updates, not every chunk
**Exception:** Tool events bypass throttling for immediate feedback

## Color Palette

**File:** `src/plugins/discord/constants.ts` → `DISCORD_COLORS`

```typescript
DISCORD_COLORS.PENDING  // 0xffa500 (orange) - progress embeds
DISCORD_COLORS.SUCCESS  // 0x33b42f (green)  - completed
DISCORD_COLORS.ERROR    // 0xff0000 (red)    - errors
DISCORD_COLORS.INFO     // 0x3b82f6 (blue)   - informational
```

## Key Edit Points

### Activity Indicator Style
`messages.ts` → `createActivityIndicator()` - Replace chevron formula

### Embed Colors
`constants.ts` → `DISCORD_COLORS` - Modify hex values

### Update Frequency
`DiscordPlugin.ts` → `UPDATE_THROTTLE = 1000` - Change milliseconds (Warning: Discord limits 5 edits/5sec)

### Embed Fields
`messages.ts` → `createProgressEmbed()` or `updateProgressEmbed()` - Add/modify fields with `embed.addFields()`

### Titles/Descriptions
`messages.ts` → `.setTitle()`, `.setDescription()` in embed builders

## Debugging

**Logs:** `C:\Users\[user]\AppData\Roaming\toji3\logs\toji-YYYY-MM-DD.log`

**Search Terms:**
- `onChunk fired` - Throttling behavior
- `Updated progress embed` - Actual updates
- `Throttled: skipping` - Skipped updates
- `Tool event` - Tool activity

**Common Issues:**

1. **Chevrons not animating:**
   - `updateCount++` only on actual updates
   - Verify throttling (1000ms intervals)

2. **Wrong update frequency:**
   - Adjust `UPDATE_THROTTLE`
   - Check Discord rate limits (5/5sec)

3. **Tool section missing:**
   - Verify `onTool` callback registered
   - Check `updateToolActivity()` is called
   - Ensure tool events have `status: 'running'/'completed'`

4. **Embed not deleting:**
   - Check `onComplete` deletes `progressMessage`
   - Verify completion flow

## Testing Essentials

- [ ] Short response (<1000 chars)
- [ ] Long response (>2000 chars)
- [ ] With tool usage
- [ ] Error handling
- [ ] Chevron animation
- [ ] Character count updates
- [ ] Tool list display
- [ ] Visual correctness in Discord
- [ ] Run `npm run typecheck` and `npm run format`

## References

- Discord.js Embed Docs: <https://discord.js.org/docs/packages/builders/main/EmbedBuilder:Class>
- Discord Rate Limits: 5 edits per 5 seconds per channel
- OpenCode SDK Events: `message.part.updated`, `session.idle`, `session.error`

**Status:** ✅ Fully Implemented
