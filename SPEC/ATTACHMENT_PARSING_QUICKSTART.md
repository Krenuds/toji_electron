# @filename Attachment Parsing - Quick Start

**Feature:** Optional natural language image attachment parsing  
**Status:** ✅ Implemented  
**Commit:** 1799061  
**Date:** October 6, 2025

## TL;DR

You can now use `@filename.png` syntax in messages to attach images, inspired by OpenCode TUI:

```typescript
// Enable parsing with 5th parameter
await toji.chat(
  'Please analyze @screenshot.png',
  undefined, // sessionId
  undefined, // images
  true // parseAttachments - OPT-IN
)
```

## Two Ways to Attach Images

### 1. Explicit (Default) - Already Working

```typescript
// Programmatic - clear intent
await toji.chat('Describe this', undefined, [{ path: 'C:\\image.png' }])
```

**Use when:** Discord attachments, UI file pickers, API calls

### 2. Natural Language (Opt-In) - NEW

```typescript
// Natural language - parsed from message
await toji.chat('Compare @before.png and @after.png', undefined, undefined, true)
```

**Use when:** User mentions files in conversation

## Why Opt-In?

**Default:** `parseAttachments = false`

**Reason:** Prevents surprises. `"Email @john@company.com"` shouldn't parse as file attachment.

## What Gets Parsed

- ✅ `@filename.png` - relative to project directory
- ✅ `@./subfolder/image.jpg` - explicit relative
- ✅ `@C:\\absolute\\path.png` - absolute Windows
- ✅ `@/unix/absolute.gif` - absolute Unix

**Validation:**

- File must exist on disk
- Must have image extension (.png, .jpg, .jpeg, .gif, .webp, .bmp)
- Invalid references are ignored (not an error)

## Message Transformation

**Input:** `"Analyze @screenshot.png"`  
**Sent to AI:** `"Analyze [Attached: screenshot.png]"`  
**Attached:** Base64-encoded FilePart for screenshot.png

## Current Implementation Status

| Component               | Status      | Notes                     |
| ----------------------- | ----------- | ------------------------- |
| Parser utility          | ✅ Complete | `attachment-parser.ts`    |
| chat() support          | ✅ Complete | Optional 4th param        |
| chatStreaming() support | ✅ Complete | Optional 5th param        |
| IPC handler             | ✅ Complete | Forwards parseAttachments |
| Preload API             | ✅ Complete | Exposed to renderer       |
| Type definitions        | ✅ Complete | Full typing               |
| Documentation           | ✅ Complete | Updated specs             |
| Discord integration     | ⏳ TODO     | Still uses explicit       |
| UI integration          | ⏳ TODO     | No UI yet                 |
| Tests                   | ⏳ TODO     | Needs testing             |

## Next Steps

1. **Test with real images** - Validate parsing works correctly
2. **Discord integration** - Update DiscordPlugin to use explicit attachments
3. **UI implementation** - Add file picker or drag-drop
4. **Consider enabling by default** - If no issues found after testing

## Files Added/Modified

- **NEW:** `src/main/toji/attachment-parser.ts` - Parser utility
- **MODIFIED:** `src/main/toji/index.ts` - Added parseAttachments parameter
- **MODIFIED:** `src/main/handlers/toji.handlers.ts` - IPC handler update
- **MODIFIED:** `src/preload/api/toji.api.ts` - Preload API update
- **NEW:** `SPEC/TUI_MIGRATION_ANALYSIS.md` - Design rationale
- **UPDATED:** `SPEC/IMAGE_SUPPORT.md` - Usage examples

## Architecture Decision

We chose **conservative opt-in** over full TUI control:

- ✅ Zero breaking changes
- ✅ Keep session.prompt() control
- ✅ No TUI process dependency
- ✅ Works with existing code
- ✅ Can enable per-call basis

See `SPEC/TUI_MIGRATION_ANALYSIS.md` for full analysis of alternatives.
