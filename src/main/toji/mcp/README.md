# MCP Integration

## Overview

Toji3 integrates the Model C### Implementation Points

1. **Toji Core (`src/main/toji/index.ts`)**
   - `mcp: McpManager` - Public MCP manager instance
   - `setDiscordMessageFetcher()` - Configure Discord message fetching
   - `changeWorkingDirectory()` - Creates MCP server and writes `opencode.json`
   - `closeCurrentProject()` - Closes MCP server and HTTP server

2. **Discord Plugin (`src/plugins/discord/DiscordPlugin.ts`)**
   - `onReady()` - Configures Discord message fetcher when bot connects
   - `utils/mcp-fetcher.ts` - Implements Discord API calls

3. **MCP Manager (`src/main/toji/mcp/mcp-manager.ts`)**
   - Manages MCP server instances per project directory
   - Creates Express HTTP servers for each MCP instance (ports 3100+)
   - Writes `opencode.json` with MCP configuration
   - Registers tools with MCP servers
   - Handles cleanup on project close

4. **OpenCode Configuration (`opencode.json`)**
   - Automatically created in project root
   - Configures remote MCP server pointing to `http://localhost:<port>/mcp`
   - OpenCode reads this file and connects to MCP server automatically(MCP) to provide AI assistants with access to Discord channel history. Each OpenCode project automatically spawns its own MCP server with Discord-specific tools.

## Architecture

### Per-Project MCP Servers

- **One MCP server per project**: When you open a project, Toji creates a dedicated MCP server
- **Automatic lifecycle**: MCP server starts with project open, closes with project close
- **HTTP transport**: Runs on localhost with unique port per project (starting from 3100)
- **OpenCode integration**: Automatically writes `opencode.json` with MCP configuration
- **Discord integration**: Automatically configured when Discord bot is connected

### Components

```
src/main/toji/mcp/
├── index.ts                    # Module exports
├── types.ts                    # TypeScript interfaces
├── mcp-manager.ts              # Server lifecycle management
└── tools/
    └── discord-messages.ts     # Discord message reading tool
```

## OpenCode Configuration

When a project is opened, Toji automatically creates an `opencode.json` file in the project root:

```json
{
  "$schema": "https://opencode.ai/config.json",
  "mcp": {
    "toji-discord": {
      "type": "remote",
      "url": "http://localhost:3100/mcp",
      "enabled": true
    }
  }
}
```

This configuration tells OpenCode to connect to the MCP server running on the specified port. OpenCode will automatically discover and use the tools exposed by the MCP server.

## Available Tools

### `discord_messages`

Read recent messages from a Discord channel.

**Input:**

- `channelId` (string, required): Discord channel ID to read from
- `limit` (number, optional, 1-100, default: 10): Number of messages to retrieve

**Output:**

```json
{
  "messages": [
    {
      "id": "message_id",
      "author": "username#1234",
      "content": "message text",
      "timestamp": "2025-10-03T12:00:00.000Z"
    }
  ],
  "count": 1
}
```

**Usage in AI conversations:**

When chatting with an AI in a project channel, the AI can call this tool to read previous Discord messages for context.

**Example:**

```
User: "What did John say about the bug?"
AI: [Calls discord_messages with channel ID]
AI: "John mentioned in his message that he found the issue..."
```

## Implementation Details

### Integration Points

1. **Toji Core (`src/main/toji/index.ts`)**
   - `mcp: McpManager` - Public MCP manager instance
   - `setDiscordMessageFetcher()` - Configure Discord message fetching
   - `changeWorkingDirectory()` - Creates MCP server when project opens
   - `closeCurrentProject()` - Closes MCP server when project closes

2. **Discord Plugin (`src/plugins/discord/DiscordPlugin.ts`)**
   - `onReady()` - Configures Discord message fetcher when bot connects
   - `utils/mcp-fetcher.ts` - Implements Discord API calls

3. **MCP Manager (`src/main/toji/mcp/mcp-manager.ts`)**
   - Manages MCP server instances per project directory
   - Registers tools with MCP servers
   - Handles cleanup on project close

### Message Fetching Flow

```
AI Request → MCP Tool → Discord Fetcher → Discord API → Messages → AI
```

1. AI calls `discord_messages` tool with channel ID
2. MCP server routes to registered tool handler
3. Tool handler calls Discord fetcher
4. Fetcher queries Discord API via discord.js client
5. Messages formatted and returned to AI

## Usage Example

### From OpenCode AI

When working in a Discord project channel:

```
User: "What did John say about the bug in his last message?"

AI: [Internally calls discord_messages tool with current channel ID]

AI: "John mentioned in his message from 2 minutes ago that he found
     the issue in the authentication middleware..."
```

### Adding New Tools

To add a new MCP tool:

1. Create tool file in `src/main/toji/mcp/tools/`
2. Implement tool with `server.registerTool()`
3. Import and register in `mcp-manager.ts`
4. Add any required external dependencies (like Discord fetcher)

Example:

```typescript
server.registerTool(
  'my_tool',
  {
    title: 'My Tool',
    description: 'What it does',
    inputSchema: { param: z.string() },
    outputSchema: { result: z.string() }
  },
  async ({ param }) => {
    // Tool implementation
    return {
      content: [{ type: 'text', text: result }],
      structuredContent: { result }
    }
  }
)
```

## Future Enhancements

- **Write tools**: Send messages to Discord channels
- **File access**: Read project files through MCP
- **Code search**: Search codebase via MCP
- **HTTP transport**: Remote MCP servers for distributed access
- **Tool permissions**: Fine-grained control over what tools can do

## Dependencies

- `@modelcontextprotocol/sdk` - Official MCP TypeScript SDK
- `zod` - Schema validation for tool inputs/outputs
- `discord.js` - Discord API client (for message fetching)

## Debugging

Enable MCP debug logs:

```bash
DEBUG=mcp:* npm run dev
```

MCP logs are written to: `%APPDATA%/toji3/logs/`

## References

- [MCP Specification](https://modelcontextprotocol.io/)
- [MCP TypeScript SDK](https://github.com/modelcontextprotocol/typescript-sdk)
- [OpenCode SDK](https://github.com/opencode-ai/sdk)
