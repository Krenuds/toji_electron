import { Collection, ChatInputCommandInteraction, Events } from 'discord.js'
import type { Client, Interaction } from 'discord.js'
import type { Toji } from '../../../main/api/Toji'
import type { DiscordPlugin, DiscordModule } from '../DiscordPlugin'
import type { DiscordChatModule } from './ChatModule'

interface SlashCommand {
  data: {
    name: string
    toJSON: () => unknown
  }
  execute: (
    interaction: ChatInputCommandInteraction,
    toji: Toji,
    chatModule?: DiscordChatModule
  ) => Promise<void>
}

/**
 * Discord Slash Command Module - Handles native Discord slash commands
 */
export class SlashCommandModule implements DiscordModule {
  private commands: Collection<string, SlashCommand> = new Collection()
  private plugin?: DiscordPlugin

  constructor(private toji: Toji) {
    // Commands will be loaded during initialization
  }

  /**
   * Initialize the module with the parent plugin
   */
  async initialize(plugin: DiscordPlugin): Promise<void> {
    this.plugin = plugin
    await this.loadCommands()
    console.log('SlashCommandModule: Initialized')
  }

  /**
   * Load all command files
   */
  private async loadCommands(): Promise<void> {
    console.log('SlashCommandModule: Loading commands via direct imports')

    try {
      // Import commands directly - this is the only way we load commands
      const helpCommand = await import('../commands/help')
      const workspaceCommand = await import('../commands/workspace')
      const sessionCommand = await import('../commands/session')
      const statusCommand = await import('../commands/status')

      const commands = [helpCommand, workspaceCommand, sessionCommand, statusCommand]

      for (const command of commands) {
        if ('data' in command && 'execute' in command) {
          this.commands.set(command.data.name, command)
          console.log(`SlashCommandModule: Loaded command ${command.data.name}`)
        }
      }

      console.log(`SlashCommandModule: Loaded ${this.commands.size} slash commands`)
    } catch (error) {
      console.error('SlashCommandModule: Failed to load commands:', error)
    }
  }

  /**
   * Setup interaction listener on Discord client
   */
  setupInteractionHandler(client: Client): void {
    client.on(Events.InteractionCreate, async (interaction: Interaction) => {
      if (!interaction.isChatInputCommand()) return

      await this.handleCommand(interaction)
    })

    console.log('SlashCommandModule: Interaction handler registered')
  }

  /**
   * Handle slash command interactions
   */
  async handleCommand(interaction: ChatInputCommandInteraction): Promise<void> {
    const command = this.commands.get(interaction.commandName)

    if (!command) {
      console.error(`SlashCommandModule: Unknown command ${interaction.commandName}`)
      await interaction.reply({
        content: 'I don&apos;t know that command!',
        ephemeral: true
      })
      return
    }

    try {
      console.log(
        `SlashCommandModule: Executing command ${interaction.commandName} ` +
          `by ${interaction.user.tag} in ${interaction.channelId}`
      )

      // Get chat module for session-related commands
      const chatModule = await this.getChatModule()

      // Execute the command
      await command.execute(interaction, this.toji, chatModule)
    } catch (error) {
      console.error(
        `SlashCommandModule: Error executing command ${interaction.commandName}:`,
        error
      )

      const errorMessage = `❌ Error executing command: ${
        error instanceof Error ? error.message : 'Unknown error'
      }`

      // Try to reply or follow up
      if (interaction.replied || interaction.deferred) {
        await interaction.followUp({
          content: errorMessage,
          ephemeral: true
        })
      } else {
        await interaction.reply({
          content: errorMessage,
          ephemeral: true
        })
      }
    }
  }

  /**
   * Get the chat module instance
   */
  private async getChatModule(): Promise<DiscordChatModule | undefined> {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const modules = (this.plugin as any)?.modules as Map<string, DiscordModule>
    return modules?.get('chat') as DiscordChatModule | undefined
  }

  /**
   * Get loaded commands for deployment
   */
  getCommands(): Collection<string, SlashCommand> {
    return this.commands
  }

  /**
   * Cleanup module resources
   */
  cleanup(): void {
    console.log('SlashCommandModule: Cleaning up')
    this.commands.clear()
  }
}
