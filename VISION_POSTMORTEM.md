# Vision Integration Post-Mortem: Why It Didn't Work

**Date:** October 6, 2025  
**Commit:** `e1a05ac` - feat(mcp): add view_image tool with AI vision integration  
**Status:** ⚠️ Reverted - Fundamental architectural mismatch

---

## Executive Summary

We attempted to add AI vision capabilities to Toji3 by creating an MCP tool (`view_image`) that would allow the AI to analyze images. After implementation and testing, we discovered a **fundamental architectural incompatibility** between MCP tools and OpenCode SDK's vision processing.

**The Problem:** MCP tools return content to the AI _after_ a tool call completes, but vision images need to be part of the _initial_ message sent to the LLM, not the tool response.

**Result:** The AI received the text prompt ("Describe this image in detail") but never received the actual image data, making vision analysis impossible.

---

## What We Built

### Implementation Overview

**Files Created (545 lines):**

1. **`src/main/toji/mcp/services/image-viewer.ts`** (291 lines)
   - Generic service supporting 3 source types (Discord, project, absolute)
   - Base64 encoding, MIME detection, path security
   - 5MB size limit, format validation

2. **`src/main/toji/mcp/tools/view-image.ts`** (119 lines)
   - MCP tool registration with Zod validation
   - Returns `ImageContent` with base64 data + MIME type
   - Custom prompt support

3. **`src/plugins/discord/utils/discord-image-fetcher.ts`** (89 lines)
   - Discord-specific attachment fetching
   - Message lookup with channel optimization

4. **Documentation** (3 spec docs + implementation summary)

**Modified Files:**

- `src/main/toji/index.ts` - Registered service
- `src/main/toji/mcp/mcp-manager.ts` - Added service routing
- `src/plugins/discord/DiscordPlugin.ts` - Discord fetcher integration

**Dependencies:**

- Installed `@types/mime-types` for TypeScript support

### Architecture Design

```text
┌─────────────────────────────────────────────────────────────┐
│                         MAIN PROCESS                        │
├─────────────────────────────────────────────────────────────┤
│  ImageViewerService (Generic, Reusable)                     │
│    ├─ viewImage(source: Discord | Project | Absolute)       │
│    ├─ Base64 encoding                                       │
│    ├─ MIME type detection                                   │
│    └─ Security (path sanitization, size limits)             │
│                                                              │
│  view_image MCP Tool                                        │
│    ├─ Zod validation for sources                            │
│    └─ Returns ImageContent { type, data, mimeType }         │
└─────────────────────────────────────────────────────────────┘
         ▲
         │ (uses service)
         │
┌─────────────────────────────────────────────────────────────┐
│                     DISCORD PLUGIN                          │
├─────────────────────────────────────────────────────────────┤
│  DiscordImageFetcher                                        │
│    └─ Fetches attachments from Discord messages            │
└─────────────────────────────────────────────────────────────┘
```

**Design Principles:**

- ✅ Clean separation of concerns
- ✅ Generic service in main process (reusable)
- ✅ Plugin-specific helpers (Discord fetcher)
- ✅ Service registry pattern for decoupling
- ✅ Full TypeScript typing
- ✅ Comprehensive error handling
- ✅ Security measures (path traversal, size limits)

### What Worked

✅ **Service architecture** - Clean, generic, extensible  
✅ **File loading** - Successfully read images from all 3 sources  
✅ **Base64 encoding** - Correctly converted images to base64  
✅ **MIME detection** - Library + magic bytes fallback worked perfectly  
✅ **MCP integration** - Tool registered and invoked correctly  
✅ **Error handling** - Graceful failures with descriptive messages  
✅ **Code quality** - All lint/typecheck gates passed

### Test Results

**From logs (`toji-2025-10-07.log`):**

