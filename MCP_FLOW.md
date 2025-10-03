# MCP Flow Diagram

## System Architecture

```
┌─────────────────────────────────────────────────────────────────┐
│                         Toji3 Application                        │
├─────────────────────────────────────────────────────────────────┤
│                                                                   │
│  ┌──────────────┐      ┌──────────────┐      ┌──────────────┐  │
│  │   Discord    │      │     Toji     │      │   OpenCode   │  │
│  │    Plugin    │◄────►│     Core     │◄────►│     SDK      │  │
│  └──────────────┘      └──────┬───────┘      └──────────────┘  │
│                               │                                  │
│                               │                                  │
│                        ┌──────▼───────┐                         │
│                        │      MCP     │                         │
│                        │    Manager   │                         │
│                        └──────┬───────┘                         │
│                               │                                  │
│          ┌────────────────────┼────────────────────┐           │
│          │                    │                    │           │
│    ┌─────▼──────┐      ┌─────▼──────┐      ┌─────▼──────┐    │
│    │MCP Server  │      │MCP Server  │      │MCP Server  │    │
│    │ Project A  │      │ Project B  │      │ Project C  │    │
│    └────────────┘      └────────────┘      └────────────┘    │
│                                                                   │
└─────────────────────────────────────────────────────────────────┘
```

## MCP Server Lifecycle

```
Project Open
     │
     ▼
┌─────────────────────┐
│  1. Open Project    │
│     Directory       │
└──────────┬──────────┘
           │
           ▼
┌─────────────────────┐
│  2. Create MCP      │
│     Server          │
│     (stdio)         │
└──────────┬──────────┘
           │
           ▼
┌─────────────────────┐
│  3. Register Tools  │
│   - discord_msgs    │
└──────────┬──────────┘
           │
           ▼
┌─────────────────────┐
│  4. Server Ready    │
│     (listening)     │
└──────────┬──────────┘
           │
           ▼
   AI Can Call Tools
           │
           ▼
┌─────────────────────┐
│  5. Project Close   │
└──────────┬──────────┘
           │
           ▼
┌─────────────────────┐
│  6. Cleanup MCP     │
│     Server          │
└─────────────────────┘
```

## Discord Message Tool Flow

```
┌──────────────┐
│  AI Request  │
│ "What did    │
│  John say?"  │
└──────┬───────┘
       │
       ▼
┌────────────────────────┐
│  OpenCode SDK          │
│  Recognizes need for   │
│  Discord context       │
└──────┬─────────────────┘
       │
       ▼
┌────────────────────────┐
│  Calls MCP Tool        │
│  discord_messages({    │
│    channelId: "123",   │
│    limit: 10           │
│  })                    │
└──────┬─────────────────┘
       │
       ▼
┌────────────────────────┐
│  MCP Server Routes     │
│  to Tool Handler       │
└──────┬─────────────────┘
       │
       ▼
┌────────────────────────┐
│  Tool Handler Calls    │
│  Discord Fetcher       │
└──────┬─────────────────┘
       │
       ▼
┌────────────────────────┐
│  Discord.js Client     │
│  Fetches Messages      │
│  from Discord API      │
└──────┬─────────────────┘
       │
       ▼
┌────────────────────────┐
│  Format Messages       │
│  [{                    │
│    author: "John",     │
│    content: "Fixed!"   │
│  }]                    │
└──────┬─────────────────┘
       │
       ▼
┌────────────────────────┐
│  Return to MCP         │
└──────┬─────────────────┘
       │
       ▼
┌────────────────────────┐
│  Return to OpenCode    │
└──────┬─────────────────┘
       │
       ▼
┌────────────────────────┐
│  AI Uses Context       │
│  to Answer Question    │
└──────┬─────────────────┘
       │
       ▼
┌────────────────────────┐
│  "John said he fixed   │
│   the auth bug"        │
└────────────────────────┘
```

## Component Interactions

```
┌─────────────────────────────────────────────────────┐
│                  Main Process                        │
├─────────────────────────────────────────────────────┤
│                                                       │
│  Toji Core                                           │
│  ├── mcp: McpManager                                │
│  │   ├── servers: Map<dir, McpServerInstance>      │
│  │   └── messageFetcher: DiscordMessageFetcher     │
│  │                                                   │
│  ├── server: ServerManager                          │
│  │   └── OpenCode servers (one per project)        │
│  │                                                   │
│  └── clientManager: ClientManager                   │
│      └── OpenCode clients (one per project)         │
│                                                       │
└─────────────────┬───────────────────────────────────┘
                  │
                  │ IPC
                  │
┌─────────────────▼───────────────────────────────────┐
│               Renderer Process                       │
├─────────────────────────────────────────────────────┤
│                                                       │
│  React UI → Hooks → IPC → Main Process              │
│                                                       │
└─────────────────────────────────────────────────────┘

┌─────────────────────────────────────────────────────┐
│              Discord Plugin                          │
├─────────────────────────────────────────────────────┤
│                                                       │
│  Discord.js Client                                   │
│  └── Message Fetcher → Toji Core → MCP Manager     │
│                                                       │
└─────────────────────────────────────────────────────┘
```

## Data Flow: Project Switch

```
User: /project switch my-app
        │
        ▼
Discord Command Handler
        │
        ▼
Toji.changeWorkingDirectory("my-app")
        │
        ├─────────────────┐
        │                 │
        ▼                 ▼
OpenCode Server      MCP Server
  (spawned)          (created)
        │                 │
        └────────┬────────┘
                 │
                 ▼
        Project Active
                 │
        ┌────────┴────────┐
        │                 │
        ▼                 ▼
   AI Chat Ready    Discord Tool Ready
```

## Key Characteristics

### ✓ Isolated

- Each project has its own MCP server
- No shared state between projects
- Clean separation of concerns

### ✓ Automatic

- Server starts with project
- Server stops with project
- No manual intervention needed

### ✓ Simple

- stdio transport (no networking)
- One tool for MVP
- Clear, linear flow

### ✓ Extensible

- Easy to add new tools
- Can support multiple transports
- Plugin architecture ready

## Debug Points

```
Enable Logging:
  DEBUG=toji:*,mcp:*,discord:* npm run dev

Log Locations:
  Windows: %APPDATA%/toji3/logs/
  macOS:   ~/Library/Logs/toji3/
  Linux:   ~/.local/share/toji3/logs/

Key Logs:
  - toji:core        (Toji lifecycle)
  - mcp:manager      (MCP server lifecycle)
  - mcp:discord-msgs (Tool execution)
  - discord:plugin   (Discord integration)
```
