import { Message } from 'discord.js'
import { createFileDebugLogger } from '../../../main/utils/logger'

const log = createFileDebugLogger('discord:utils:messages')

/**
 * Discord message utilities
 */

const DISCORD_MAX_MESSAGE_LENGTH = 2000

/**
 * Split a long message into chunks for Discord's character limit
 */
export function splitMessage(
  text: string,
  maxLength: number = DISCORD_MAX_MESSAGE_LENGTH
): string[] {
  const chunks: string[] = []
  let currentChunk = ''

  const lines = text.split('\n')
  for (const line of lines) {
    if (currentChunk.length + line.length + 1 > maxLength) {
      if (currentChunk) {
        chunks.push(currentChunk)
        currentChunk = ''
      }

      // If a single line is too long, split it by words
      if (line.length > maxLength) {
        const words = line.split(' ')
        for (const word of words) {
          if (currentChunk.length + word.length + 1 > maxLength) {
            chunks.push(currentChunk)
            currentChunk = word
          } else {
            currentChunk += (currentChunk ? ' ' : '') + word
          }
        }
      } else {
        currentChunk = line
      }
    } else {
      currentChunk += (currentChunk ? '\n' : '') + line
    }
  }

  if (currentChunk) {
    chunks.push(currentChunk)
  }

  return chunks
}

/**
 * Send a response to Discord, handling message splitting and errors
 * Returns the first sent message for editing during streaming
 */
export async function sendDiscordResponse(
  message: Message,
  response: string
): Promise<Message | undefined> {
  try {
    // Check if we have a valid response
    if (!response || response.trim().length === 0) {
      log('WARNING: Empty response received, sending default message')
      await message.reply('I received your message but got an empty response. Please try again.')
      return undefined
    }

    // Split and send if necessary
    if (response.length > DISCORD_MAX_MESSAGE_LENGTH) {
      log('Response is long (%d chars), splitting into chunks', response.length)
      const chunks = splitMessage(response)
      let firstMessage: Message | undefined
      for (const chunk of chunks) {
        const sent = await message.reply(chunk)
        if (!firstMessage) firstMessage = sent
      }
      return firstMessage
    } else {
      log('Sending response (%d chars)', response.length)
      return await message.reply(response)
    }
  } catch (error) {
    log('ERROR: Failed to send Discord response: %o', error)
    try {
      await message.reply(
        '❌ Failed to send response: ' + (error instanceof Error ? error.message : 'Unknown error')
      )
    } catch (fallbackError) {
      log('ERROR: Failed to send error message: %o', fallbackError)
    }
    return undefined
  }
}

/**
 * Format an error message for Discord display
 */
export function formatErrorMessage(error: unknown, context: string): string {
  const errorMessage = error instanceof Error ? error.message : 'Unknown error'

  let helpfulMessage = `❌ **${context} Failed**\n\n`

  if (errorMessage.includes('No response data') || errorMessage.includes('ECONNREFUSED')) {
    helpfulMessage +=
      '**Issue:** OpenCode server not responding\n' +
      '**Try:** Restarting Toji or checking your connection'
  } else if (errorMessage.includes('not ready')) {
    helpfulMessage +=
      '**Issue:** Toji is not ready yet\n' + '**Try:** Wait a moment or restart the application'
  } else if (errorMessage.includes('session')) {
    helpfulMessage +=
      '**Issue:** Session problem detected\n' +
      "**Try:** Use `/clear` to reset this channel's conversation"
  } else if (errorMessage.includes('project')) {
    helpfulMessage +=
      '**Issue:** No active project\n' +
      '**Try:** Select a project with `/project switch` or type in a project channel'
  } else {
    helpfulMessage +=
      `**Error:** ${errorMessage.substring(0, 100)}${errorMessage.length > 100 ? '...' : ''}\n` +
      '**Try:** Use `/clear` command or restart'
  }

  return helpfulMessage
}
