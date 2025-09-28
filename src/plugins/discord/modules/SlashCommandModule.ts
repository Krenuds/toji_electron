import { Collection, ChatInputCommandInteraction } from 'discord.js'
import type { Toji } from '../../../main/toji'
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
      const chatCommand = await import('../commands/chat')
      // Future commands can be added here

      const commands = [helpCommand, chatCommand]

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
   * Handle slash command interactions
   */
  async handleCommand(interaction: ChatInputCommandInteraction): Promise<void> {
    const command = this.commands.get(interaction.commandName)

    if (!command) {
      console.error(`SlashCommandModule: Unknown command ${interaction.commandName}`)
      try {
        await interaction.reply({
          content: 'I don&apos;t know that command!',
          ephemeral: true
        })
      } catch (err) {
        console.error('Failed to send unknown command response:', err)
      }
      return
    }

    try {
      console.log(
        `SlashCommandModule: Executing command ${interaction.commandName} ` +
          `by ${interaction.user.tag} in ${interaction.channelId}`
      )

      // Check if interaction is still valid before executing
      if (interaction.replied) {
        console.warn('SlashCommandModule: Interaction already replied to, skipping')
        return
      }

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

      // Try to reply or follow up with proper error handling
      try {
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
      } catch (replyError) {
        console.error('SlashCommandModule: Failed to send error response:', replyError)
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
   * Cleanup module resources
   */
  cleanup(): void {
    console.log('SlashCommandModule: Cleaning up')
    this.commands.clear()
  }
}
