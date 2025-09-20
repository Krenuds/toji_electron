import { EventEmitter } from 'events'
import type { Client, Message, Interaction } from 'discord.js'
import type { Toji } from '../../main/toji'
import type { DiscordChatModule } from './modules/ChatModule'
import type { SlashCommandModule } from './modules/SlashCommandModule'
import { deployCommands } from './deploy-commands'

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
  private chatModule?: DiscordChatModule
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
      console.log('DiscordPlugin: Already initialized')
      return
    }

    console.log('DiscordPlugin: Initializing...')

    // Import and register modules
    const { DiscordChatModule } = await import('./modules/ChatModule')
    const { SlashCommandModule } = await import('./modules/SlashCommandModule')

    this.chatModule = new DiscordChatModule(this.toji)
    this.slashCommandModule = new SlashCommandModule(this.toji)

    await this.registerModule('chat', this.chatModule)
    await this.registerModule('slashCommand', this.slashCommandModule)

    this.initialized = true
    console.log('DiscordPlugin: Initialized successfully')
  }

  /**
   * Register a module with the plugin
   */
  private async registerModule(name: string, module: DiscordModule): Promise<void> {
    console.log(`DiscordPlugin: Registering module: ${name}`)
    await module.initialize(this)
    this.modules.set(name, module)
  }

  /**
   * Handle incoming messages from DiscordService
   */
  async handleMessage(message: Message): Promise<void> {
    console.log(`DiscordPlugin: Handling message from ${message.author.tag}`)

    // All messages go to chat module (slash commands are handled via interactions)
    if (this.chatModule) {
      await this.chatModule.handleMessage(message)
    }
  }

  /**
   * Handle interaction events from Discord
   */
  async handleInteraction(interaction: Interaction): Promise<void> {
    console.log(`DiscordPlugin: Handling interaction: ${interaction.type}`)

    // Route to slash command module
    if (interaction.isChatInputCommand() && this.slashCommandModule) {
      await this.slashCommandModule.handleCommand(interaction)
    }
  }

  /**
   * Handle ready event from DiscordService
   */
  async onReady(client: Client): Promise<void> {
    console.log(`DiscordPlugin: Bot ready as ${client.user?.tag}`)

    // Deploy slash commands if we have config
    if (this.config?.token && this.config?.clientId && client.user) {
      try {
        console.log('DiscordPlugin: Deploying slash commands...')
        await deployCommands(
          this.config.token,
          this.config.clientId,
          this.config.guildId // Optional: guild-specific for faster updates
        )
        console.log('DiscordPlugin: Slash commands deployed successfully')
      } catch (error) {
        console.error('DiscordPlugin: Failed to deploy commands:', error)
      }
    }

    this.emit('ready', client)
  }

  /**
   * Handle error events from DiscordService
   */
  onError(error: Error): void {
    console.error('DiscordPlugin: Error received:', error)
    this.emit('error', error)
  }

  /**
   * Cleanup plugin resources
   */
  async cleanup(): Promise<void> {
    console.log('DiscordPlugin: Cleaning up...')

    // Cleanup all modules
    for (const [name, module] of this.modules.entries()) {
      console.log(`DiscordPlugin: Cleaning up module: ${name}`)
      module.cleanup()
    }

    this.modules.clear()
    this.removeAllListeners()
    this.initialized = false
  }
}
