# MCP Configuration Update

## The Problem

Initially, we created MCP servers with stdio transport running inside Toji's process. However, OpenCode needs to:

1. **Discover** MCP servers through configuration
2. **Connect** to MCP servers as a client
3. **Call tools** exposed by the MCP server

OpenCode discovers MCP servers through `opencode.json` in the project directory.

## The Solution

### HTTP Transport + Automatic Configuration

When Toji opens a project, it now:

1. **Spawns HTTP MCP Server** on a unique port (3100, 3101, 3102, etc.)
2. **Writes `opencode.json`** with MCP configuration
3. **OpenCode Reads Config** and connects to the MCP server
4. **Tools Available** to AI automatically

### Generated `opencode.json`

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

## Architecture Flow

```
Project Open
    ↓
Toji Creates MCP Server (HTTP on port 3100)
    ↓
Toji Writes opencode.json
    ↓
User Runs: opencode
    ↓
OpenCode Reads opencode.json
    ↓
OpenCode Connects to http://localhost:3100/mcp
    ↓
OpenCode Discovers Tools: discord_messages
    ↓
AI Can Use Tool: "Read Discord messages"
```

## How It Works

### 1. Project Opening

```typescript
// In Toji.changeWorkingDirectory()
await this.mcp.createServerForProject({
  projectDirectory: '/path/to/project'
})
```

### 2. MCP Server Creation

```typescript
// MCP Manager creates:
// - Express HTTP server on port 3100
// - MCP server with Discord tools
// - Writes opencode.json
```

### 3. OpenCode Discovery

```bash
$ cd /path/to/project
$ opencode

# OpenCode automatically:
# - Reads opencode.json
# - Connects to http://localhost:3100/mcp
# - Discovers discord_messages tool
```

### 4. AI Tool Usage

```
User: "What did John say about the bug?"

AI: [Internally calls discord_messages tool]
    GET http://localhost:3100/mcp
    Tool: discord_messages
    Params: { channelId: "123", limit: 10 }

MCP Server: Calls Discord fetcher
Discord API: Returns messages
MCP Server: Returns formatted messages
AI: Uses context to answer

AI: "John mentioned in his message from 5 minutes ago..."
```

## Key Changes

### Before (stdio)

- ❌ MCP server ran inside Toji process
- ❌ OpenCode couldn't discover it
- ❌ Tools not available to AI

### After (HTTP + Config)

- ✅ MCP server runs as HTTP service
- ✅ OpenCode discovers via opencode.json
- ✅ Tools automatically available
- ✅ Per-project isolation maintained
- ✅ Automatic port allocation

## Testing

### 1. Open a Project in Discord

```
/project switch my-app
```

### 2. Check opencode.json Created

```bash
$ cat /path/to/my-app/opencode.json
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

### 3. Run OpenCode

```bash
$ cd /path/to/my-app
$ opencode
```

### 4. Ask AI to Read Messages

```
"Can you read the last 5 messages in this Discord channel?"
```

### 5. AI Should Now Be Able To:

- Call the `discord_messages` tool
- Get message history from Discord
- Use that context in responses

## Port Allocation

- **Base Port**: 3100
- **Per Project**: Incrementing (3100, 3101, 3102, etc.)
- **Lifecycle**: Port released when project closes
- **No Conflicts**: Each project gets unique port

## Dependencies

```json
{
  "@modelcontextprotocol/sdk": "^1.19.0",
  "express": "^4.x.x",
  "@types/express": "^4.x.x",
  "zod": "^3.x.x"
}
```

## Configuration Management

### Created Automatically

When Toji opens a project, `opencode.json` is created if it doesn't exist.

### Manual Editing Supported

Users can manually edit `opencode.json` to:

- Disable the MCP server: `"enabled": false`
- Add additional MCP servers
- Configure per-agent tool access

### Example Extended Config

```json
{
  "$schema": "https://opencode.ai/config.json",
  "mcp": {
    "toji-discord": {
      "type": "remote",
      "url": "http://localhost:3100/mcp",
      "enabled": true
    },
    "my-other-mcp": {
      "type": "local",
      "command": ["node", "my-mcp-server.js"],
      "enabled": true
    }
  },
  "tools": {
    "discord_messages": true
  }
}
```

## Debugging

### Check MCP Server Running

```bash
# Should see MCP server log
DEBUG=mcp:* npm run dev

# Should see:
# mcp:manager MCP HTTP server listening on port 3100
```

### Test MCP Endpoint

```bash
curl -X POST http://localhost:3100/mcp \
  -H "Content-Type: application/json" \
  -d '{"jsonrpc":"2.0","method":"tools/list","id":1}'
```

### Check OpenCode Connection

```bash
# In project directory
$ opencode

# OpenCode should log:
# Connected to MCP server: toji-discord
# Available tools: discord_messages
```

## Success Criteria

- [x] HTTP transport implemented
- [x] Express server per project
- [x] Automatic opencode.json generation
- [x] Port allocation system
- [x] Proper server cleanup
- [x] Discord tool registered
- [x] Type-safe throughout
- [x] Documentation updated

## What's Next

1. **Test with Real OpenCode**: Open project, run `opencode`, verify tool discovery
2. **Test Tool Execution**: Ask AI to read Discord messages
3. **Monitor Logs**: Check MCP and OpenCode logs for issues
4. **Iterate**: Add more tools or improve existing ones

## Notes

- MCP servers are project-scoped (one per project directory)
- HTTP transport allows OpenCode to connect remotely
- Configuration is automatic but can be manually edited
- Port conflicts are avoided through incremental allocation
- Server lifecycle tied to project lifecycle
