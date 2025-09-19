import { Collection, CommandInteraction, Events } from 'discord.js'
import type { Client, Interaction } from 'discord.js'
import type { Toji } from '../../../main/api/Toji'
import type { DiscordPlugin, DiscordModule } from '../DiscordPlugin'
import type { DiscordChatModule } from './ChatModule'
import * as fs from 'fs'
import * as path from 'path'

interface SlashCommand {
  data: {
    name: string
    toJSON: () => unknown
  }
  execute: (
    interaction: CommandInteraction,
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
    const commandsPath = path.join(__dirname, '..', 'commands')

    // Check if commands directory exists
    if (!fs.existsSync(commandsPath)) {
      console.warn('SlashCommandModule: Commands directory not found')
      return
    }

    const commandFiles = fs
      .readdirSync(commandsPath)
      .filter((file) => file.endsWith('.ts') || file.endsWith('.js'))

    for (const file of commandFiles) {
      const filePath = path.join(commandsPath, file)

      try {
        // Use dynamic import for command modules
        const commandModule = await import(filePath)
        const command = commandModule as SlashCommand

        if ('data' in command && 'execute' in command) {
          this.commands.set(command.data.name, command)
          console.log(`SlashCommandModule: Loaded command ${command.data.name}`)
        } else {
          console.warn(`SlashCommandModule: Command at ${filePath} missing required properties`)
        }
      } catch (error) {
        console.error(`SlashCommandModule: Failed to load command ${file}:`, error)
      }
    }

    console.log(`SlashCommandModule: Loaded ${this.commands.size} commands`)
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
  async handleCommand(interaction: CommandInteraction): Promise<void> {
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
