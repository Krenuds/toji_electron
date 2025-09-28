import { EventEmitter } from 'events'
import type { Client, Message, Interaction } from 'discord.js'
import type { Toji } from '../../main/toji'
import type { DiscordProjectManager } from './modules/DiscordProjectManager'
import type { SlashCommandModule } from './modules/SlashCommandModule'
import { deployCommands } from './deploy-commands'
import { createFileDebugLogger } from '../../main/utils/logger'
import { sendDiscordResponse } from './utils/messages'

const log = createFileDebugLogger('discord:plugin')

export interface DiscordPluginEvents {
  message: [message: Message]
  ready: [client: Client]
  error: [error: Error]
  interaction: [interaction: Interaction]
}

export interface DiscordModule {
  initialize(plugin: DiscordPlugin): void | Promise<void>
  cleanup(): void
}

/**
 * Discord Plugin - Handles Discord business logic as a consumer of the Toji API
 * This plugin receives events from DiscordService and processes them using modules
 */
export class DiscordPlugin extends EventEmitter {
  private modules: Map<string, DiscordModule> = new Map()
  private projectManager?: DiscordProjectManager
  private slashCommandModule?: SlashCommandModule
  private initialized = false

  constructor(
    private toji: Toji,
    private config?: { token?: string; clientId?: string; guildId?: string }
  ) {
    super()
  }

  /**
   * Initialize the plugin and register modules
   */
  async initialize(): Promise<void> {
    if (this.initialized) {
      log('Already initialized')
      return
    }

    log('Initializing...')

    // Import and register modules
    const { DiscordProjectManager } = await import('./modules/DiscordProjectManager')
    const { SlashCommandModule } = await import('./modules/SlashCommandModule')

    this.projectManager = new DiscordProjectManager(this.toji)
    this.slashCommandModule = new SlashCommandModule(this.toji, this.projectManager)

    await this.registerModule('project', this.projectManager)
    await this.registerModule('slashCommand', this.slashCommandModule)

    this.initialized = true
    log('Initialized successfully')
  }

  /**
   * Register a module with the plugin
   */
  private async registerModule(name: string, module: DiscordModule): Promise<void> {
    log(`Registering module: ${name}`)
    await module.initialize(this)
    this.modules.set(name, module)
  }

  /**
   * Handle incoming messages from DiscordService
   */
  async handleMessage(message: Message): Promise<void> {
    // Ignore bot's own messages
    if (message.author.bot) return

    log(`Handling message from ${message.author.tag} in channel ${message.channel.id}`)

    // Check if message is in a project channel within Toji Desktop category
    if (this.projectManager) {
      const isInTojiCategory = await this.projectManager.isInTojiCategory(message.channel.id)

      if (isInTojiCategory) {
        // It's a project channel - auto-switch and process
        if (this.projectManager.isProjectChannel(message.channel.id)) {
          try {
            log('Message in project channel, switching project...')
            // Switch to the project
            await this.projectManager.switchToProject(message.channel.id)

            // Show typing indicator
            if ('sendTyping' in message.channel) {
              await message.channel.sendTyping()
            }

            log('Calling chat with message: %s', message.content)
            // Process message through Toji
            const response = await this.projectManager.chat(message.content)

            log('Got response (%d chars), sending to Discord', response?.length || 0)
            // Send response
            await sendDiscordResponse(message, response)
          } catch (error) {
            log('ERROR: Failed to process message in project channel: %o', error)
            await message.reply(
              '❌ Error: ' + (error instanceof Error ? error.message : 'Unknown error')
            )
          }
          return
        }
      }

      // Outside Toji Desktop category - only respond to mentions
      if (message.mentions.has(message.client.user!.id)) {
        const content = message.content.replace(/<@!?\d+>/g, '').trim()
        if (!content) {
          await message.reply('Please provide a message for me to process.')
          return
        }

        try {
          // Use current active project context
          const response = await this.projectManager.chat(content)
          await sendDiscordResponse(message, response)
        } catch (error) {
          log('ERROR: Failed to process mentioned message: %o', error)
          await message.reply(
            '❌ Please select a project first using `/project switch` or type in a project channel.'
          )
        }
      }
    }
  }

  /**
   * Handle interaction events from Discord
   */
  async handleInteraction(interaction: Interaction): Promise<void> {
    log(`Handling interaction: ${interaction.type}`)

    // Route to slash command module
    if (interaction.isChatInputCommand() && this.slashCommandModule) {
      await this.slashCommandModule.handleCommand(interaction)
    }
  }

  /**
   * Handle ready event from DiscordService
   */
  async onReady(client: Client): Promise<void> {
    log(`Bot ready as ${client.user?.tag}`)

    // Initialize project manager with client
    if (this.projectManager) {
      await this.projectManager.initializeWithClient(client)
    }

    // Deploy slash commands if we have config
    if (this.config?.token && this.config?.clientId && client.user) {
      try {
        log('Deploying slash commands...')
        await deployCommands(
          this.config.token,
          this.config.clientId,
          this.config.guildId // Optional: guild-specific for faster updates
        )
        log('Slash commands deployed successfully')
      } catch (error) {
        log('ERROR: Failed to deploy commands: %o', error)
      }
    }

    this.emit('ready', client)
  }

  /**
   * Get the project manager instance
   */
  getProjectManager(): DiscordProjectManager | undefined {
    return this.projectManager
  }

  /**
   * Handle error events from DiscordService
   */
  onError(error: Error): void {
    log('ERROR: Error received: %o', error)
    this.emit('error', error)
  }

  /**
   * Cleanup plugin resources
   */
  async cleanup(): Promise<void> {
    log('Cleaning up...')

    // Cleanup all modules
    for (const [name, module] of this.modules.entries()) {
      log(`Cleaning up module: ${name}`)
      module.cleanup()
    }

    this.modules.clear()
    this.removeAllListeners()
    this.initialized = false
  }
}