```log
[1759795854] INFO  mcp:view-image: [view_image] Processing request
[1759795854] INFO  mcp:image-viewer: [ImageViewer] Image processed successfully {
  fileName: 'ChatGPT_Image_Sep_13_2025_12_13_09_PM_3.png',
  size: 3643,
  base64Length: 4860
}
[1759795854] INFO  mcp:view-image: [view_image] Image ready for vision analysis
[1759795854] DEBUG toji:chat: Tool event: toji_view_image - completed
```

**Tool execution:** ✅ Success  
**Image loaded:** ✅ 3,643 bytes  
**Base64 encoded:** ✅ 4,860 characters  
**MCP response sent:** ✅ ImageContent with data + mimeType

**AI Response:**

> "The vision analysis is returning the prompt text instead of analyzing the image..."

**Vision analysis:** ❌ **FAILED**

---

## Why It Didn't Work

### The Fundamental Problem

**MCP Tool Response Flow:**

```text
1. User: "image.png what is this?"
2. AI decides to use toji_view_image tool
3. Tool loads image → Returns ImageContent
4. AI receives tool response with ImageContent
5. AI tries to analyze...
   ❌ But the image isn't in the conversation context!
```

**The Issue:** MCP tools are designed to return **structured data** that the AI can read as text/JSON. While MCP SDK supports `ImageContent` in responses, **OpenCode SDK doesn't inject that image data into the actual LLM conversation**.

### How OpenCode TUI Does It (The Right Way)

**From our research (`SPEC/IMAGE_VIEWING_MCP_TOOL.md`):**

```go
// OpenCode TUI - File Picker (internal/tui/components/dialog/filepicker.go)

// 1. User drags & drops image into terminal
// 2. TUI reads file bytes IMMEDIATELY
// 3. Creates Attachment with Content []byte
// 4. Adds to message BEFORE sending to LLM

type Attachment struct {
    FilePath string
    FileName string
    MimeType string
    Content  []byte  // ← Image bytes stored here
}

// 5. When sending to LLM provider:
for _, binaryContent := range msg.BinaryContent() {
    imageURL := openai.ChatCompletionContentPartImageImageURLParam{
        URL: binaryContent.String(models.ProviderOpenAI)  // data:image/png;base64,...
    }
    content = append(content, imageURL)
}
```

**Key Difference:** Images are **attached to the user's message** before sending, not returned by a tool after.

### OpenCode SDK Session.prompt()

**From SDK types (`node_modules/@opencode-ai/sdk/dist/gen/types.gen.d.ts`):**

```typescript
session.prompt({
  path: { id: sessionId },
  body: {
    parts: [
      { type: 'text', text: 'Describe this image' }, // ← Text part
      { type: 'file', mime: 'image/png', url: dataUri } // ← Image part
    ]
  }
})
```

**The parts array is in the body of the prompt call!** Images need to be sent **with the initial message**, not returned by a tool.

### Why MCP Tools Can't Solve This

**MCP Tool Execution Flow:**

```text
User Message → LLM decides to use tool → Tool executes → Tool returns data → LLM reads tool response
```

**Vision requires:**

```text
User Message + Image Data → LLM processes both simultaneously
```

**The disconnect:** By the time the MCP tool returns with image data, the LLM has already received the user's message without the image. The tool response adds context, but the LLM providers need images in the initial message parts array.

---

## What We Tried (Second Approach)

### Attempt to Intercept Messages

We tried to detect image filenames in user messages and auto-attach them:

```typescript
// In Toji.chat() - Before sending to OpenCode
const parts = [{ type: 'text', text: message }]

// Detect "image.png" in message
const imagePattern = /\b([\w-]+\.(?:jpg|jpeg|png|webp|gif|bmp|svg))\b/gi
const imageMatches = message.match(imagePattern)

for (const imageName of imageMatches) {
  const imageData = await imageViewer.viewImage({ type: 'project', projectPath: imageName })
  parts.push({
    type: 'file',
    mime: imageData.mimeType,
    url: `data:${imageData.mimeType};base64,${imageData.base64Data}`
  })
}

await client.session.prompt({
  path: { id: sessionId },
  body: { parts } // ← Send text + images together
})
```

