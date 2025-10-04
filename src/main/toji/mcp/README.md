# MCP Module

Model Context Protocol (MCP) integration for Toji. Exposes tools to OpenCode AI via HTTP servers.

## How It Works

1. **Per-Project Servers**: Each project gets its own MCP server on a unique port (3100+)
2. **Automatic Config**: Writes `opencode.json` to project root with MCP server URL
3. **OpenCode Discovery**: OpenCode reads the config and connects to MCP server
4. **Tool Access**: AI can call registered MCP tools during conversations

### Lifecycle

```text
Project Opens → MCP Server Created → opencode.json Written → OpenCode Connects
Project Closes → MCP Server Shutdown → HTTP Server Closed
```

## Available Tools

### `list_sessions`

List all available sessions in the current project with metadata. Provides AI with awareness of what sessions exist.

**Inputs:**

- `includeMessageCount` (optional): Include message count for each session (default: true)

**Output:**

```json
{
  "currentSessionId": "ses_abc123...",
  "totalCount": 3,
  "sessions": [
    {
      "id": "ses_abc123...",
      "title": "Describing project",
      "messageCount": 41,
      "created": "2025-10-03T14:00:00Z",
      "updated": "2025-10-03T15:30:00Z",
      "lastActive": "2025-10-03T15:30:00Z"
    }
  ]
}
```

**Example Usage:**
AI calls this proactively to discover available sessions before user asks specific questions. Answers "How many sessions do we have?" or "What sessions exist?"

### `clear_and_start_session`

Creates a new OpenCode session and sets it as active. This clears the conversation history while maintaining project context.

**Inputs:**

- `title` (optional): Custom title for the new session

**Output:**

```json
{
  "sessionId": "abc123...",
  "sessionTitle": "Fresh Start - 2:30 PM",
  "projectPath": "/path/to/project",
  "message": "Successfully created and activated new session: ..."
}
```

**Example Usage:**
AI can call this to start fresh without losing project context.

### `read_session_messages`

Read messages from a specific session or search for sessions by title. Enables AI to gather context from previous conversations.

**Inputs:**

- `sessionId` (optional): Specific session ID to read
- `searchTitle` (optional): Search term to find sessions by title (case-insensitive)
- `limit` (optional): Maximum number of messages to return (default: 20)

**Output:**

```json
{
  "sessionId": "xyz789...",
  "sessionTitle": "Discussion about Feature X",
  "messageCount": 15,
  "messages": [
    {
      "role": "user",
      "content": "How do we implement X?",
      "timestamp": "2025-10-03T14:30:00Z"
    }
  ]
}
```

**Example Usage:**
User asks "Which session were we talking about X?" - AI searches sessions with `searchTitle: "X"` and reads the messages to provide context.

### `discord_messages`

Reads recent messages from a Discord channel.

**Inputs:**

- `channelId` (optional): Discord channel ID. Uses current channel if omitted.
- `limit` (optional): Number of messages (1-100, default: 10)

**Output:**

```json
{
  "messages": [{ "id": "...", "author": "user#1234", "content": "...", "timestamp": "..." }],
  "count": 1
}
```

### `discord_upload`

Uploads a file to a Discord channel with an optional message. Enables AI to share files, screenshots, logs, or generated content directly to Discord.

**Inputs:**

- `filePath` (required): Absolute path to the file to upload. The file must exist and be accessible.
- `channelId` (optional): Discord channel ID. Uses current channel if omitted.
- `message` (optional): Optional message to send with the file attachment

**Output:**

```json
{
  "messageId": "123456789...",
  "channelId": "987654321...",
  "attachmentUrl": "https://cdn.discordapp.com/attachments/.../file.png",
  "success": true
}
```

**Example Usage:**
User asks "send this screenshot to Discord" - AI uses this tool to upload the file to the current Discord channel. Or AI generates a report file and uploads it automatically.

### `discord_list_channels`

Lists all accessible channels in a Discord guild (server). Helps AI navigate and discover available channels for communication.

**Inputs:**

- `guildId` (optional): Discord guild (server) ID. Uses first guild if omitted.
- `channelType` (optional): Filter by type: "text", "voice", "category", "announcement", "forum", "all" (default: "all")

**Output:**

```json
{
  "guildId": "123...",
  "guildName": "My Server",
  "channelCount": 5,
  "channels": [
    {
      "id": "456...",
      "name": "general",
      "type": "text",
      "parentId": "789...",
      "parentName": "Category Name",
      "topic": "General chat",
      "position": 0
    }
  ]
}
```

**Example Usage:**
User asks "what channels are available?" - AI lists all channels. Or AI needs to find a specific channel type for communication.

### `discord_get_channel_info`

Gets detailed information about a specific Discord channel including permissions, settings, and metadata. Provides context awareness for AI.

**Inputs:**

- `channelId` (required): Discord channel ID to get information about

**Output:**

