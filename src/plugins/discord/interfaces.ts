/**
 * Shared interfaces to break circular dependencies in Discord plugin
 *
 * This file contains minimal interface definitions that multiple modules need
 * without creating circular dependencies. Do NOT import from DiscordPlugin.ts here.
 */

import type { Client, Message, Interaction } from 'discord.js'

/**
 * Base interface for Discord modules
 * Modules implement this to be registered with the Discord plugin
 */
export interface DiscordModule {
  initialize(plugin?: IDiscordPlugin): void | Promise<void>
  cleanup(): void
}

/**
 * Discord plugin event types
 */
export interface DiscordPluginEvents {
  message: [message: Message]
  ready: [client: Client]
  error: [error: Error]
  interaction: [interaction: Interaction]
}

/**
 * Minimal interface for DiscordPlugin functionality needed by modules
 * This prevents circular dependency: DiscordPlugin → modules → DiscordPlugin
 */
export interface IDiscordPlugin {
  on<K extends keyof DiscordPluginEvents>(
    event: K,
    listener: (...args: DiscordPluginEvents[K]) => void
  ): this
  once<K extends keyof DiscordPluginEvents>(
    event: K,
    listener: (...args: DiscordPluginEvents[K]) => void
  ): this
  off<K extends keyof DiscordPluginEvents>(
    event: K,
    listener: (...args: DiscordPluginEvents[K]) => void
  ): this
  emit<K extends keyof DiscordPluginEvents>(event: K, ...args: DiscordPluginEvents[K]): boolean
}
