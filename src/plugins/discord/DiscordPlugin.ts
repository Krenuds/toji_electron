import { EventEmitter } from 'events'
import type { Client, Message } from 'discord.js'
import type { Toji } from '../../main/api/Toji'
import type { DiscordChatModule } from './modules/ChatModule'
import type { DiscordCommandModule } from './modules/CommandModule'

export interface DiscordPluginEvents {
  message: [message: Message]
  ready: [client: Client]
  error: [error: Error]
}

export interface DiscordModule {
  initialize(plugin: DiscordPlugin): void
  cleanup(): void
}

/**
 * Discord Plugin - Handles Discord business logic as a consumer of the Toji API
 * This plugin receives events from DiscordService and processes them using modules
 */
export class DiscordPlugin extends EventEmitter {
  private modules: Map<string, DiscordModule> = new Map()
  private chatModule?: DiscordChatModule
  private commandModule?: DiscordCommandModule
  private initialized = false

  constructor(private toji: Toji) {
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
    const { DiscordCommandModule } = await import('./modules/CommandModule')

    this.chatModule = new DiscordChatModule(this.toji)
    this.commandModule = new DiscordCommandModule(this.toji)

    this.registerModule('chat', this.chatModule)
    this.registerModule('command', this.commandModule)

    this.initialized = true
    console.log('DiscordPlugin: Initialized successfully')
  }

  /**
   * Register a module with the plugin
   */
  private registerModule(name: string, module: DiscordModule): void {
    console.log(`DiscordPlugin: Registering module: ${name}`)
    module.initialize(this)
    this.modules.set(name, module)
  }

  /**
   * Handle incoming messages from DiscordService
   */
  async handleMessage(message: Message): Promise<void> {
    console.log(`DiscordPlugin: Handling message from ${message.author.tag}`)

    // Check if message is a command
    if (message.content.startsWith('/')) {
      // Route to command module
      if (this.commandModule) {
        await this.commandModule.handleCommand(message)
      }
    } else {
      // Route to chat module
      if (this.chatModule) {
        await this.chatModule.handleMessage(message)
      }
    }
  }

  /**
   * Handle ready event from DiscordService
   */
  onReady(client: Client): void {
    console.log(`DiscordPlugin: Bot ready as ${client.user?.tag}`)
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
