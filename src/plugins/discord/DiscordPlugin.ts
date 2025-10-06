import { EventEmitter } from 'events'
import type { Client, Message, Interaction } from 'discord.js'
import type { Toji } from '../../main/toji'
import type { DiscordProjectManager } from './modules/DiscordProjectManager'
import type { SlashCommandModule } from './modules/SlashCommandModule'
import { deployCommands } from './deploy-commands'
import { createLogger } from '../../main/utils/logger'
import {
  sendDiscordResponse,
  createProgressEmbed,
  updateProgressEmbed,
  createToolActivity,
  updateToolActivity
} from './utils/messages'
import { createErrorEmbed } from './utils/errors'
import { createDiscordMessageFetcher } from './utils/mcp-fetcher'
import { createDiscordFileUploader } from './utils/mcp-uploader'
import { createDiscordChannelLister } from './utils/mcp-channel-lister'
import { createDiscordChannelInfoProvider } from './utils/mcp-channel-info'
import { createDiscordMessageSearcher } from './utils/mcp-message-searcher'
import { downloadAttachments, formatAttachmentMessage } from './utils/file-downloader'
import { DISCORD_COLORS } from './constants'
import type { DiscordModule, DiscordPluginEvents, IDiscordPlugin } from './interfaces'

const logger = createLogger('discord:plugin')

// Re-export for backward compatibility
export type { DiscordPluginEvents, DiscordModule, IDiscordPlugin }

/**
 * Discord Plugin - Handles Discord business logic as a consumer of the Toji API
 * This plugin receives events from DiscordService and processes them using modules
 */
