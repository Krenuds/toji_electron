# NEXT Steps & Session Learnings

## Session Summary (2025-09-28)

### What We Accomplished

#### 1. Discord Integration MVP ✅

- **Fixed Discord ChatModule** to use real Toji chat instead of placeholder responses
- **Created `/chat` slash command** for Discord interactions with proper session management
- **Built Integrations UI** with token management, connection controls, and status display
- **Added Discord branding** with official colors (#5865F2) and logo (FaDiscord)
- **Implemented bot invite link** with administrator permissions
- **Fixed UI auto-update** when saving Discord token

#### 2. Code Cleanup & Refactoring

- Removed ~1300 lines of dead code across 8 files
- Cleaned up ConfigProvider from 292 to 134 lines (removed 60% unused methods)
- Fixed file extensions (.tsx → .ts for main process files)
- Consolidated dashboard components into chat module

#### 3. Key Issues Discovered

##### OpenCode Server Connection Problem 🔴

**Critical Issue**: OpenCode server returns "No response data" errors

- Sessions API failing: `Failed to list sessions: No response data`
- Create session failing: `Failed to create session: No response data`
- Connection refused: `ECONNREFUSED 127.0.0.1:4096`

**Root Cause** (from previous investigation):

- OpenCode server spawns from one directory and stays there
- Server reuse logic doesn't check if server is in correct directory
- When switching projects, server is still looking at old project files

##### Discord Bot Integration Status

- ✅ Bot connects and appears online
- ✅ Slash commands registered
- ✅ Token storage working
- ✅ UI updates properly
- ❌ Chat responses failing due to OpenCode connection issue

## Architecture Insights

### Discord Integration Architecture

```
User -> Discord -> DiscordService (main) -> DiscordPlugin -> ChatModule -> Toji -> OpenCode SDK
```

**Key Design Decisions:**

- Discord runs in main process for security and reliability
- One Toji session per Discord channel for context isolation
- DiscordPlugin acts as business logic layer consuming Toji API
- SlashCommandModule handles Discord's native commands

### Session Management Pattern

```typescript
// Per-channel session mapping
const sessionName = `discord-${channel.id}`
const session = await toji.createSession(sessionName)
await toji.chat(message, session.id)
```

### UI State Management Fix

```typescript
// Problem: refreshStatus() didn't update hasToken
// Solution: Check both token and status when refreshing
const refreshStatus = async () => {
  await checkToken() // Added this line
  const discordStatus = await window.api.discord.getStatus()
  setStatus(discordStatus)
}
```

## Critical Next Steps

### 1. Fix OpenCode Server Management (HIGHEST PRIORITY)

**The Problem:**

- Server spawns from initial directory and never moves
- Path comparison fails due to format mismatches
- Server blindly reused without checking directory

**The Solution:**

```typescript
// In server.ts - Check where server is actually running
async getServerDirectory(): Promise<string> {
  const response = await fetch(`http://127.0.0.1:${port}/path`)
  return normalizePath(response.data.path)
}

// Before reusing server, verify it's in right directory
if (existingServer) {
  const serverDir = await getServerDirectory()
  if (normalizePath(serverDir) !== normalizePath(targetDir)) {
    await killServer()
    await startNewServer(targetDir)
  }
}
```

### 2. Complete Discord-Toji Integration

Once OpenCode is fixed:

- [ ] Test end-to-end chat flow with real responses
- [ ] Handle Discord's 2000 character limit for long responses
- [ ] Add typing indicators while processing
- [ ] Implement error recovery for failed messages

### 3. Session Persistence

- [ ] Store Discord channel → Toji session mappings in config
- [ ] Restore sessions on app restart
- [ ] Clean up old sessions periodically
- [ ] Show session history in UI

## Known Issues & Solutions

### Issue: Multiple Dev Servers Running

**Symptom**: Ports 5173-5176 all occupied
**Solution**: Kill all node processes and restart

### Issue: OpenCode "No response data"

**Symptom**: All session operations fail
**Solution**: Implement proper server directory management (see above)

### Issue: Discord Token Not Updating UI

**Symptom**: Save token but UI doesn't change
**Solution**: ✅ Already fixed - refreshStatus() now calls checkToken()

## Testing Checklist

### Discord Integration

- [ ] Save token → UI updates to show connection controls
- [ ] Connect bot → Bot appears online in Discord
- [ ] Invite bot to server using generated link
- [ ] Use `/chat` command → Get AI response
- [ ] Multiple channels → Independent sessions
- [ ] Disconnect → Bot goes offline
- [ ] Clear token → Returns to token input

### OpenCode Integration

- [ ] Switch projects → Server restarts if needed
- [ ] Create session → No errors
- [ ] Send chat message → Get response
- [ ] List sessions → Shows all sessions
- [ ] Path with spaces → Works correctly

## Configuration Requirements

### Discord Bot Setup

1. Create app at https://discord.com/developers/applications
2. Bot section → Reset Token → Copy token
3. Bot section → Enable MESSAGE CONTENT intent
4. OAuth2 → URL Generator → Select bot + applications.commands
5. Select Administrator permission
6. Use generated URL to invite bot

### Environment Variables

```env
# Required for OpenCode to use Claude
ANTHROPIC_API_KEY=sk-ant-...
```

### Project Requirements

- Must have `.git` directory
- Must have at least one commit (or shows as "global")
- Must have `opencode.json` config file

## Debugging Commands

```bash
# Check OpenCode servers
tasklist | findstr opencode

# Kill all Node processes (nuclear option)
taskkill /F /IM node.exe

# View logs
tail -50 "C:\Users\donth\AppData\Roaming\toji3\logs\toji-2025-09-28.log"

# Test OpenCode manually
cd "C:\Users\donth\toji3"
opencode serve --port 4096

# Check Discord bot in dev tools console
window.api.discord.getStatus()
window.api.discord.getDebugInfo()
```

## Code Locations

### Discord Integration

- `src/plugins/discord/` - Discord bot implementation
- `src/main/services/discord-service.ts` - Discord service layer
- `src/main/handlers/discord.handlers.ts` - IPC handlers
- `src/renderer/src/components/views/integrations/` - UI components
- `src/renderer/src/hooks/useDiscord.ts` - React hook

### OpenCode/Toji Integration

- `src/main/toji/` - Toji business logic
- `src/main/toji/server.ts` - OpenCode server management (NEEDS FIX)
- `src/main/toji/sessions.ts` - Session management
- `src/main/toji/index.ts` - Main Toji class

## Success Metrics

### Working MVP

- [x] Discord bot UI complete with branding
- [x] Token management secure and functional
- [x] Bot connects and shows online
- [x] Slash commands registered
- [ ] Chat commands return AI responses (blocked by OpenCode)
- [x] Sessions created per channel
- [x] UI auto-updates on state changes

### Production Ready

- [ ] Error recovery and retry logic
- [ ] Rate limiting on commands
- [ ] Session cleanup on disconnect
- [ ] Multi-project support
- [ ] Comprehensive error messages
- [ ] Loading states for all operations

## Final Notes

The Discord integration is architecturally complete and the UI is polished. The only blocker is the OpenCode server connection issue, which is a known problem with a clear solution (proper server directory management).

Once the server management is fixed, the Discord bot should work end-to-end. The session-per-channel pattern is implemented and ready. The UI properly reflects all states and uses official Discord branding.

**Key Insight**: The OpenCode server subprocess working directory is FIXED at spawn time. We must spawn a new server from each project directory or implement a multi-server architecture with different ports per project.
