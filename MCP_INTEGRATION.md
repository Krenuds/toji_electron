# MCP Integration Summary

## What We Built

A **dead-simple MCP (Model Context Protocol) integration** for Toji3 that gives AI assistants the ability to read Discord channel messages. Each OpenCode project gets its own embedded MCP server with Discord-specific tools.

## Architecture: Simple & Clean

### Core Principle

**One MCP server per project** - When you open a project, you get an MCP server. When you close it, the server closes. Simple.

### File Structure

```
src/main/toji/mcp/
├── index.ts                    # Public exports
├── types.ts                    # TypeScript types
├── mcp-manager.ts              # Manages MCP server lifecycle
└── tools/
    └── discord-messages.ts     # Discord message reading tool

src/plugins/discord/utils/
└── mcp-fetcher.ts             # Implements Discord API calls
```

## How It Works

### 1. Project Opens → MCP Server Starts

```typescript
// In Toji.changeWorkingDirectory()
await this.mcp.createServerForProject({
  projectDirectory: directory
})
```

### 2. Discord Bot Ready → Configure Fetcher

```typescript
// In DiscordPlugin.onReady()
const fetcher = createDiscordMessageFetcher(client)
this.toji.setDiscordMessageFetcher(fetcher)
```

### 3. AI Needs Context → Calls Tool

```
AI → discord_messages tool → Discord API → Messages → AI
```

### 4. Project Closes → MCP Server Stops

```typescript
// In Toji.closeCurrentProject()
await this.mcp.closeServer(projectToClose)
```

## The MVP Tool: `discord_messages`

**What it does:** Reads recent messages from a Discord channel

**Input:**

- `channelId` (string): Which channel to read
- `limit` (number, 1-100, default 10): How many messages

**Output:**

```json
{
  "messages": [
    {
      "id": "1234567890",
      "author": "user#1234",
      "content": "Hey, I found a bug!",
      "timestamp": "2025-10-03T12:00:00.000Z"
    }
  ],
  "count": 1
}
```

## Integration Points

### 1. Toji Core (`src/main/toji/index.ts`)

- Added `mcp: McpManager` property
- Added `setDiscordMessageFetcher()` method
- Modified `changeWorkingDirectory()` to create MCP server
- Modified `closeCurrentProject()` to close MCP server

### 2. Discord Plugin (`src/plugins/discord/DiscordPlugin.ts`)

- Modified `onReady()` to configure Discord message fetcher
- Created `utils/mcp-fetcher.ts` for Discord API integration

### 3. New MCP Module (`src/main/toji/mcp/`)

- `McpManager`: Manages server instances per project
- `discord-messages.ts`: Tool implementation
- `types.ts`: TypeScript interfaces

## Key Design Decisions

### ✅ Simple = Better

- **HTTP transport**: Each server runs on its own port (3100+)
- **OpenCode integration**: Automatically writes `opencode.json` configuration
- **One tool** for MVP: Just reading messages
- **Per-project isolation**: Each project gets its own server
- **Automatic lifecycle**: No manual server management
- **Graceful degradation**: MCP failures don't break the app

### ✅ Type Safe

- Full TypeScript coverage
- Zod schemas for tool inputs/outputs
- No `any` types crossing boundaries

### ✅ Observable

- Debug logging with `DEBUG=mcp:*`
- Logs to `%APPDATA%/toji3/logs/`
- Clear error messages

## Dependencies Added

```json
{
  "@modelcontextprotocol/sdk": "^1.19.0",
  "zod": "^3.x.x"
}
```

## Testing the Integration

### 1. Start Toji with Discord bot

```bash
npm run dev
```

### 2. Open a project in a Discord channel

```
/project switch my-project
```

### 3. Ask AI about previous messages

```
"What did John say in his last message?"
```

### 4. AI internally calls discord_messages tool

The AI will:

1. Call `discord_messages` with channel ID
2. Get message history
3. Use context to answer your question

## What's Next?

### Easy Additions

- **Write tool**: Send messages to Discord
- **Project info tool**: Read project metadata
- **File listing tool**: List project files

### Future Enhancements

- **HTTP transport**: Remote MCP servers
- **More Discord tools**: Reactions, threads, embeds
- **GitHub integration**: Read issues, PRs, commits
- **File access**: Read/write project files via MCP
- **Code search**: Semantic search in codebase

## Development Notes

### Adding New Tools

1. Create tool file in `tools/`
2. Implement with `server.registerTool()`
3. Register in `mcp-manager.ts`
4. Add type definitions

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
    const result = doSomething(param)
    return {
      content: [{ type: 'text', text: result }],
      structuredContent: { result }
    }
  }
)
```

### Debug Logging

```bash
# All MCP logs
DEBUG=mcp:* npm run dev

# Specific components
DEBUG=mcp:manager,mcp:discord-messages npm run dev
```

### Error Handling

- MCP errors don't crash the app
- Failed tools return error responses
- Missing Discord client gracefully handled

## Success Criteria ✅

- [x] MCP SDK installed and integrated
- [x] Per-project MCP servers working
- [x] Discord message tool implemented
- [x] Automatic lifecycle management
- [x] Type-safe throughout
- [x] Passes all lint/typecheck
- [x] Documentation complete
- [x] Simple, maintainable code

## Files Changed/Created

### Created

- `src/main/toji/mcp/index.ts`
- `src/main/toji/mcp/types.ts`
- `src/main/toji/mcp/mcp-manager.ts`
- `src/main/toji/mcp/tools/discord-messages.ts`
- `src/main/toji/mcp/README.md`
- `src/plugins/discord/utils/mcp-fetcher.ts`

### Modified

- `src/main/toji/index.ts` (added MCP integration)
- `src/plugins/discord/DiscordPlugin.ts` (added fetcher setup)
- `package.json` (added dependencies)

## Philosophy

**Slow is smooth, smooth is fast.**

We built:

- One feature (Discord messages)
- One transport (stdio)
- One tool (read messages)
- Clean integration
- Full documentation

Next features build on this foundation. Simple scales.

## Resources

- [MCP Specification](https://modelcontextprotocol.io/)
- [MCP TypeScript SDK](https://github.com/modelcontextprotocol/typescript-sdk)
- [Anthropic MCP Announcement](https://www.anthropic.com/news/model-context-protocol)
- [OpenCode SDK](https://github.com/opencode-ai/sdk)
