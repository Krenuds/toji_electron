/**
 * Discord Slash Command Deployment Script
 * Registers slash commands with Discord API
 */

import { REST, Routes } from 'discord.js'
import type { RESTPostAPIApplicationCommandsJSONBody } from 'discord.js'
import { createLogger } from '../../main/utils/logger'

const logger = createLogger('discord:deploy-commands')

// Command deployment function
export async function deployCommands(
  token: string,
  clientId: string,
  guildId?: string
): Promise<void> {
  // Import all commands directly
  const helpCommand = await import('./commands/help')
  const initCommand = await import('./commands/init')
  const projectCommand = await import('./commands/project')
  const clearCommand = await import('./commands/clear')
  const adminCommand = await import('./commands/admin')
  const voiceCommand = await import('./commands/voice')

  const commandModules = [
    helpCommand,
    initCommand,
    projectCommand,
    clearCommand,
    adminCommand,
    voiceCommand
  ]

  const commands: RESTPostAPIApplicationCommandsJSONBody[] = []

  // Load command data
  for (const command of commandModules) {
    if ('data' in command && 'execute' in command) {
      commands.push(command.data.toJSON())
      logger.debug('Loaded command: %s', command.data.name)
    }
  }

  // Construct and prepare an instance of the REST module
  const rest = new REST().setToken(token)

  try {
    logger.debug('Started refreshing %d application (/) commands', commands.length)

    // Deploy commands
    if (guildId) {
      // Guild-specific commands (instant update, good for testing)
      await rest.put(Routes.applicationGuildCommands(clientId, guildId), { body: commands })
      logger.debug('Successfully deployed %d guild commands to %s', commands.length, guildId)
    } else {
      // Global commands (takes up to 1 hour to update)
      await rest.put(Routes.applicationCommands(clientId), { body: commands })
      logger.debug('Successfully deployed %d global commands', commands.length)
    }
  } catch (error) {
    logger.debug('ERROR: Failed to deploy commands: %o', error)
    throw error
  }
}