```json
{
  "id": "123...",
  "name": "general",
  "type": "text",
  "guildId": "456...",
  "guildName": "My Server",
  "topic": "General discussion",
  "position": 0,
  "parentId": "789...",
  "parentName": "Text Channels",
  "rateLimitPerUser": 0,
  "nsfw": false,
  "permissions": {
    "canSend": true,
    "canRead": true,
    "canManage": false,
    "canEmbed": true,
    "canAttach": true,
    "canMentionEveryone": false
  },
  "createdAt": "2024-01-01T00:00:00.000Z"
}
```

**Example Usage:**
Before sending a message, AI checks if it has permission. Or user asks "what is this channel?" - AI provides detailed information.

### `discord_search_messages`

Searches message history in a Discord channel with filters. Find past discussions, code snippets, decisions, or specific content.

**Inputs:**

- `channelId` (required): Discord channel ID to search in
- `query` (optional): Text to search for (case-insensitive)
- `authorId` (optional): Filter by author user ID
- `before` (optional): Only messages before this date (ISO 8601)
- `after` (optional): Only messages after this date (ISO 8601)
- `limit` (optional): Maximum messages to return (1-100, default: 20)
- `hasAttachments` (optional): Only messages with attachments if true

**Output:**

```json
{
  "channelId": "123...",
  "query": "error",
  "matchCount": 3,
  "messages": [
    {
      "id": "456...",
      "author": "user#1234",
      "authorId": "789...",
      "content": "Got an error message...",
      "timestamp": "2024-01-01T12:00:00.000Z",
      "attachments": [
        {
          "url": "https://...",
          "filename": "error.log",
          "size": 1024
        }
      ],
      "embeds": 0,
      "reactions": [
        {
          "emoji": "👍",
          "count": 2
        }
      ]
    }
  ]
}
```

**Example Usage:**
User asks "when did we discuss X?" - AI searches for messages containing X. Or "find all messages with attachments from last week" - AI filters by date and attachments.

### `initialize_project`

Initialize a new project with git and opencode.json at a specified path. Creates the directory if it doesn't exist.

**Inputs:**

- `path` (required): Full absolute path where project should be initialized (e.g., "C:\\Users\\Name\\Projects\\my-app")
- `projectName` (optional): Project name for opencode.json (defaults to directory name)
- `description` (optional): Project description for opencode.json
- `model` (optional): Default AI model (e.g., "anthropic/claude-3-5-sonnet-20241022")
- `autoSwitch` (optional): Automatically switch to the new project (default: true)

**Output:**

```json
{
  "success": true,
  "projectPath": "C:\\Users\\Name\\Projects\\my-app",
  "steps": ["git-init", "gitignore", "opencode-config", "readme"],
  "switched": true,
  "message": "Successfully initialized project..."
}
```

**Example Usage:**
User says "create a new project at C:\\MyProjects\\my-app" - AI calls this tool with the path, automatically creating and initializing the project.

## Adding New Tools

**Step 1: Create tool file** in `tools/`:

```typescript
// tools/my-tool.ts
import { z } from 'zod'
import type { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js'

export function registerMyTool(server: McpServer, dependencies: any) {
  server.registerTool(
    'my_tool',
    {
      title: 'My Tool',
      description: 'What it does',
      inputSchema: {
        param: z.string().describe('Parameter description')
      },
      outputSchema: {
        result: z.string()
      }
    },
    async ({ param }) => {
      // Implementation
      const result = doSomething(param)

      return {
        content: [{ type: 'text', text: result }],
        structuredContent: { result }
      }
    }
  )
}
```

**Step 2: Register in `mcp-manager.ts`**:

```typescript
import { registerMyTool } from './tools/my-tool'

// In createServerForProject():
if (this.myDependency) {
  registerMyTool(server, this.myDependency)
}
```

**Step 3: Configure dependencies** (if needed):

```typescript
// In Toji class:
setMyDependency(dep: MyType): void {
  this.mcp.setMyDependency(dep)
}
```

## Architecture

````text
```text
src/main/toji/mcp/
├── index.ts                      # Module exports
├── types.ts                      # TypeScript interfaces
├── mcp-manager.ts                # Server lifecycle & HTTP endpoints
├── README.md                     # This file
└── tools/
    ├── list-sessions.ts          # List all available sessions
    ├── clear-session.ts          # Clear and start new session
    ├── read-session.ts           # Read messages from sessions
    ├── discord-messages.ts       # Discord message reading
    ├── discord-upload.ts         # Discord file upload
    ├── discord-list-channels.ts  # Discord channel listing
    ├── discord-channel-info.ts   # Discord channel information
    ├── discord-search-messages.ts # Discord message search
    └── initialize-project.ts     # Project initialization
```
````

````

## Dependencies

- `@modelcontextprotocol/sdk` - MCP TypeScript SDK
- `express` - HTTP server for MCP endpoints
- `zod` - Schema validation

## Debug Logs

```bash
DEBUG=mcp:* npm run dev
````