**Why this is also problematic:**

1. **Regex detection is fragile** - What if the filename has spaces? Special characters?
2. **Order matters** - Hard to know which image goes with which part of the message
3. **Discord attachments** - User doesn't type the filename, just uploads
4. **Requires re-architecting** - Complete rewrite of message flow
5. **Complexity explosion** - Need to track attachments, handle errors, manage state

We stopped here because this approach was becoming **too complicated** for the problem it was solving.

---

## Why It Got So Complicated

### 1. **Architectural Mismatch**

MCP tools are designed for:

- ✅ Reading files
- ✅ Searching code
- ✅ Running commands
- ✅ Fetching data
- ❌ **NOT** for vision/binary content in conversations

### 2. **Two-Phase Communication**

```text
Phase 1: User message → AI
Phase 2: AI uses tool → Tool returns data

Vision needs: Single-phase (message + image together)
```

### 3. **Discord Attachment Complexity**

Discord gives us:

- Attachment URLs (need to download)
- Multiple attachments per message
- No filename in user's text
- Need to track which attachment user is referring to

### 4. **OpenCode SDK Limitations**

The SDK's `session.prompt()` expects:

```typescript
parts: Array<TextPartInput | FilePartInput | AgentPartInput>
```

But we don't control when `session.prompt()` is called - the MCP tool is invoked _during_ an existing prompt, not before.

### 5. **State Management Hell**

To make this work, we'd need to:

1. Intercept every message before sending
2. Parse for image references
3. Load images asynchronously
4. Attach to message parts
5. Handle loading failures gracefully
6. Track which images belong to which message
7. Clean up after sending

Each of these adds complexity and potential bugs.

---

## Lessons Learned

### 1. **Understand the Protocol First**

We jumped into implementation without fully understanding how MCP tools integrate with OpenCode SDK. Key question we should have asked:

> "How does the tool response data get sent to the LLM?"

Answer: **It doesn't.** Tool responses are for the AI to read as context, not to inject into the conversation.

### 2. **Check the Research More Carefully**

Our spec document (`SPEC/IMAGE_VIEWING_MCP_TOOL.md`) showed how OpenCode TUI does it:

```go
// Attachments are added BEFORE sending to LLM
attachment := message.Attachment{
    Content: content  // ← Raw bytes
}
```

We saw this but didn't realize it meant images must be in the initial message, not a tool response.

### 3. **Test the Happy Path First**

We built the entire architecture (545 lines!) before testing if an MCP tool could actually send images to the AI. We should have:

1. Created minimal proof-of-concept
2. Tested with OpenCode SDK
3. Verified AI receives image
4. **Then** built the architecture

### 4. **Question Complexity**

When the solution started requiring:

- Message interception
- Regex parsing
- Async image loading
- State management

We should have stopped and asked: **"Is there a simpler way?"**

---

## What We Should Do Instead

### Option 1: Pre-Process Discord Attachments ✅ **RECOMMENDED**

**How it works:**

1. User uploads image to Discord
2. Discord plugin detects attachment
3. **Before calling Toji.chat()**, download image and create FilePart
4. Pass both text + image parts to chat

**Implementation:**

```typescript
// In DiscordPlugin.ts - Message handler

const parts: Array<TextPartInput | FilePartInput> = [{ type: 'text', text: messageContent }]

// Download Discord attachments
if (message.attachments.size > 0) {
  for (const attachment of message.attachments.values()) {
    if (attachment.contentType?.startsWith('image/')) {
      const imageData = await downloadAttachment(attachment.url)
      const base64 = imageData.toString('base64')
      parts.push({
        type: 'file',
        mime: attachment.contentType,
        filename: attachment.name,
        url: `data:${attachment.contentType};base64,${base64}`
      })
    }
  }
}

// Call Toji with parts array
await toji.chatWithParts(parts) // ← New method
```

**Pros:**

- ✅ Works with OpenCode SDK's architecture
- ✅ Simple - just download and attach
- ✅ Discord-specific logic stays in Discord plugin
- ✅ No MCP tools needed
- ✅ No message interception needed

