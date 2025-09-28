/**
 * Discord Slash Command Deployment Script
 * Registers slash commands with Discord API
 */

import { REST, Routes } from 'discord.js'
import type { RESTPostAPIApplicationCommandsJSONBody } from 'discord.js'

// Command deployment function
export async function deployCommands(
  token: string,
  clientId: string,
  guildId?: string
): Promise<void> {
  const commands: RESTPostAPIApplicationCommandsJSONBody[] = []

  // Import all commands directly
  const helpCommand = await import('./commands/help')
  const chatCommand = await import('./commands/chat')
  const statusCommand = await import('./commands/status')
  const clearCommand = await import('./commands/clear')
  const projectCommand = await import('./commands/project')
  const initCommand = await import('./commands/init')
  const refreshCommand = await import('./commands/refresh')

  const commandModules = [
    helpCommand,
    chatCommand,
    statusCommand,
    clearCommand,
    projectCommand,
    initCommand,
    refreshCommand
  ]

  // Load command data
  for (const command of commandModules) {
    if ('data' in command && 'execute' in command) {
      commands.push(command.data.toJSON())
      console.log(`Loaded command: ${command.data.name}`)
    }
  }

  // Construct and prepare an instance of the REST module
  const rest = new REST().setToken(token)

  try {
    console.log(`Started refreshing ${commands.length} application (/) commands.`)

    // Deploy commands
    if (guildId) {
      // Guild-specific commands (instant update, good for testing)
      await rest.put(Routes.applicationGuildCommands(clientId, guildId), { body: commands })
      console.log(`Successfully deployed ${commands.length} guild commands to ${guildId}`)
    } else {
      // Global commands (takes up to 1 hour to update)
      await rest.put(Routes.applicationCommands(clientId), { body: commands })
      console.log(`Successfully deployed ${commands.length} global commands`)
    }
  } catch (error) {
    console.error('Error deploying commands:', error)
    throw error
  }
}