export class DiscordPlugin extends EventEmitter {
  private modules: Map<string, DiscordModule> = new Map()
  private projectManager?: DiscordProjectManager
  private slashCommandModule?: SlashCommandModule
  private voiceModule?: import('./voice/VoiceModule').VoiceModule
  private initialized = false
  private messageFetcher?: ReturnType<typeof createDiscordMessageFetcher>
  private fileUploader?: ReturnType<typeof createDiscordFileUploader>
  private channelLister?: ReturnType<typeof createDiscordChannelLister>
  private channelInfoProvider?: ReturnType<typeof createDiscordChannelInfoProvider>
  private messageSearcher?: ReturnType<typeof createDiscordMessageSearcher>

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
      logger.debug('Already initialized')
      return
    }

    logger.debug('Initializing...')

    // Import and register modules
    const { DiscordProjectManager } = await import('./modules/DiscordProjectManager')
    const { SlashCommandModule } = await import('./modules/SlashCommandModule')
    const { VoiceModule } = await import('./voice/VoiceModule')

    this.projectManager = new DiscordProjectManager(this.toji)
    this.slashCommandModule = new SlashCommandModule(this.toji, this.projectManager)
    this.voiceModule = new VoiceModule()

    await this.registerModule('project', this.projectManager)
    await this.registerModule('slashCommand', this.slashCommandModule)
    await this.registerModule('voice', this.voiceModule)

    // Register voice module with slash command module
    this.slashCommandModule.setVoiceModule(this.voiceModule)

    this.initialized = true
    logger.debug('Initialized successfully')
  }

  /**
   * Register a module with the plugin
   */
  private async registerModule(name: string, module: DiscordModule): Promise<void> {
    logger.debug(`Registering module: ${name}`)
    await module.initialize(this)
    this.modules.set(name, module)
  }

  /**
   * Handle incoming messages from DiscordService
   */
  async handleMessage(message: Message): Promise<void> {
    // Ignore bot's own messages UNLESS it's a transcription message (has embeds with DISCORD_COLORS.INFO)
    if (message.author.bot) {
      // Allow transcription messages (they have embeds with INFO color and content text)
      const isTranscription =
        message.embeds.length > 0 &&
        message.embeds[0].color === DISCORD_COLORS.INFO &&
        message.content.length > 0
      if (!isTranscription) {
        return
      }
      logger.debug(`Processing transcription message: "${message.content.substring(0, 50)}..."`)
    }

    logger.debug(`Handling message from ${message.author.tag} in channel ${message.channel.id}`)

    // Update current channel for MCP context
    if (this.messageFetcher) {
      this.messageFetcher.setCurrentChannel(message.channel.id)
    }
    if (this.fileUploader) {
      this.fileUploader.setCurrentChannel(message.channel.id)
    }

    // Check if message is in a project channel within Toji Desktop category
    if (this.projectManager) {
      const isInTojiCategory = await this.projectManager.isInTojiCategory(message.channel.id)

      if (isInTojiCategory) {
        // It's a project channel - auto-switch and process
        if (this.projectManager.isProjectChannel(message.channel.id)) {
          try {
            logger.debug('Message in project channel, switching project...')
            // Switch to the project
            await this.projectManager.switchToProject(message.channel.id)

            // Show typing indicator
            if ('sendTyping' in message.channel) {
              await message.channel.sendTyping()
            }

            // Handle file attachments - download to project directory
            const projectPath = this.toji.getCurrentProjectDirectory()
            let messageContent = message.content

            if (message.attachments.size > 0 && projectPath) {
              try {
                logger.debug('Downloading %d attachment(s) to project', message.attachments.size)
                const downloadedFiles = await downloadAttachments(message, projectPath)

                if (downloadedFiles.length > 0) {
                  const attachmentInfo = formatAttachmentMessage(downloadedFiles)
                  // Prepend attachment info to message content
                  messageContent = messageContent
                    ? `${attachmentInfo}\n\n${messageContent}`
                    : attachmentInfo
                  logger.debug('Downloaded %d file(s) successfully', downloadedFiles.length)
                }
              } catch (error) {
                logger.debug('ERROR: Failed to download attachments: %o', error)
                await message.reply('⚠️ Warning: Failed to download some attachments')
              }
            }

            // Skip if message is empty after processing
            if (!messageContent || !messageContent.trim()) {
              await message.reply(
                '💬 Please include a message with your files, or just type something for me to respond to.'
              )
              return
            }

            logger.debug(
              'Calling streaming chat with message: %s',
              messageContent.substring(0, 100)
            )

            // Process message through Toji with streaming progress embeds
            let progressMessage: Message | undefined
            let lastUpdate = Date.now()
            let updateCount = 0
            const UPDATE_THROTTLE = 1000 // 1 second between updates
            const toolActivity = createToolActivity()

            await this.projectManager.chatStreaming(messageContent, {
              onChunk: async (text) => {
                const now = Date.now()
                const charCount = text.length

                if (!progressMessage) {
                  // Send initial progress embed
                  updateCount++
                  const embed = createProgressEmbed(updateCount, toolActivity)
                  progressMessage = await message.reply({ embeds: [embed] })
                  lastUpdate = now
                  logger.debug('Sent initial progress embed')
                } else if (now - lastUpdate >= UPDATE_THROTTLE) {
                  // Update progress embed (throttled to respect rate limits)
                  updateCount++
                  const embed = updateProgressEmbed(updateCount, toolActivity)
                  await progressMessage.edit({ embeds: [embed] })
                  lastUpdate = now
                  logger.debug('✅ Updated progress embed: %d chars', charCount)
                }
                // Throttled updates are silently skipped
              },

              onTool: async (toolEvent) => {
                logger.debug('🔧 Tool event: %s - %s', toolEvent.tool, toolEvent.state.status)
                updateToolActivity(toolActivity, toolEvent)

                // Force update progress embed with tool info (not throttled for important tool events)
                if (
                  progressMessage &&
                  (toolEvent.state.status === 'running' || toolEvent.state.status === 'completed')
                ) {
                  updateCount++ // Increment since we're updating the embed
                  const embed = updateProgressEmbed(updateCount, toolActivity)
                  await progressMessage.edit({ embeds: [embed] })
                  lastUpdate = Date.now()
                  logger.debug('✅ Updated progress embed with tool info')
                }
              },

              onComplete: async (fullText) => {
                logger.debug(
                  'Got complete response (%d chars), sending to Discord',
                  fullText.length
                )
                // Delete progress message and send final response
                if (progressMessage) {
                  await progressMessage.delete()
                }
                await sendDiscordResponse(message, fullText)

                // If bot is in a voice channel in this guild, speak the response
                if (this.voiceModule && message.guildId) {
                  const sessions = this.voiceModule.getAllSessions()
                  const guildSession = sessions.find((s) => s.config.guildId === message.guildId)
                  if (guildSession) {
                    await this.voiceModule.speak(guildSession.id, fullText)
                  }
                }
              },

              onError: async (error) => {
                logger.debug('ERROR: Streaming chat failed: %o', error)
                // Replace progress with error embed
                if (progressMessage) {
                  const errorEmbed = createErrorEmbed(error, 'Chat')
                  await progressMessage.edit({ embeds: [errorEmbed] })
                } else {
                  await message.reply('❌ Error: ' + error.message)
                }
              }
            })
          } catch (error) {
            logger.debug('ERROR: Failed to process message in project channel: %o', error)
            await message.reply(
              '❌ Error: ' + (error instanceof Error ? error.message : 'Unknown error')
            )
          }
          return
        }
      }

      // Outside Toji Desktop category - only respond to mentions
      if (message.mentions.has(message.client.user!.id)) {
        let content = message.content.replace(/<@!?\d+>/g, '').trim()

        // Handle file attachments if project is active
        const projectPath = this.toji.getCurrentProjectDirectory()
        if (message.attachments.size > 0 && projectPath) {
          try {
            logger.debug(
              'Downloading %d attachment(s) to project (mention)',
              message.attachments.size
            )
            const downloadedFiles = await downloadAttachments(message, projectPath)

            if (downloadedFiles.length > 0) {
              const attachmentInfo = formatAttachmentMessage(downloadedFiles)
              content = content ? `${attachmentInfo}\n\n${content}` : attachmentInfo
              logger.debug('Downloaded %d file(s) successfully (mention)', downloadedFiles.length)
            }
          } catch (error) {
            logger.debug('ERROR: Failed to download attachments (mention): %o', error)
            await message.reply('⚠️ Warning: Failed to download some attachments')
          }
        }

        if (!content) {
          await message.reply('Please provide a message for me to process.')
          return
        }

        try {
          // Use current active project context with streaming progress embeds
          let progressMessage: Message | undefined
          let lastUpdate = Date.now()
          let updateCount = 0
          const UPDATE_THROTTLE = 1000 // 1 second between updates
          const toolActivity = createToolActivity()

          await this.projectManager.chatStreaming(content, {
            onChunk: async (text) => {
              const now = Date.now()
              const charCount = text.length

              if (!progressMessage) {
                // Send initial progress embed
                updateCount++
                const embed = createProgressEmbed(updateCount, toolActivity)
                progressMessage = await message.reply({ embeds: [embed] })
                lastUpdate = now
                logger.debug('Sent initial progress embed (mention)')
              } else if (now - lastUpdate >= UPDATE_THROTTLE) {
                // Update progress embed (throttled to respect rate limits)
                updateCount++
                const embed = updateProgressEmbed(updateCount, toolActivity)
                await progressMessage.edit({ embeds: [embed] })
                lastUpdate = now
                logger.debug('✅ Updated progress embed: %d chars (mention)', charCount)
              }
              // Throttled updates are silently skipped
            },

            onTool: async (toolEvent) => {
              logger.debug(
                '🔧 Tool event (mention): %s - %s',
                toolEvent.tool,
                toolEvent.state.status
              )
              updateToolActivity(toolActivity, toolEvent)

              // Force update progress embed with tool info
              if (
                progressMessage &&
                (toolEvent.state.status === 'running' || toolEvent.state.status === 'completed')
              ) {
                updateCount++ // Increment since we're updating the embed
                const embed = updateProgressEmbed(updateCount, toolActivity)
                await progressMessage.edit({ embeds: [embed] })
                lastUpdate = Date.now()
                logger.debug('✅ Updated progress embed with tool info (mention)')
              }
            },

            onComplete: async (fullText) => {
              // Delete progress message and send final response
              if (progressMessage) {
                await progressMessage.delete()
              }
              await sendDiscordResponse(message, fullText)

              // If bot is in a voice channel in this guild, speak the response
              if (this.voiceModule && message.guildId) {
                const sessions = this.voiceModule.getAllSessions()
                const guildSession = sessions.find((s) => s.config.guildId === message.guildId)
                if (guildSession) {
                  await this.voiceModule.speak(guildSession.id, fullText)
                }
              }
            },

            onError: async (error) => {
              logger.debug('ERROR: Streaming chat failed: %o', error)
              // Replace progress with error embed
              if (progressMessage) {
                const errorEmbed = createErrorEmbed(error, 'Chat')
                await progressMessage.edit({ embeds: [errorEmbed] })
              } else {
                await message.reply('❌ Error: ' + error.message)
              }
            }
          })
        } catch (error) {
          logger.debug('ERROR: Failed to process mentioned message: %o', error)
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
    logger.debug(`Handling interaction: ${interaction.type}`)

    // Route to slash command module
    if (interaction.isChatInputCommand() && this.slashCommandModule) {
      await this.slashCommandModule.handleCommand(interaction)
    }
  }

  /**
   * Handle Discord client ready event
   */
  async onReady(client: Client): Promise<void> {
    logger.debug('Discord client is ready')

    // Initialize project manager with client if not already initialized
    if (this.projectManager) {
      await this.projectManager.initializeWithClient(client)
    }

    // Initialize voice module with client
    if (this.voiceModule) {
      await this.voiceModule.initializeWithClient(client)
    }

    // Configure MCP Discord message fetcher
    try {
      this.messageFetcher = createDiscordMessageFetcher(client)
      this.toji.setDiscordMessageFetcher(this.messageFetcher)
      logger.debug('MCP Discord message fetcher configured')
    } catch (error) {
      logger.debug('Warning: Failed to configure MCP Discord message fetcher: %o', error)
    }

    // Configure MCP Discord file uploader
    try {
      this.fileUploader = createDiscordFileUploader(client)
      this.toji.setDiscordFileUploader(this.fileUploader)
      logger.debug('MCP Discord file uploader configured')
    } catch (error) {
      logger.debug('Warning: Failed to configure MCP Discord file uploader: %o', error)
    }

    // Configure MCP Discord channel lister
    try {
      this.channelLister = createDiscordChannelLister(client)
      this.toji.setDiscordChannelLister(this.channelLister)
      logger.debug('MCP Discord channel lister configured')
    } catch (error) {
      logger.debug('Warning: Failed to configure MCP Discord channel lister: %o', error)
    }

    // Configure MCP Discord channel info provider
    try {
      this.channelInfoProvider = createDiscordChannelInfoProvider(client)
      this.toji.setDiscordChannelInfoProvider(this.channelInfoProvider)
      logger.debug('MCP Discord channel info provider configured')
    } catch (error) {
      logger.debug('Warning: Failed to configure MCP Discord channel info provider: %o', error)
    }

    // Configure MCP Discord message searcher
    try {
      this.messageSearcher = createDiscordMessageSearcher(client)
      this.toji.setDiscordMessageSearcher(this.messageSearcher)
      logger.debug('MCP Discord message searcher configured')
    } catch (error) {
      logger.debug('Warning: Failed to configure MCP Discord message searcher: %o', error)
    }

    // Deploy slash commands if we have config
    if (this.config?.token && this.config?.clientId && client.user) {
      try {
        logger.debug('Deploying slash commands...')
        await deployCommands(
          this.config.token,
          this.config.clientId,
          this.config.guildId // Optional: guild-specific for faster updates
        )
        logger.debug('Slash commands deployed successfully')
      } catch (error) {
        logger.debug('ERROR: Failed to deploy commands: %o', error)
      }
    }

    // Auto-create Toji Admin role in all guilds if it doesn't exist
    await this.ensureAdminRoleExists(client)

    this.emit('ready', client)
  }

  /**
   * Ensure the Toji Admin role exists in all guilds
   */
  private async ensureAdminRoleExists(client: Client): Promise<void> {
    const { DEFAULT_ADMIN_ROLE_NAME } = await import('./constants')

    for (const [, guild] of client.guilds.cache) {
      try {
        const existingRole = guild.roles.cache.find((role) => role.name === DEFAULT_ADMIN_ROLE_NAME)

        if (!existingRole) {
          logger.debug(
            `Creating ${DEFAULT_ADMIN_ROLE_NAME} role in guild: ${guild.name} (${guild.id})`
          )
          const newRole = await guild.roles.create({
            name: DEFAULT_ADMIN_ROLE_NAME,
            color: 0x33b42f, // Toji brand green
            reason: 'Auto-created by Toji Bot for permission management',
            permissions: [] // No Discord permissions - only for bot access control
          })
          logger.debug(
            `✅ Created ${DEFAULT_ADMIN_ROLE_NAME} role in ${guild.name} (role ID: ${newRole.id})`
          )
        } else {
          logger.debug(
            `${DEFAULT_ADMIN_ROLE_NAME} role already exists in ${guild.name} (role ID: ${existingRole.id})`
          )
        }
      } catch (error) {
        logger.debug(
          `Warning: Could not create ${DEFAULT_ADMIN_ROLE_NAME} role in ${guild.name}: %o`,
          error
        )
        logger.debug('Make sure the bot has "Manage Roles" permission')
      }
    }
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
    logger.debug('ERROR: Error received: %o', error)
    this.emit('error', error)
  }

  /**
   * Cleanup plugin resources
   */
  async cleanup(): Promise<void> {
    logger.debug('Cleaning up...')

    // Cleanup all modules
    for (const [name, module] of this.modules.entries()) {
      logger.debug(`Cleaning up module: ${name}`)
      module.cleanup()
    }

    this.modules.clear()
    this.removeAllListeners()
    this.initialized = false
  }
}
