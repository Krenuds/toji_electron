# Toji Discord Bot - Project-Centric Design

## Vision

Transform Discord into a lightweight project management interface for Toji, where Discord's native UI elements (categories, channels, topics) serve as the project manager. No complex session management - just projects and conversations.

## Core Architecture

### The "Toji Desktop" Category

A dedicated Discord category that serves as the project manager:

```
📁 Toji Desktop
  ├─ 🟢 test4           [ACTIVE PROJECT]
  ├─ ⚪ my-app          [inactive]
  ├─ ⚪ another-project [inactive]
  └─ ➕ add-project     [special command channel]
```

### Key Principles

1. **One Active Project** - Only one project can be active at a time (like Electron)
2. **Channel = Project** - Each channel represents a project directory
3. **Visual State** - Active project shown via emoji/topic/color
4. **Auto-Switch** - Typing in a project channel activates it
5. **No Sessions** - Just projects and their conversation history

## Discord Commands

### Project Management

- `/project list` - Show all available projects
- `/project current` - Display the currently active project
- `/project switch [name]` - Switch to a different project
- `/project add [path]` - Add a new project (creates channel)
- `/project remove [name]` - Remove a project (archives channel)

### Chat Commands

- `/chat [message]` - Send message to Toji in current project context
- `/clear` - Clear conversation history in current project
- `/status` - Check Toji and OpenCode connection status
- `/help` - Show available commands

### Natural Interaction

- **@Toji [message]** - Works anywhere, uses active project
- **Direct messages in project channels** - Auto-activates and responds

## Implementation Architecture

### Client Management Strategy

```typescript
// Hybrid approach: Share servers, independent clients
class DiscordProjectManager {
  private activeProject?: {
    channelId: string
    projectPath: string
    client: OpencodeClient
  }

  private projects: Map<channelId, ProjectInfo> = new Map()

  async switchProject(channelId: string) {
    // Get project info
    const project = this.projects.get(channelId)

    // Get or create server from Toji
    const server = await this.toji.server.getOrCreateServer(project.path)

    // Create dedicated Discord client for this project
    const client = createOpencodeClient({
      baseUrl: server.url,
      responseStyle: 'data'
    })

    // Update active project
    this.activeProject = { channelId, projectPath: project.path, client }

    // Update Discord UI
    await this.updateChannelIndicators()
  }
}
```

### Message Flow

```
User Message → Project Channel → Auto-Switch → OpenCode Client → Response
                     ↓                              ↓
              [Makes Active]              [Project-Specific Server]
```

### Channel Structure

```typescript
interface ProjectChannel {
  name: string // Clean project name
  channelId: string // Discord channel ID
  projectPath: string // Absolute path on disk
  serverPort: number // OpenCode server port
  isActive: boolean // Visual indicator state
}
```

## User Experience Flow

### First Time Setup

1. Bot joins server
2. Creates "Toji Desktop" category automatically
3. Creates "➕ add-project" channel
4. Waits for user to add projects

### Adding a Project

1. User types path in "add-project" channel
2. Bot validates path exists
3. Creates new channel with project name
4. Starts OpenCode server for that path
5. Makes it the active project

### Working with Projects

1. User clicks on project channel (e.g., "test4")
2. Channel becomes active (visual indicator changes)
3. All messages in channel go to that project's context
4. User can freely switch by clicking different channels
5. `/chat` works from anywhere using active project

### Visual Feedback

- **Active Project**: 🟢 prefix or green topic
- **Inactive Projects**: ⚪ or no prefix
- **Channel Topics**: Show project path and status
- **Bot Status**: Shows current active project

## Technical Implementation

### Phase 1: Core Structure (MVP)

1. Create category management
2. Implement project-to-channel mapping
3. Add active project tracking
4. Handle messages in project channels

### Phase 2: Project Commands

5. Implement `/project` command suite
6. Add project addition/removal
7. Create visual status indicators
8. Handle project switching

### Phase 3: Polish

9. Add project validation
10. Implement error recovery
11. Add persistence across restarts
12. Create help documentation

## Benefits of This Approach

### Simplicity

- No session management complexity
- Clear visual project organization
- Intuitive Discord-native interface
- One active context at a time

### Scalability

- Each project has dedicated client
- Shared server infrastructure
- Clean separation of concerns
- Easy to add new projects

### User Experience

- Visual project management
- Quick project switching
- Natural Discord interaction
- Persistent conversation history per project

## State Management

### What to Persist

```typescript
interface DiscordBotState {
  activeProjectChannelId?: string
  projects: {
    [channelId: string]: {
      name: string
      path: string
      serverPort?: number
    }
  }
}
```

### On Bot Restart

1. Restore "Toji Desktop" category
2. Recreate project channels from state
3. Reconnect to OpenCode servers
4. Restore active project indicator

## Error Handling

### Common Scenarios

- **Project path not found**: Offer to remove channel
- **Server connection failed**: Show status in channel topic
- **No active project**: Prompt user to select one
- **Channel deleted**: Clean up project mapping

## Success Metrics

A properly implemented Discord bot will:

1. Create and manage "Toji Desktop" category automatically
2. Map channels to projects with visual indicators
3. Switch projects by channel interaction
4. Maintain one active project at a time
5. Provide clear visual feedback
6. Handle errors gracefully
7. Persist state across restarts

## Next Steps

1. **Implement category manager** - Create and maintain "Toji Desktop"
2. **Build project-channel mapping** - Link channels to project paths
3. **Add active project tracking** - Single active project with indicators
4. **Create project commands** - `/project` suite for management
5. **Test with real Discord** - Verify UX and performance

## Notes

- This is significantly simpler than Electron's session management
- Discord's UI becomes our file manager
- Each channel maintains its own conversation history
- Projects are persistent, conversations are clearable
- The bot should feel like a natural Discord experience

---

_This design leverages Discord's native UI to create a simple, visual project management system that requires minimal code while providing maximum clarity._
