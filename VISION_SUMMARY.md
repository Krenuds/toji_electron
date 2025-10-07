# Vision Integration - What Happened & Next Steps

## TL;DR

We spent time building a sophisticated `view_image` MCP tool (545 lines) that **fundamentally couldn't work** due to architectural limitations. We've reverted everything and documented the lessons learned.

## What We Built (Then Removed)

**Commit `e1a05ac`** - Full implementation:

- ✅ Generic ImageViewerService (reusable, clean architecture)
- ✅ MCP tool with 3 source types (Discord, project, absolute)
- ✅ Base64 encoding, MIME detection, security measures
- ✅ Passed all quality gates (lint, typecheck, format)
- ❌ **Didn't actually work for vision analysis**

## The Core Problem

```
MCP Tool Flow:
User: "image.png what is this?"
→ AI decides to use toji_view_image
→ Tool loads image and returns ImageContent
→ AI receives tool response with image data
→ ❌ But the image isn't in the LLM conversation!

What Vision Needs:
User: "what is this?" + [IMAGE BYTES]
→ Sent together to LLM
→ ✅ LLM processes both simultaneously
```

**The Issue:** MCP tools return data **after** the message is sent. Vision models need images **with** the initial message.

## Why We Didn't Catch This Earlier

1. **Research showed it was possible** - OpenCode TUI does vision
2. **MCP supports ImageContent** - The SDK has the right types
3. **Misunderstood the flow** - Thought tool responses inject into conversation
4. **Built architecture first** - Should have tested minimal POC

## Key Learnings

### ❌ What Doesn't Work

- MCP tools for vision (they run **after** message sent)
- Returning ImageContent in tool responses (not injected into LLM context)
- Message interception with regex parsing (too complex, too fragile)

### ✅ What Does Work

- Pre-processing attachments **before** sending message
- Adding images to `session.prompt()` parts array directly
- Simple Discord-specific approach

## The Right Solution

### Simple Discord Attachment Pre-Processing

**Location:** `src/plugins/discord/DiscordPlugin.ts` message handler

**Pseudocode:**

```typescript
// When Discord message received
const parts = [{ type: 'text', text: messageContent }]

// Check for image attachments
for (const attachment of message.attachments) {
  if (attachment.contentType.startsWith('image/')) {
    const imageData = await fetch(attachment.url)
    const base64 = Buffer.from(imageData).toString('base64')
    parts.push({
      type: 'file',
      mime: attachment.contentType,
      filename: attachment.name,
      url: `data:${attachment.contentType};base64,${base64}`
    })
  }
}

// Send to OpenCode with images attached
await client.session.prompt({
  path: { id: sessionId },
  body: { parts } // ← Text + images together
})
```

**Pros:**

- ✅ Actually works with OpenCode SDK
- ✅ Simple: ~50 lines vs 545 lines
- ✅ Discord-specific (fine for now)
- ✅ No MCP tools needed
- ✅ No regex parsing needed
- ✅ Images sent with message (correct flow)

**Cons:**

- ⚠️ Only works for Discord (not CLI/Web UI)
- ⚠️ Need to modify Toji.chat() to accept parts array

## Files to Review

### Must Read

1. **`VISION_POSTMORTEM.md`** - Complete analysis (this document's parent)
   - What we built and why it failed
   - Technical deep-dive
   - Lessons learned
   - Recommended next steps

### Context (Kept for Reference)

2. **`SPEC/IMAGE_VIEWING_MCP_TOOL.md`** - Original research
   - How OpenCode TUI does vision
   - Valuable reference for correct approach

3. **`SPEC/VIEW_IMAGE_BEFORE_AFTER.md`** - Comparison document

4. **`SPEC/VIEW_IMAGE_REFACTOR_SUMMARY.md`** - Architecture notes

## What's Next?

### Option A: Implement Simple Approach (Recommended)

**Effort:** ~2-3 hours  
**Complexity:** Low  
**Benefit:** Vision works for Discord

**Steps:**

1. Add image attachment detection to Discord message handler
2. Download and encode images
3. Modify `Toji.chat()` to accept parts array (or create new method)
4. Test with GPT-4V, Claude 3+, Gemini Vision

### Option B: Wait for OpenCode SDK Enhancement

**Timeline:** Unknown  
**Effort:** Depends on SDK maintainers  
**Benefit:** Would work for all interfaces (Discord, CLI, Web)

**Approach:** Submit PR to OpenCode SDK for tool-injected message parts

### Option C: Do Nothing

**Benefit:** Simpler codebase  
**Cost:** No vision capabilities

Users can still use vision by:

- Uploading images to project directory
- Referencing them in text: "Analyze screenshot.png"
- OpenCode SDK **might** handle this automatically (needs testing)

## Recommendation

**Go with Option A** - Simple Discord attachment pre-processing

**Why:**

- Quick win (works immediately)
- Low complexity (easy to maintain)
- Solves 80% of use cases
- Can enhance later if needed

**Don't:**

- Try MCP tools again (won't work)
- Over-engineer the solution (keep it simple)
- Build generic architecture first (Discord-only is fine)

## Git Status

```bash
Current branch: master
HEAD: a117b3b (docs: add vision integration post-mortem)

Previous commits:
- 19697ad feat(discord): add MCP tools for channel management
- 85d8e06 refactor: replace Discord setters with service registry pattern

Reverted commit:
- e1a05ac feat(mcp): add view_image tool with AI vision integration
```

**Removed:**

- All view_image code (545 lines)
- @types/mime-types dependency
- MCP tool registration
- Service integrations

**Kept:**

- Research documents (valuable reference)
- Post-mortem analysis (lessons learned)

## Questions to Consider

Before implementing the simple approach:

1. **Do we need vision right now?** - What's the priority?
2. **Discord-only OK?** - Or do we need CLI/Web UI too?
3. **Model support?** - Which vision models do users have access to?
4. **File size limits?** - Discord has limits, need to handle gracefully
5. **Multiple images?** - Should we support multiple attachments per message?

## Final Thoughts

**This was a valuable learning experience.** We:

- ✅ Discovered architectural limitations
- ✅ Understood MCP tool protocol better
- ✅ Documented the mistake comprehensively
- ✅ Identified the correct solution
- ✅ Avoided wasting more time on wrong approach

**Better to fail fast** and pivot than to keep building on a flawed foundation.

---

**Status:** 🔄 Reset to before vision implementation  
**Next:** Discuss and implement simple Discord attachment approach  
**Timeline:** TBD based on priority
