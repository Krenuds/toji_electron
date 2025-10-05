import { Collection, ChatInputCommandInteraction } from 'discord.js'
import type { Toji } from '../../../main/toji'
import type { DiscordModule } from '../interfaces'
import type { DiscordProjectManager } from './DiscordProjectManager'
import type { VoiceModule } from '../voice/VoiceModule'
import { createLogger } from '../../../main/utils/logger'
import { hasPermission } from '../utils/permissions'
import { DISCORD_COLORS, PERMISSION_MESSAGES, DEFAULT_ADMIN_ROLE_NAME } from '../constants'

const logger = createLogger('discord:slash-commands')

interface SlashCommand {
  data: {
    name: string
    toJSON: () => unknown
  }
  execute: (
    interaction: ChatInputCommandInteraction,
    toji: Toji,
    projectManager?: DiscordProjectManager,
    voiceModule?: VoiceModule
  ) => Promise<void>
}

/**
 * Discord Slash Command Module - Handles native Discord slash commands
 */
export class SlashCommandModule implements DiscordModule {
  private commands: Collection<string, SlashCommand> = new Collection()
  private voiceModule?: VoiceModule

  constructor(
    private toji: Toji,
    private projectManager?: DiscordProjectManager
  ) {
    // Commands will be loaded during initialization
  }

  /**
   * Set the voice module after construction
   */
  setVoiceModule(voiceModule: VoiceModule): void {
    this.voiceModule = voiceModule
    logger.debug('Voice module registered')
  }

  /**
   * Initialize the module with the parent plugin
   */
  async initialize(): Promise<void> {
    await this.loadCommands()
    logger.debug('Initialized')
  }

  /**
   * Load all command files
   */
  private async loadCommands(): Promise<void> {
    logger.debug('Loading commands via direct imports')

    try {
      // Import commands directly - this is the only way we load commands
      const helpCommand = await import('../commands/help')
      const initCommand = await import('../commands/init')
      const projectCommand = await import('../commands/project')
      const clearCommand = await import('../commands/clear')
      const adminCommand = await import('../commands/admin')
      const voiceCommand = await import('../commands/voice')

      this.commands.set('help', helpCommand)
      this.commands.set('init', initCommand)
      this.commands.set('project', projectCommand)
      this.commands.set('clear', clearCommand)
      this.commands.set('admin', adminCommand)
      this.commands.set('voice', voiceCommand)

      logger.debug(`Loaded ${this.commands.size} slash commands`)
    } catch (error) {
      logger.debug('ERROR: Failed to load commands: %o', error)
    }
  }

  /**
   * Handle slash command interactions
   */
  async handleCommand(interaction: ChatInputCommandInteraction): Promise<void> {
    const command = this.commands.get(interaction.commandName)

    if (!command) {
      logger.debug('ERROR: Unknown command %s', interaction.commandName)
      try {
        await interaction.reply({
          content: 'I don&apos;t know that command!',
          ephemeral: true
        })
      } catch (err) {
        logger.debug('ERROR: Failed to send unknown command response: %o', err)
      }
      return
    }

    try {
      logger.debug(
        'Executing command %s by %s in %s',
        interaction.commandName,
        interaction.user.tag,
        interaction.channelId
      )

      // Check if interaction is still valid before executing
      if (interaction.replied) {
        logger.debug('WARNING: Interaction already replied to, skipping')
        return
      }

      // Check permissions before executing command (except help and admin which anyone can use)
      const publicCommands = ['help', 'admin']
      const skipPermissionCheck = publicCommands.includes(interaction.commandName)

      if (
        !skipPermissionCheck &&
        !hasPermission(interaction, { adminRoleName: DEFAULT_ADMIN_ROLE_NAME })
      ) {
        logger.debug(
          'Permission denied for user %s on command %s',
          interaction.user.tag,
          interaction.commandName
        )
        await interaction.reply({
          embeds: [
            {
              color: DISCORD_COLORS.ERROR,
              title: PERMISSION_MESSAGES.ACCESS_DENIED.TITLE,
              description: PERMISSION_MESSAGES.ACCESS_DENIED.DESCRIPTION,
              fields: [
                {
                  name: PERMISSION_MESSAGES.ROLE_INFO.TITLE,
                  value: [
                    `• ${PERMISSION_MESSAGES.ROLE_INFO.SERVER_OWNER}`,
                    `• ${PERMISSION_MESSAGES.ROLE_INFO.ADMIN_ROLE(DEFAULT_ADMIN_ROLE_NAME)}`
                  ].join('\n')
                }
              ],
              footer: {
                text: 'Contact your server owner to get access'
              }
            }
          ],
          ephemeral: true
        })
        return
      }

      // Execute the command with projectManager and voiceModule
      await command.execute(interaction, this.toji, this.projectManager, this.voiceModule)
    } catch (error) {
      logger.debug('ERROR: Error executing command %s: %o', interaction.commandName, error)

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
        logger.debug('ERROR: Failed to send error response: %o', replyError)
      }
    }
  }

  /**
   * Cleanup module resources
   */
  cleanup(): void {
    logger.debug('Cleaning up')
    this.commands.clear()
  }
}
