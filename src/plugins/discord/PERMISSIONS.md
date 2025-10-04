# Discord Bot Permissions Setup Guide

## Overview

The Toji Discord bot includes role-based access control. By default, only authorized users can execute bot commands.

## Who Can Use the Bot?

Commands can be executed by:

1. **Server Owner** (automatic access - no setup required)
2. **Members with the "Toji Admin" role**

## Quick Setup (Recommended)

### Automatic Setup with `/admin setup`

The easiest way to set up permissions is to use the bot's built-in admin commands:

1. **As Server Owner**, run `/admin setup`
2. The bot will automatically create the "Toji Admin" role with the correct name and color
3. Use `/admin grant @user` to give users access
4. Use `/admin revoke @user` to remove access
5. Use `/admin status` to see who has access

**That's it!** The bot handles everything automatically.

### Admin Commands (Owner Only)

- `/admin setup` - Create the Toji Admin role automatically
- `/admin status` - Check current permission setup and see who has access
- `/admin grant @user` - Give bot access to a user
- `/admin revoke @user` - Remove bot access from a user

## Manual Setup (Alternative)

If you prefer to create the role manually:

### Step 1: Create the Role

1. Open **Server Settings** → **Roles**
2. Click **Create Role**
3. Name it exactly: `Toji Admin` (case-sensitive)
4. Set permissions as desired (the bot only checks the role name, not Discord permissions)
5. Click **Save Changes**

### Step 2: Assign the Role to Users

1. Right-click on a user
2. Select **Roles**
3. Check the **Toji Admin** role
4. The user now has full access to all bot commands

### Step 3: Verify Access

Have the user try running `/help` - they should see all available commands and no access denied message.

## Available Commands

### Admin Commands (Server Owner Only)

- `/admin setup` - Create the Toji Admin role automatically
- `/admin status` - Check current permission setup
- `/admin grant @user` - Give bot access to a user
- `/admin revoke @user` - Remove bot access from a user

### Regular Commands (Requires Permission)

- `/help` - Shows this help information
- `/init` - Rebuilds all Discord channels from Toji projects
- `/clear` - Clears conversation history for the current channel
- `/project list` - Lists all available projects
- `/project add` - Adds a new project (future)

## Troubleshooting

### "Access Denied" Error

If a user sees an access denied message:

1. **Check role existence**: Run `/admin status` to see if the role exists
2. **Use automatic grant**: Run `/admin grant @user` to give them access
3. **Verify role name**: If created manually, role must be exactly `Toji Admin` (case-sensitive)
4. Have the user log out and back in to Discord
5. Try the command again

### Bot Can't Create Role

If `/admin setup` fails:

1. Check that the bot has `Manage Roles` permission
2. Go to Server Settings → Roles
3. Make sure the bot's role is above where you want the Toji Admin role
4. Try `/admin setup` again

### Role Not Working

- The role name must be **exactly** `Toji Admin` (case-sensitive)
- The user must have the role assigned
- Server owner always has access (no role needed)

## Security Notes

- Only give the Toji Admin role to trusted users
- Commands like `/init` will delete and recreate Discord channels
- Each Discord channel maintains its own AI conversation context
- The bot cannot see messages in channels where it doesn't have permissions

## Future Enhancements

Planned features:

- Configurable role name
- Multiple permission tiers (read-only vs. full access)
- Per-command permission levels
- Admin commands for role management via Discord

## Support

If you encounter issues:

1. Check that the role name is exactly `Toji Admin`
2. Verify role assignment in Server Settings
3. Contact the bot developer for technical issues
