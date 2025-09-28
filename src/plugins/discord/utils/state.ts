import * as fs from 'fs/promises'
import * as path from 'path'
import { app } from 'electron'
import { createFileDebugLogger } from '../../../main/utils/logger'

const log = createFileDebugLogger('discord:state')

export interface DiscordBotState {
  activeProjectChannelId?: string
  projects: {
    [channelId: string]: {
      name: string
      path: string
      serverPort?: number
    }
  }
}

const STATE_FILE = path.join(app.getPath('userData'), 'discord-bot-state.json')

/**
 * Load Discord bot state from disk
 */
export async function loadState(): Promise<DiscordBotState> {
  try {
    const data = await fs.readFile(STATE_FILE, 'utf-8')
    log('Loaded state from %s', STATE_FILE)
    return JSON.parse(data)
  } catch (error) {
    log('No existing state found, starting fresh')
    return {
      projects: {}
    }
  }
}

/**
 * Save Discord bot state to disk
 */
export async function saveState(state: DiscordBotState): Promise<void> {
  try {
    await fs.writeFile(STATE_FILE, JSON.stringify(state, null, 2))
    log('Saved state to %s', STATE_FILE)
  } catch (error) {
    log('ERROR: Failed to save state: %o', error)
  }
}

/**
 * Clear Discord bot state
 */
export async function clearState(): Promise<void> {
  try {
    await fs.unlink(STATE_FILE)
    log('Cleared state file')
  } catch (error) {
    log('ERROR: Failed to clear state: %o', error)
  }
}