**Cons:**

- ⚠️ Only works for Discord attachments (not CLI, web UI)
- ⚠️ Need new `chatWithParts()` method

### Option 2: OpenCode SDK Enhancement (Future)

**Long-term solution:** Propose enhancement to OpenCode SDK:

```typescript
// New SDK feature: Tool responses can inject message parts
server.registerTool({
  name: 'view_image',
  handler: async (args) => {
    const imageData = await loadImage(args.source)
    return {
      content: [...],
      injectParts: [  // ← New feature
        {
          type: 'file',
          mime: imageData.mimeType,
          url: imageData.dataUri
        }
      ]
    }
  }
})
```

This would require changes to OpenCode SDK itself.

### Option 3: Hybrid Approach

**For now:** Discord attachments (Option 1)  
**Future:** CLI/Web UI use file paths directly in commands

```bash
# User types in CLI
> Analyze src/screenshot.png for UI issues
```

OpenCode SDK already supports file references in text - it might handle this automatically.

---

## Recommendations

### Immediate Actions

1. **✅ Revert commit `e1a05ac`** - Remove all view_image code
2. **✅ Keep spec documents** - Valuable research, just wrong approach
3. **✅ Document this post-mortem** - Avoid repeating the mistake

### Next Steps

1. **Implement Option 1** - Discord attachment pre-processing
   - Simpler approach (~50 lines vs 545 lines)
   - Works with existing architecture
   - Discord-specific, which is fine

2. **Test with real images**
   - Verify AI actually sees the image
   - Confirm vision analysis works
   - Validate with multiple LLMs (GPT-4V, Claude 3+, Gemini)

3. **Consider future enhancements**
   - CLI: Support `@image path/to/file.png` syntax
   - Web UI: Drag & drop images
   - Submit OpenCode SDK PR for tool-injected parts

### Success Criteria (Simple Approach)

1. ✅ User uploads image to Discord
2. ✅ Bot downloads and attaches to message
3. ✅ AI receives image with user's text
4. ✅ Vision analysis works correctly
5. ✅ < 100 lines of new code
6. ✅ No new MCP tools needed

---

## Code Removal Summary

**To revert:**

```bash
git revert e1a05ac
```

**Files to be removed:**

- `src/main/toji/mcp/services/image-viewer.ts` (291 lines)
- `src/main/toji/mcp/tools/view-image.ts` (119 lines)
- `src/plugins/discord/utils/discord-image-fetcher.ts` (89 lines)
- `SPEC/IMAGE_VIEWING_MCP_TOOL.md`
- `SPEC/VIEW_IMAGE_BEFORE_AFTER.md`
- `SPEC/VIEW_IMAGE_REFACTOR_SUMMARY.md`
- `VIEW_IMAGE_IMPLEMENTATION.md`
- `VISION_INTEGRATION_COMPLETE.md`

**Files to revert:**

- `src/main/toji/index.ts`
- `src/main/toji/mcp/mcp-manager.ts`
- `src/plugins/discord/DiscordPlugin.ts`
- `package.json` (remove @types/mime-types)
- `opencode.json`

**Total removal:** ~1,000 lines of code + documentation

---

## Conclusion

**What we learned:**

- MCP tools are not the right solution for vision integration
- Images must be in the initial message, not tool responses
- OpenCode SDK's architecture requires a different approach
- Complex solutions often indicate a wrong approach

**What we're doing:**

- Reverting all vision changes
- Keeping research documents for reference
- Planning simpler Discord-specific solution
- Documenting this mistake to avoid repeating it

**Quote to remember:**

> "The best code is the code you don't write."
>
> — Unknown

We wrote 545 lines of well-architected, clean code that fundamentally couldn't work. Better to write 50 lines that actually solves the problem.

---

**Status:** ⏸️ Vision integration paused  
**Next:** Implement simple Discord attachment pre-processing  
**Timeline:** TBD based on priority
