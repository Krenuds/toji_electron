/**
 * Discord Slash Command Deployment Script
 * Registers slash commands with Discord API
 */

import { REST, Routes } from 'discord.js'
import type { RESTPostAPIApplicationCommandsJSONBody } from 'discord.js'
import * as fs from 'fs'
import * as path from 'path'

// Command deployment function
export async function deployCommands(
  token: string,
  clientId: string,
  guildId?: string
): Promise<void> {
  const commands: RESTPostAPIApplicationCommandsJSONBody[] = []
  const commandsPath = path.join(__dirname, 'commands')

  // Read all command files
  const commandFiles = fs
    .readdirSync(commandsPath)
    .filter((file) => file.endsWith('.ts') || file.endsWith('.js'))

  // Load command data
  for (const file of commandFiles) {
    const filePath = path.join(commandsPath, file)

    // Use dynamic import for command modules
    const commandModule = await import(filePath)
    const command = commandModule

    if ('data' in command && 'execute' in command) {
      commands.push(command.data.toJSON())
      console.log(`Loaded command: ${command.data.name}`)
    } else {
      console.warn(
        `Warning: Command at ${filePath} is missing required "data" or "execute" property`
      )
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

// Standalone deployment script
if (process.argv[1] === __filename) {
  const token = process.env.DISCORD_TOKEN
  const clientId = process.env.DISCORD_CLIENT_ID || '1399539733880897537'
  const guildId = process.env.DISCORD_GUILD_ID // Optional, for guild-specific deployment

  if (!token) {
    console.error('DISCORD_TOKEN environment variable is required')
    process.exit(1)
  }

  deployCommands(token, clientId, guildId)
    .then(() => {
      console.log('Command deployment complete!')
      process.exit(0)
    })
    .catch((error) => {
      console.error('Deployment failed:', error)
      process.exit(1)
    })
}
