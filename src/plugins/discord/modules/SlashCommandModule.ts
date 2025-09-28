import { Collection, ChatInputCommandInteraction } from 'discord.js'
import type { Toji } from '../../../main/toji'
import type { DiscordPlugin, DiscordModule } from '../DiscordPlugin'
import type { DiscordProjectManager } from './DiscordProjectManager'
import { createFileDebugLogger } from '../../../main/utils/logger'

const log = createFileDebugLogger('discord:slash-commands')

interface SlashCommand {
  data: {
    name: string
    toJSON: () => unknown
  }
  execute: (
    interaction: ChatInputCommandInteraction,
    toji: Toji,
    projectManager?: DiscordProjectManager
  ) => Promise<void>
}

/**
 * Discord Slash Command Module - Handles native Discord slash commands
 */
export class SlashCommandModule implements DiscordModule {
  private commands: Collection<string, SlashCommand> = new Collection()

  constructor(
    private toji: Toji,
    private projectManager?: DiscordProjectManager
  ) {
    // Commands will be loaded during initialization
  }

  /**
   * Initialize the module with the parent plugin
   */
  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  async initialize(_plugin: DiscordPlugin): Promise<void> {
    await this.loadCommands()
    log('Initialized')
  }

  /**
   * Load all command files
   */
  private async loadCommands(): Promise<void> {
    log('Loading commands via direct imports')

    try {
      // Import commands directly - this is the only way we load commands
      const helpCommand = await import('../commands/help')
      const chatCommand = await import('../commands/chat')
      const statusCommand = await import('../commands/status')
      const clearCommand = await import('../commands/clear')
      const projectCommand = await import('../commands/project')
      const initCommand = await import('../commands/init')
      const refreshCommand = await import('../commands/refresh')

      const commands = [
        helpCommand,
        chatCommand,
        statusCommand,
        clearCommand,
        projectCommand,
        initCommand,
        refreshCommand
      ]

      for (const command of commands) {
        if ('data' in command && 'execute' in command) {
          this.commands.set(command.data.name, command)
          log(`Loaded command ${command.data.name}`)
        }
      }

      log(`Loaded ${this.commands.size} slash commands`)
    } catch (error) {
      log('ERROR: Failed to load commands: %o', error)
    }
  }

  /**
   * Handle slash command interactions
   */
  async handleCommand(interaction: ChatInputCommandInteraction): Promise<void> {
    const command = this.commands.get(interaction.commandName)

    if (!command) {
      log('ERROR: Unknown command %s', interaction.commandName)
      try {
        await interaction.reply({
          content: 'I don&apos;t know that command!',
          ephemeral: true
        })
      } catch (err) {
        log('ERROR: Failed to send unknown command response: %o', err)
      }
      return
    }

    try {
      log(
        'Executing command %s by %s in %s',
        interaction.commandName,
        interaction.user.tag,
        interaction.channelId
      )

      // Check if interaction is still valid before executing
      if (interaction.replied) {
        log('WARNING: Interaction already replied to, skipping')
        return
      }

      // Execute the command with projectManager
      await command.execute(interaction, this.toji, this.projectManager)
    } catch (error) {
      log('ERROR: Error executing command %s: %o', interaction.commandName, error)

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
        log('ERROR: Failed to send error response: %o', replyError)
      }
    }
  }

  /**
   * Cleanup module resources
   */
  cleanup(): void {
    log('Cleaning up')
    this.commands.clear()
  }
}
