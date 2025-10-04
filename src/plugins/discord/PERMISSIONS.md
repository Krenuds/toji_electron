# Discord Bot Permissions Setup Guide

## Overview

The Toji Discord bot now includes role-based access control. By default, only authorized users can execute bot commands.

## Who Can Use the Bot?

Commands can be executed by:

1. **Server Owner** (automatic access - no setup required)
2. **Members with the "Toji Admin" role**

## Setting Up the Toji Admin Role

### Step 1: Create the Role

1. Open **Server Settings** → **Roles**
2. Click **Create Role**
3. Name it exactly: `Toji Admin`
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

All commands require permission:

- `/help` - Shows this help information
- `/init` - Rebuilds all Discord channels from Toji projects
- `/clear` - Clears conversation history for the current channel
- `/project list` - Lists all available projects
- `/project add` - Adds a new project (future)

## Troubleshooting

### "Access Denied" Error

If a user sees an access denied message:

1. Verify the role is named exactly `Toji Admin` (case-sensitive)
2. Confirm the user has been assigned the role
3. Have the user log out and back in to Discord
4. Try the command again

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
