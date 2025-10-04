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
  "messages": [
    {"id": "...", "author": "user#1234", "content": "...", "timestamp": "..."}
  ],
  "count": 1
}
```

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

```text
```text
src/main/toji/mcp/
├── index.ts                # Module exports
├── types.ts                # TypeScript interfaces
├── mcp-manager.ts          # Server lifecycle & HTTP endpoints
├── README.md               # This file
└── tools/
    ├── list-sessions.ts    # List all available sessions
    ├── clear-session.ts    # Clear and start new session
    ├── read-session.ts     # Read messages from sessions
    └── discord-messages.ts # Discord tool implementation
```
```

## Dependencies

- `@modelcontextprotocol/sdk` - MCP TypeScript SDK
- `express` - HTTP server for MCP endpoints
- `zod` - Schema validation

## Debug Logs

```bash
DEBUG=mcp:* npm run dev
```
