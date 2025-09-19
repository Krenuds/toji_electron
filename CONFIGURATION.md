# Toji3 Configuration System

## Overview

The Toji3 configuration system is built on electron-store and provides persistent, encrypted storage for application settings and credentials. This document outlines the current state and our immediate goal: enabling users to configure secure credentials through the UI.

## Current Architecture

### Core Components

1. **ConfigProvider** (`/src/main/config/ConfigProvider.ts`)
   - Wrapper around electron-store
   - Handles all persistent configuration
   - Encrypts sensitive data (Discord tokens, etc.)
   - Provides typed getters/setters for config values

2. **Main Process** (`/src/main/index.ts`)
   - Initializes ConfigProvider on app startup
   - Passes config to Toji API and Discord service
   - Sets up IPC handlers for config operations

3. **IPC Bridge** (`/src/preload/index.ts`)
   - Exposes config methods to renderer
   - Currently supports: `setToken`, `hasToken`, `clearToken`

4. **UI Layer** (`/src/renderer/`)
   - Dashboard displays Discord connection status
   - `useDiscord` hook manages Discord state
   - Toggle switch for connect/disconnect (when token exists)

## Current Configuration Flow

### Discord Token Example (Our Test Case)

1. **Storage**: Token stored encrypted in electron-store via ConfigProvider
2. **Access**: Discord service retrieves token via `config.getDiscordToken()`
3. **UI Check**: Dashboard checks token existence via `discord:has-token` IPC
4. **Connection**: Manual toggle triggers `discord:connect` if token exists

### The Gap

**Users cannot currently set the Discord token through the UI.** The infrastructure exists but lacks:
- Configuration UI component
- User input for token
- Save mechanism to persist token

## Immediate Goal

Create a simple, secure pipeline for loading credentials into the configuration system:

1. **User Interface**
   - Settings view or modal
   - Secure input field for Discord token
   - Save/Cancel actions

2. **Data Flow**
   - User inputs token
   - UI calls `window.api.discord.setToken(token)`
   - IPC handler calls `config.setDiscordToken(token)`
   - Token encrypted and persisted
   - UI updates to show token configured
   - User can now connect Discord bot

## Security Considerations

- Tokens are encrypted at rest using electron-store encryption
- Never log or display full tokens
- Clear tokens from memory after use
- Validate token format before saving

## Next Steps

1. Build Settings view component
2. Add Discord configuration section
3. Implement token input with proper security
4. Test end-to-end flow
5. Extend pattern for other credentials (Slack, API keys, etc.)

## Related Files

- Configuration Provider: `/src/main/config/ConfigProvider.ts`
- IPC Handlers: `/src/main/index.ts` (setupDiscordHandlers)
- Preload Bridge: `/src/preload/index.ts` (discord methods)
- Discord Hook: `/src/renderer/src/hooks/useDiscord.ts`
- Dashboard UI: `/src/renderer/src/components/views/dashboard/DashboardViewMain.tsx`
- Discord Service: `/src/main/services/discord-service.ts`
- Discord Plugin: `/src/plugins/discord/DiscordPlugin.ts`

## Success Criteria

A user should be able to:
1. Open settings/configuration
2. Enter their Discord bot token
3. Save the token securely
4. See "Token configured" in dashboard
5. Toggle Discord bot connection on/off
6. Have token persist across app restarts