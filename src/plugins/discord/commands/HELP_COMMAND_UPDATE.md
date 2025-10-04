# Help Command Update

## Summary

Updated the `/help` command to provide comprehensive documentation of all available bot commands, including the new voice system.

## Changes Made

### 1. **Enhanced Description**

Added clarification that commands work within project channels in the Toji Desktop category.

### 2. **Organized Command Sections**

Reorganized commands into logical categories with visual separators:

- **Project Management**
- **Conversation Management**
- **Voice Commands** (Project Channel Only)
- **System Commands**

### 3. **Detailed Command Documentation**

#### Project Management

- **`/init`** - Complete rebuild of Discord channels from Toji projects
- **`/project list`** - List all available projects
- **`/project add`** - Add new project with path and optional name

#### Conversation Management

- **`/clear`** - Clear conversation history while maintaining project context

#### Voice Commands (NEW)

- **`/voice join`** - Join/create project voice channel
  - Must be used in project text channel
  - Creates `🎙️-{project-name}` voice channel
  - Links voice session to current project
  - One voice channel per project

- **`/voice leave`** - Leave current voice session
  - Disconnects bot from voice channel
  - Ends voice session for this project

- **`/voice status`** - Check active voice session
  - Shows project, duration, and connection status
  - Displays voice and text channel links

#### System Commands

- **`/admin`** - Check who has bot access
- **`/help`** - Show help message

### 4. **Improved Footer**

Updated footer with helpful tip:
> 💡 Tip: Each project channel maintains separate conversation context and can have its own voice session

## Command Structure

```typescript
{
  title: '🤖 Toji Bot Help',
  description: 'Project-centric AI assistant',
  fields: [
    // Permissions
    // Chat with @mention
    // ────────── (separator)
    // Project Management section
    // ────────── (separator)
    // Conversation Management section
    // ────────── (separator)
    // Voice Commands section
    // ────────── (separator)
    // System Commands section
  ],
  footer: 'Helpful tip about project channels'
}
```

## Visual Output

When users run `/help`, they see:

```
🤖 Toji Bot Help

I'm Toji, your AI coding assistant powered by OpenCode!

All commands work within project channels in the Toji Desktop category.

🔒 Permissions
Commands can only be used by:
• Server Owner
• Members with Toji Admin role

💬 Chat with @mention
Just mention me (@Toji) in any project channel and I'll respond with context awareness!

──────────
Project Management

🚀 /init
Rebuild all Discord channels from Toji projects
• Deletes all channels in Toji Desktop category
• Recreates channels from current projects
• Use when syncing Discord with local projects

📂 /project list
List all available projects with their paths and Discord channels

📂 /project add
Add a new project to Toji and create its Discord channel
• path: Absolute path to project directory (required)
• name: Custom channel name (optional)

──────────
Conversation Management

🗑️ /clear
Clear the conversation history for the current project
• Resets session but maintains project context
• Use in any project channel

──────────
Voice Commands (Project Channel Only)

🎙️ /voice join
Join/create the voice channel for this project
• Must be used in a project text channel
• Creates 🎙️-{project-name} voice channel
• Links voice session to current project
• One voice channel per project

🎙️ /voice leave
Leave the current voice session
• Disconnects bot from voice channel
• Ends voice session for this project

🎙️ /voice status
Check your active voice session
• Shows project, duration, and connection status
• Displays voice and text channel links

──────────
System Commands

⚙️ /admin
Check who has bot access
• Shows members with Toji Admin role
• Displays server owner
• Lists current permissions

❓ /help
Show this help message

💡 Tip: Each project channel maintains separate conversation context and can have its own voice session
```

## Benefits

### ✅ Comprehensive

All commands are documented with clear descriptions and usage details.

### ✅ Well-Organized

Logical grouping makes it easy to find relevant commands.

### ✅ User-Friendly

Bullet points explain parameters and behavior clearly.

### ✅ Voice System Integration

New voice commands are prominently featured with detailed explanations.

### ✅ Context Awareness

Emphasizes the project-centric nature of the bot.

### ✅ Visual Hierarchy

Separators and emojis make the help text scannable.

## Testing Checklist

- [x] Command compiles without errors
- [x] TypeScript types are correct
- [x] Linting passes
- [ ] Test `/help` command in Discord
- [ ] Verify embed formatting looks good
- [ ] Confirm all commands are listed
- [ ] Check that voice commands are accurate

## Future Enhancements

When Phase 2 of voice is implemented, update voice command descriptions to reflect:

- Audio input/output functionality
- STT/TTS integration
- Transcript logging to project channels
- Real-time conversation features

---

**Document Status**: Implemented ✅  
**Last Updated**: 2025-10-04  
**Related Files**: `src/plugins/discord/commands/help.ts`
