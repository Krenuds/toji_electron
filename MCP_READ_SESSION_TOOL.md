# MCP Read Session Tool

## Overview

New MCP tool that enables AI to read messages from previous sessions: `read_session_messages`

## What It Does

Allows AI to search for and read messages from any session in the current project. This enables context gathering from previous conversations, answering questions like "Which session were we talking about X?"

## Implementation Details

### Tool Registration

Same dependency injection pattern as `clear_and_start_session`:

1. **Toji Constructor** registers session dependencies with MCP manager
2. **McpManager** registers tool with all existing and new servers
3. **Tool** uses OpenCode SDK to list sessions and read messages

### API

**Input Schema:**

```typescript
{
  sessionId?: string       // Specific session ID to read
  searchTitle?: string     // Search term for session title (case-insensitive)
  limit?: number          // Max messages to return (default: 20)
}
```

**Output Schema:**

```typescript
{
  sessionId: string
  sessionTitle: string
  messageCount: number
  messages: Array<{
    role: string
    content: string
    timestamp?: string
  }>
}
```

## Use Cases

### 1. Search by Title

User asks: "What did we discuss in the session about feature X?"

```typescript
// AI calls:
read_session_messages({
  searchTitle: "feature X",
  limit: 20
})

// Returns:
{
  sessionId: "abc123",
  sessionTitle: "Discussion about Feature X",
  messageCount: 15,
  messages: [
    { role: "user", content: "How do we implement feature X?", ... },
    { role: "assistant", content: "We can approach it by...", ... }
  ]
}
```

### 2. Read Specific Session

User provides session ID:

```typescript
// AI calls:
read_session_messages({
  sessionId: "abc123",
  limit: 10
})
```

### 3. Compare Sessions

User asks: "Which session were we talking about X or Y?"

AI can:

1. Search for session with "X" in title
2. Search for session with "Y" in title
3. Read messages from both
4. Compare and report findings

## OpenCode SDK Integration

Uses multiple SDK APIs:

1. **`sessionManager.listSessions(client, projectPath)`**
   - Lists all sessions for current project
   - Searches by title (case-insensitive)

2. **`sessionManager.getSessionMessages(client, sessionId, projectPath, false)`**
   - Fetches messages from specific session
   - `false` = don't use cache, get fresh data
   - Returns array of `{ info: Message, parts: Part[] }`

3. **Message Parsing**
   - Extracts role (user/assistant/system)
   - Combines text parts into content string
   - Preserves timestamps

## Error Handling

The tool handles:

- No active project
- Client not connected
- Session not found
- No sessions matching search term
- Invalid parameters (neither sessionId nor searchTitle provided)

All errors return structured output with `isError: true` flag.

## Key Features

### Case-Insensitive Search

```typescript
const searchLower = searchTitle.toLowerCase()
const matchedSession = sessions.find((s) => s.title.toLowerCase().includes(searchLower))
```

### Message Limiting

```typescript
const limitedMessages = messagesData.slice(0, limit)
```

Default: 20 messages (configurable via `limit` parameter)

### Fresh Data

```typescript
await sessionManager.getSessionMessages(client, sessionId, projectPath, false)
//                                                                        ^^^^
//                                                                        No cache
```

Ensures AI always reads latest message state.

### Helpful Error Messages

When no match found:

```
No sessions found matching "feature X". 
Available sessions: Discussion about Y, Old Project Notes, Testing Session
```

## Testing Scenarios

1. **Search by Title**
   - Create sessions with different titles
   - Ask AI to find specific one
   - Verify correct session returned

2. **Read by ID**
   - Get session ID from list
   - Read messages from that session
   - Verify messages match

3. **Multiple Matches**
   - Create sessions with similar titles
   - Search with common term
   - Verify first match returned

4. **No Matches**
   - Search for non-existent term
   - Verify error message lists available sessions

5. **Message Limiting**
   - Create session with 50+ messages
   - Read with `limit: 10`
   - Verify only 10 messages returned

## Comparison to Existing Features

**Discord `/clear` command:**

- Clears current session only
- No reading capability

**New MCP tools:**

- `clear_and_start_session` - Create new session
- `read_session_messages` - Read any session
- Together they enable full session management

## Architecture Benefits

1. **Reuses SessionManager**: No duplicate logic
2. **Type-Safe**: Full TypeScript support
3. **Error Resilient**: Comprehensive error handling
4. **Flexible Search**: By ID or title
5. **Performance**: Configurable message limits

## Future Enhancements

Potential additions:

1. **Fuzzy Search**: Better title matching
2. **Date Filters**: Find sessions by date range
3. **Content Search**: Search message content, not just titles
4. **Session Summary**: AI-generated summaries of long sessions
5. **Multi-Session Read**: Read from multiple sessions at once
