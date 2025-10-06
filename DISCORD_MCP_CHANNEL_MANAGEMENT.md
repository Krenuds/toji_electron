# Discord MCP Channel Management Tools

**Date:** October 6, 2025
**Status:** COMPLETE ✅

## Overview

Added 3 new MCP tools that allow AI sessions to programmatically create, delete, and edit Discord channels through the OpenCode SDK. These tools enable autonomous channel management within the "Toji Desktop" category.

---

## New MCP Tools

### 1. **`discord_create_channel`**

Create text or voice channels in the Toji Desktop category.

**Input Schema:**

```typescript
{
  name: string           // Channel name (1-100 chars)
  type: 'text' | 'voice' // Channel type
  topic?: string         // Channel topic (text only, max 1024 chars)
  guildId?: string       // Guild ID (optional, uses first guild if omitted)
}
```

**Output:**

```typescript
{
  channelId: string
  name: string
  type: string
  parentId: string | null
  parentName: string | null
}
```

**Features:**

- ✅ Auto-creates "Toji Desktop" category if missing
- ✅ Sets appropriate permissions for text/voice channels
- ✅ Returns full channel info for reference
- ✅ Supports both text and voice channel types

**Example Usage:**

```
AI: "Create a text channel called 'project-alpha' with topic 'Alpha project discussions'"
→ Creates #project-alpha in Toji Desktop category
```

---

### 2. **`discord_delete_channel`**

Delete text or voice channels from Discord.

**Input Schema:**

```typescript
{
  channelId: string  // Channel ID to delete
  reason?: string    // Audit log reason (optional)
}
```

**Output:**

```typescript
{
  success: boolean
  deletedChannel: string
  channelType: string
}
```

**Safety Features:**

- ✅ Only deletes channels in "Toji Desktop" category
- ✅ Cannot delete category channels
- ✅ Requires valid channel ID
- ✅ Logs deletion reason in audit log

**Example Usage:**

```
AI: "Delete the test-channel we created earlier"
→ Deletes channel with audit log entry
```

---

### 3. **`discord_edit_channel`**

Edit channel name or topic.

**Input Schema:**

```typescript
{
  channelId: string    // Channel ID to edit
  name?: string        // New name (1-100 chars)
  topic?: string       // New topic (text only, max 1024 chars)
}
```

**Output:**

```typescript
{
  success: boolean
  channelId: string
  channelName: string
  channelType: string
  updatedFields: string[]  // List of fields that were updated
}
```

**Safety Features:**

- ✅ Only edits channels in "Toji Desktop" category
- ✅ Topic only applies to text channels
- ✅ Requires at least one field to update
- ✅ Returns list of updated fields

**Example Usage:**

```
AI: "Rename the alpha channel to 'project-alpha-v2'"
→ Updates channel name
```

---

## Architecture

### Service Flow

```
DiscordPlugin (creates services)
  ↓
createDiscordChannelCreator(client) ─┐
createDiscordChannelDeleter(client) ─┼──> toji.registerMCPService()
createDiscordChannelEditor(client) ──┘       ↓
                                      Service Registry (Toji)
                                             ↓
                                      McpManager.registerService()
                                             ↓
                                      Auto-registers with all MCP servers
                                             ↓
                                      OpenCode SDK sessions can use tools
```

### File Structure

**Service Implementations** (Discord Plugin):

- `src/plugins/discord/utils/mcp-channel-creator.ts`
- `src/plugins/discord/utils/mcp-channel-deleter.ts`
- `src/plugins/discord/utils/mcp-channel-editor.ts`

**MCP Tool Registrations** (Main Process):

- `src/main/toji/mcp/tools/discord-create-channel.ts`
- `src/main/toji/mcp/tools/discord-delete-channel.ts`
- `src/main/toji/mcp/tools/discord-edit-channel.ts`

**Integration Points:**

- `src/plugins/discord/DiscordPlugin.ts` - Service creation and registration (onReady)
- `src/main/toji/mcp/mcp-manager.ts` - Tool registration switch cases

---

## Service Registry Pattern

