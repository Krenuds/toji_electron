# Tool Event Tracking Implementation

## ✅ Implementation Complete

**Date:** October 4, 2025
**Status:** Ready for Testing

---

## 🎯 What Was Implemented

### Tool Event Capture from OpenCode SDK

We are now capturing and displaying **tool usage events** during AI response streaming. When Claude uses tools (like `read_file`, `write_file`, `run_terminal`, etc.), Discord users see real-time updates showing:

- 🔄 **Running tools** with their names and titles
- ✅ **Completed tools** (last 3 shown)
- ❌ **Failed tools** (last 2 errors shown)

---

## 📊 Visual Example

```
╔═════════════════════════════════════╗
║ 🤖 Toji is working...              ║
║                                     ║
║ 📊 Progress                         ║
║ ▓▓▓▓▓▓░░░░ 60%                     ║
║                                     ║
║ 📝 Characters: 1024                 ║
║                                     ║
║ 🔧 Tools                            ║
║ 🔄 Read File: package.json          ║
║ ✅ List Directory                   ║
║ ✅ Grep Search                      ║
╔═════════════════════════════════════╝
```

---

## 🔧 Technical Changes

### 1. New Types (`src/main/toji/types.ts`)

```typescript
// Tool event information
export interface ToolEvent {
  id: string
  callID: string
  tool: string
  state: ToolState
  sessionID: string
  messageID: string
}

// Event streaming types
export interface StreamCallbacks {
  onChunk?: (text: string, partId: string) => void | Promise<void>
  onComplete?: (fullText: string) => void | Promise<void>
  onError?: (error: Error) => void | Promise<void>
  onThinking?: (isThinking: boolean) => void | Promise<void>
  onTool?: (tool: ToolEvent) => void | Promise<void> // NEW!
}
```

### 2. Event Handler (`src/main/toji/index.ts`)

Added tool part handling in the streaming event loop:

```typescript
case 'message.part.updated': {
  const part = partEvent.properties.part

  if (part.type === 'text') {
    // ... existing text handling
  } else if (part.type === 'tool') {
    // NEW: Handle tool usage events
    const toolPart = part as {
      type: 'tool'
      id: string
      callID: string
      tool: string
      state: ToolState
      sessionID: string
      messageID: string
    }

    if (callbacks.onTool) {
      const toolEvent: ToolEvent = {
        id: toolPart.id,
        callID: toolPart.callID,
        tool: toolPart.tool,
        state: toolPart.state,
        sessionID: toolPart.sessionID,
        messageID: toolPart.messageID
      }
      await callbacks.onTool(toolEvent)
    }
  }
  break
}
```

### 3. Discord UI Utilities (`src/plugins/discord/utils/messages.ts`)

#### ToolActivity Tracker

```typescript
export interface ToolActivity {
  pending: string[]
  running: Map<string, { name: string; title?: string }>
  completed: string[]
  errors: string[]
}

export function createToolActivity(): ToolActivity
export function updateToolActivity(tools: ToolActivity, event: ToolEvent): void
```

#### Updated Progress Embeds

```typescript
export function createProgressEmbed(
  charCount: number,
  estimatedTotal: number = 2000,
  tools?: ToolActivity // NEW!
): EmbedBuilder

export function updateProgressEmbed(
  charCount: number,
  estimatedTotal: number = 2000,
  tools?: ToolActivity // NEW!
): EmbedBuilder
```

#### Tool Formatting

- Converts `snake_case` → "Snake Case"
- Shows tool titles when available (e.g., "Read File: package.json")
- Limits display to most recent/relevant tools

### 4. Discord Plugin Integration (`src/plugins/discord/DiscordPlugin.ts`)

Both project channels and @mention handlers now track tools:

```typescript
const toolActivity = createToolActivity()

await this.projectManager.chatStreaming(message.content, {
  onChunk: async (text) => {
    // Update with tool activity
    const embed = updateProgressEmbed(charCount, 2000, toolActivity)
    await progressMessage.edit({ embeds: [embed] })
  },

  onTool: async (toolEvent) => {
    updateToolActivity(toolActivity, toolEvent)

    // Force update on important events (running/completed)
    if (
      toolEvent.state.status === 'running' ||
      toolEvent.state.status === 'completed'
    ) {
      const embed = updateProgressEmbed(charCount, 2000, toolActivity)
      await progressMessage.edit({ embeds: [embed] })
    }
  }
})
```

---

## 🎨 Design Patterns

### State Machine for Tool Status

```
pending → running → completed
                 ↘ error
```

- **Pending**: Tool queued but not started
- **Running**: Tool actively executing (shows title if available)
- **Completed**: Tool finished successfully
- **Error**: Tool failed with error message

### Update Throttling

- **Text chunks**: Throttled to 1 second
- **Tool events**: NOT throttled for `running` and `completed` states
- Ensures users see important tool activity immediately

### Display Priority

1. **Running tools** shown first (most important)
2. **Last 3 completed** tools (recent activity)
3. **Last 2 errors** (if any)

---

## 📦 OpenCode SDK Event Types Used

### Part Types

```typescript
Part = TextPart | ReasoningPart | FilePart | ToolPart | StepStartPart | StepFinishPart | ...
```

### ToolPart Structure

```typescript
{
  id: string
  sessionID: string
  messageID: string
  type: "tool"
  callID: string
  tool: string
  state: ToolState
}
```

### ToolState States

```typescript
ToolStatePending = {
  status: "pending"
}

ToolStateRunning = {
  status: "running"
  input: unknown
  title?: string
  metadata?: { [key: string]: unknown }
  time: { start: number }
}

ToolStateCompleted = {
  status: "completed"
  input: { [key: string]: unknown }
  output: string
  title: string
  metadata: { [key: string]: unknown }
  time: { start: number; end: number }
}

ToolStateError = {
  status: "error"
  input: { [key: string]: unknown }
  error: string
  metadata?: { [key: string]: unknown }
  time: { start: number; end: number }
}
```

---

## 🧪 Testing Checklist

### Manual Testing Needed

- [ ] Ask Claude to read a file → see "🔄 Read File: filename"
- [ ] Ask Claude to search code → see "🔄 Grep Search"
- [ ] Ask Claude to edit files → see multiple tools
- [ ] Long operation with many tools → verify display limit works
- [ ] Tool that fails → see "❌ Tool Name"
- [ ] Very fast tool execution → verify embed updates
- [ ] Multiple concurrent tools → verify running map works

### Example Prompts

**File Operations:**
- "What's in package.json?"
- "Read the Discord plugin implementation"

**Code Search:**
- "Find all uses of the chatStreaming function"
- "Search for TODO comments in the codebase"

**Multi-Tool Operations:**
- "List all TypeScript files in src/main and show their line counts"
- "Find the Toji class and explain how it works"

**Error Cases:**
- "Read a file that doesn't exist: /fake/path.txt"
- "Run a command that will fail: fake-command --help"

---

## 🚀 Future Enhancements

### Phase 2 Features (Not Implemented Yet)

1. **Tool Input Preview**
   - Show parameters being passed to tools
   - Example: "Read File: src/main/index.ts (lines 1-100)"

2. **Tool Output Summary**
   - Show first 50 chars of tool output
   - Example: "✅ Read File: 'import { app } from electron...'"

3. **Execution Time**
   - Show how long each tool took
   - Example: "✅ Grep Search (2.3s)"

4. **Tool Categories**
   - Group by type: File Ops, Search, Edit, Terminal
   - Color-code by category

5. **Expandable Details**
   - Add buttons to show full tool details
   - Show complete input/output in modal or thread

6. **Tool Statistics**
   - Total tools used in session
   - Most frequently used tools
   - Average execution time

---

## 📝 Key Insights

### What We Learned

1. **OpenCode SDK Structure**: The SDK emits `message.part.updated` events for ALL part types, not just text. We were ignoring `part.type === 'tool'` entirely!

