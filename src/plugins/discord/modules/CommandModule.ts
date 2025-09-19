import type { Message } from 'discord.js'
import type { Toji } from '../../../main/api/Toji'
import type { DiscordPlugin, DiscordModule } from '../DiscordPlugin'
import type { DiscordChatModule } from './ChatModule'

interface Command {
  name: string
  description: string
  usage: string
  execute: (message: Message, args: string[]) => Promise<void>
}

/**
 * Discord Command Module - Handles slash commands and bot commands
 */
export class DiscordCommandModule implements DiscordModule {
  private plugin?: DiscordPlugin
  private commands: Map<string, Command> = new Map()

  constructor(private toji: Toji) {
    this.registerCommands()
  }

  /**
   * Initialize the module with the parent plugin
   */
  initialize(plugin: DiscordPlugin): void {
    this.plugin = plugin
    console.log('DiscordCommandModule: Initialized')
  }

  /**
   * Register all available commands
   */
  private registerCommands(): void {
    // Help command
    this.commands.set('help', {
      name: 'help',
      description: 'Show available commands',
      usage: '!help',
      execute: async (message) => {
        const helpText = this.generateHelpText()
        await message.reply(helpText)
      }
    })

    // Workspace command
    this.commands.set('workspace', {
      name: 'workspace',
      description: 'Show or change the current workspace',
      usage: '!workspace [path]',
      execute: async (message, args) => {
        if (args.length === 0) {
          // Show current workspace
          const workspace = this.toji.workspace.getCurrentDirectory()
          await message.reply(`Current workspace: \`${workspace || 'None'}\``)
        } else {
          // Change workspace
          const path = args.join(' ')
          try {
            await message.reply(`Changing workspace to: \`${path}\`...`)
            const result = await this.toji.changeWorkspace(path)
            await message.reply(
              `✅ Workspace changed to: \`${path}\`\n` +
                `• New workspace: ${result.isNew ? 'Yes' : 'No'}\n` +
                `• Has Git: ${result.hasGit ? 'Yes' : 'No'}\n` +
                `• Session ID: ${result.sessionId}`
            )
          } catch (error) {
            await message.reply(
              `❌ Failed to change workspace: ${error instanceof Error ? error.message : 'Unknown error'}`
            )
          }
        }
      }
    })

    // Session commands
    this.commands.set('session', {
      name: 'session',
      description: 'Manage chat sessions',
      usage: '/session [list|new|clear|info]',
      execute: async (message, args) => {
        const subcommand = args[0] || 'info'

        switch (subcommand) {
          case 'list': {
            const sessionsResponse = await this.toji.session.list()
            const sessions = sessionsResponse.data
            if (sessions.length === 0) {
              await message.reply('No active sessions')
            } else {
              const sessionList = sessions.map((s, i) => `${i + 1}. Session ${s.id}`).join('\n')
              await message.reply(`**Active Sessions:**\n\`\`\`\n${sessionList}\n\`\`\``)
            }
            break
          }

          case 'new': {
            const name = args.slice(1).join(' ') || `Discord Session ${Date.now()}`
            const session = await this.toji.session.create(name)
            await message.reply(`✅ Created new session: **${name}** (ID: ${session.id})`)
            break
          }

          case 'clear': {
            // Get the chat module to clear session for this channel
            const chatModule = await this.getChatModule()
            if (chatModule) {
              await chatModule.clearSession(message.channelId)
              await message.reply('✅ Cleared session for this channel')
            }
            break
          }

          case 'info': {
            // Get session info for this channel
            const chatModule = await this.getChatModule()
            if (chatModule) {
              const session = chatModule.getSessionInfo(message.channelId)
              if (session) {
                await message.reply(
                  `**Session Info:**\n` +
                    `• Session ID: ${session.sessionId}\n` +
                    `• Channel: <#${session.channelId}>\n` +
                    `• Last Activity: ${session.lastActivity.toLocaleTimeString()}\n` +
                    `• Context Size: ${session.context.length} messages`
                )
              } else {
                await message.reply('No active session in this channel')
              }
            }
            break
          }

          default:
            await message.reply(`Unknown subcommand: ${subcommand}. Use: list, new, clear, or info`)
        }
      }
    })

    // Project commands
    this.commands.set('project', {
      name: 'project',
      description: 'Manage projects',
      usage: '/project [list|current]',
      execute: async (message, args) => {
        const subcommand = args[0] || 'current'

        switch (subcommand) {
          case 'list': {
            const projectsResponse = await this.toji.project.list()
            const projects = projectsResponse.data
            if (projects.length === 0) {
              await message.reply('No projects found')
            } else {
              const projectList = projects
                .map((p, i) => `${i + 1}. ${p.id} - ${p.worktree}`)
                .join('\n')
              await message.reply(`**Available Projects:**\n\`\`\`\n${projectList}\n\`\`\``)
            }
            break
          }

          case 'current': {
            const project = await this.toji.project.getCurrent()
            if (project) {
              await message.reply(
                `**Current Project:**\n` +
                  `• ID: ${project.id}\n` +
                  `• Worktree: \`${project.worktree}\``
              )
            } else {
              await message.reply('No project currently active')
            }
            break
          }

          default:
            await message.reply(`Unknown subcommand: ${subcommand}. Use: list or current`)
        }
      }
    })

    // Status command
    this.commands.set('status', {
      name: 'status',
      description: 'Show Toji system status',
      usage: '/status',
      execute: async (message) => {
        const status = this.toji.getStatus()
        await message.reply(
          `**Toji System Status:**\n` +
            `• Server: ${status.server.running ? 'Running' : 'Stopped'}\n` +
            `• Client: ${status.client.connected ? 'Connected' : 'Disconnected'}\n` +
            `• Workspace: \`${status.workspace.current || 'None'}\`\n` +
            `• Ready: ${this.toji.isReady() ? '✅' : '❌'}`
        )
      }
    })

    console.log(`DiscordCommandModule: Registered ${this.commands.size} commands`)
  }

