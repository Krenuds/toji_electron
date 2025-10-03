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
src/main/toji/mcp/
├── index.ts              # Module exports
├── types.ts              # TypeScript interfaces
├── mcp-manager.ts        # Server lifecycle & HTTP endpoints
├── README.md             # This file
└── tools/
    └── discord-messages.ts   # Discord tool implementation
```

## Dependencies

- `@modelcontextprotocol/sdk` - MCP TypeScript SDK
- `express` - HTTP server for MCP endpoints
- `zod` - Schema validation

## Debug Logs

```bash
DEBUG=mcp:* npm run dev
```