2. **Tool States Are Rich**: The ToolState union includes detailed metadata like:
   - Input parameters
   - Title for display
   - Timing information
   - Error messages
   - Custom metadata

3. **callID vs id**: Each tool invocation has:
   - `id`: Unique part identifier
   - `callID`: Specific invocation identifier (used to track state changes)

4. **Title Field**: When available, provides human-readable context like "Read File: package.json" instead of just "read_file"

### Why This Matters

- **User Feedback**: Users now see what Claude is doing, not just waiting
- **Debugging**: Developers can see which tools are called and when they fail
- **Trust**: Transparency in AI operations builds user confidence
- **Performance**: Knowing tool execution helps users understand response times

---

## 🎓 Code Quality Metrics

✅ **Type Safety**: All tool events properly typed
✅ **Error Handling**: Tool errors captured and displayed
✅ **Formatting**: Prettier formatted
✅ **Linting**: ESLint clean
✅ **Type Checking**: TypeScript strict mode passes
✅ **Documentation**: Inline comments and specs
✅ **Reusability**: Tool utilities can be used in other contexts

---

## 📚 Related Documentation

- **Event Streaming**: `SPEC/EVENT_STREAMING_SIMULATION.md`
- **Discord Streaming**: `SPEC/DISCORD_STREAMING_FLOW.md`
- **Progress Implementation**: `SPEC/STREAMING_PROGRESS_IMPLEMENTATION.md`
- **This Document**: `SPEC/TOOL_EVENT_TRACKING.md`

---

## 🎉 Success Criteria

✅ **Goal**: Track and display tool usage during AI responses
✅ **SDK Integration**: Capturing `part.type === 'tool'` events
✅ **Type Safety**: Full TypeScript coverage for tool events
✅ **UI Updates**: Progress embeds show active tools
✅ **State Management**: Tool activity properly tracked
✅ **Error Handling**: Failed tools displayed to users
✅ **Code Quality**: Passes all lint/format/type checks
✅ **Documentation**: Comprehensive spec created

**Status: READY FOR TESTING** 🚀

---

## 🔍 Example Tool Events

### Real Tool Names (from OpenCode SDK)

Common tools that will appear:

- `read_file` → "Read File"
- `write_file` → "Write File"
- `list_directory` → "List Directory"
- `grep_search` → "Grep Search"
- `semantic_search` → "Semantic Search"
- `run_terminal` → "Run Terminal"
- `create_file` → "Create File"
- `replace_string` → "Replace String"

### Example Event Flow

```
1. User: "What's in package.json?"

2. Events received:
   - part.type='tool', tool='read_file', state.status='pending'
   - part.type='tool', tool='read_file', state.status='running', state.title='package.json'
   - part.type='text', text='The package.json file contains...'
   - part.type='tool', tool='read_file', state.status='completed'
   - part.type='text', text='The package.json file contains... [full response]'

3. User sees:
   - "🔄 Read File: package.json" (while running)
   - "✅ Read File" (when complete)
   - Final response replaces progress embed
```

---

## 💡 Implementation Notes

### Why Force Update on Tool Events?

```typescript
// Force update progress embed with tool info (not throttled)
if (toolEvent.state.status === 'running' || toolEvent.state.status === 'completed') {
  const embed = updateProgressEmbed(charCount, 2000, toolActivity)
  await progressMessage.edit({ embeds: [embed] })
}
```

- Tool events are **discrete and important**
- Users want to know immediately when a tool starts/finishes
- Text chunks are continuous (can be throttled)
- Tool events are sparse (no rate limit risk)

### Why Not Show Pending Tools?

Currently we track pending but don't display them because:
- Transition from pending → running is usually instant
- Reduces UI clutter
- User doesn't care about "about to run" vs "running"

Could be changed in Phase 2 if needed.

### Why Limit to Last 3 Completed?

- Discord embed field value limits (~1024 chars)
- Most recent tools are most relevant
- Prevents embed from growing too large
- Can increase if needed (but test with many tools)

---

**End of Implementation Summary**