  /**
   * Handle incoming command messages
   */
  async handleCommand(message: Message): Promise<void> {
    // Parse command and arguments
    const args = message.content.slice(1).trim().split(/\s+/)
    const commandName = args.shift()?.toLowerCase()

    if (!commandName) {
      return
    }

    // Find and execute command
    const command = this.commands.get(commandName)
    if (command) {
      try {
        console.log(`DiscordCommandModule: Executing command: ${commandName}`)
        await command.execute(message, args)
      } catch (error) {
        console.error(`DiscordCommandModule: Error executing command ${commandName}:`, error)
        await message.reply(
          `❌ Error executing command: ${error instanceof Error ? error.message : 'Unknown error'}`
        )
      }
    } else {
      // Unknown command
      await message.reply(
        `Unknown command: \`/${commandName}\`. Use \`/help\` to see available commands.`
      )
    }
  }

  /**
   * Generate help text for all commands
   */
  private generateHelpText(): string {
    let help = '**Available Commands:**\n```\n'

    for (const command of this.commands.values()) {
      help += `${command.usage}\n  ${command.description}\n\n`
    }

    help += '```\n'
    help += '**Tips:**\n'
    help += '• Mention me to chat normally\n'
    help += '• Each channel has its own session\n'
    help += '• Use `/session clear` to reset conversation'

    return help
  }

  /**
   * Get the chat module instance
   */
  private async getChatModule(): Promise<DiscordChatModule | undefined> {
    // Import the module type dynamically to avoid circular dependency
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const modules = (this.plugin as any)?.modules as Map<string, DiscordModule>
    return modules?.get('chat') as DiscordChatModule | undefined
  }

  /**
   * Cleanup module resources
   */
  cleanup(): void {
    console.log('DiscordCommandModule: Cleaning up')
    this.commands.clear()
  }
}
