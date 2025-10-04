import { Message, EmbedBuilder } from 'discord.js'
import { DISCORD_COLORS } from '../constants'
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

/**
 * Create a visual progress bar for Discord embeds
 */
export function createProgressBar(percent: number): string {
  const clampedPercent = Math.max(0, Math.min(100, percent))
  const filled = Math.floor(clampedPercent / 10)
  const empty = 10 - filled
  return '▓'.repeat(filled) + '░'.repeat(empty) + ` ${clampedPercent}%`
}

/**
 * Create a progress embed for streaming responses
 */
export function createProgressEmbed(
  charCount: number,
  estimatedTotal: number = 2000
): EmbedBuilder {
  // Calculate progress (max 90% until complete)
  const progress = Math.min(90, Math.floor((charCount / estimatedTotal) * 100))
  const progressBar = createProgressBar(progress)

  const embed = new EmbedBuilder()
    .setColor(DISCORD_COLORS.PENDING)
    .setTitle('🤖 Toji is thinking...')
    .setDescription('Generating response...')
    .addFields({ name: '📊 Progress', value: progressBar, inline: false })
    .setTimestamp()

  if (charCount > 0) {
    embed.addFields({ name: '📝 Characters', value: `${charCount}`, inline: true })
  }

  return embed
}

/**
 * Update a progress embed with new information
 */
export function updateProgressEmbed(
  charCount: number,
  estimatedTotal: number = 2000
): EmbedBuilder {
  const progress = Math.min(90, Math.floor((charCount / estimatedTotal) * 100))
  const progressBar = createProgressBar(progress)

  const embed = new EmbedBuilder()
    .setColor(DISCORD_COLORS.PENDING)
    .setTitle('🤖 Toji is working...')
    .setDescription('Writing response...')
    .addFields(
      { name: '📊 Progress', value: progressBar, inline: false },
      { name: '📝 Characters', value: `${charCount}`, inline: true }
    )
    .setTimestamp()

  return embed
}