All 3 tools follow the established service registry pattern:

```typescript
// 1. Create service in DiscordPlugin.onReady()
this.channelCreator = createDiscordChannelCreator(client)

// 2. Register with Toji's service registry
this.toji.registerMCPService('discord:create-channel', this.channelCreator)

// 3. McpManager auto-registers with all MCP servers
// 4. OpenCode SDK sessions can now use the tool
```

**Service Names:**

- `discord:create-channel` → `registerDiscordCreateChannelTool()`
- `discord:delete-channel` → `registerDiscordDeleteChannelTool()`
- `discord:edit-channel` → `registerDiscordEditChannelTool()`

---

## Safety & Permissions

### Category Restriction

All tools **only operate on channels within the "Toji Desktop" category**. This prevents accidental modification of:

- Server management channels
- Community channels
- Other bot channels
- Admin channels

### Error Handling

Each tool validates:

- ✅ Channel exists
- ✅ Bot has permissions
- ✅ Channel is in Toji Desktop category
- ✅ Input parameters are valid
- ✅ Discord API responses

### Audit Logging

All operations log to:

- **Discord audit log** - Visible to server admins
- **Toji logs** - `C:\donth\AppData\Roaming\toji3\logs\`

---

## Testing

### Manual Testing Checklist

- [ ] Create text channel via MCP tool
- [ ] Create voice channel via MCP tool
- [ ] Delete channel via MCP tool
- [ ] Edit channel name via MCP tool
- [ ] Edit channel topic via MCP tool
- [ ] Verify safety checks (category restriction)
- [ ] Verify error handling (invalid channel ID)
- [ ] Check audit logs in Discord
- [ ] Check Toji logs for operations

### AI Session Testing

Ask AI to:

```
"Create a text channel called 'test-mcp-tools' in Discord"
"List all channels in the Toji Desktop category"
"Rename the test-mcp-tools channel to 'mcp-test-complete'"
"Delete the mcp-test-complete channel"
```

---

## Quality Gates ✅

All checks passed:

```bash
✅ npm run format       # Prettier formatting
✅ npm run lint         # ESLint validation
✅ npm run typecheck:node  # TypeScript compilation
✅ npm run graph        # Architecture graph (no circular deps)
```

---

## Future Enhancements

### Potential Additions:

1. **`discord_manage_permissions`** - Set channel-specific permissions
2. **`discord_create_category`** - Create new categories
3. **`discord_move_channel`** - Move channels between categories
4. **`discord_archive_channel`** - Archive channels (set read-only)
5. **`discord_bulk_operations`** - Batch create/delete/edit

### Integration Ideas:

- Auto-create channels when new projects are added
- Auto-archive channels when projects are completed
- Sync channel structure with local project structure
- Create channels from templates

---

## Commit Message

```
feat(discord): add MCP tools for channel management

Add 3 new MCP tools for Discord channel management:
- discord_create_channel: Create text/voice channels
- discord_delete_channel: Delete channels safely
- discord_edit_channel: Edit channel name/topic

Features:
- Full service registry pattern integration
- Safety checks (Toji Desktop category only)
- Comprehensive error handling
- Audit logging for all operations
- Auto-registration with all MCP servers

All quality gates pass (lint, typecheck, format, graph)

Related tools: discord_messages, discord_upload, discord_list_channels,
discord_channel_info, discord_search_messages
```

---

## Related Documentation

- **Service Registry Refactoring:** `REFACTOR_SERVICE_REGISTRY.md`
- **Discord Voice System:** `SPEC/DISCORD_VOICE_SYSTEM.md`
- **MCP Tools README:** `src/main/toji/mcp/README.md`

---

## Summary

✅ **3 new MCP tools** for channel management
✅ **Service registry pattern** (no circular dependencies)
✅ **Safety features** (category restriction, validation)
✅ **Comprehensive logging** (Discord + Toji)
✅ **Full TypeScript typing** (no `any` types)
✅ **All quality gates pass**

AI sessions can now autonomously manage Discord channels through the OpenCode SDK! 🎉
