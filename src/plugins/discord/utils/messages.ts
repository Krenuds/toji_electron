import { Message, EmbedBuilder } from 'discord.js'
import { DISCORD_COLORS } from '../constants'
import { createFileDebugLogger } from '../../../main/utils/logger'
import type { ToolEvent } from '../../../main/toji/types'

const log = createFileDebugLogger('discord:utils:messages')

/**
 * Tool activity tracking for embeds
 */
export interface ToolActivity {
  pending: string[]
  running: Map<string, { name: string; title?: string }>
  completed: string[]
  errors: string[]
}

/**
 * Format tool status for display
 */
function formatToolName(toolName: string): string {
  // Convert snake_case or camelCase to Title Case
  return toolName
    .replace(/_/g, ' ')
    .replace(/([A-Z])/g, ' $1')
    .trim()
    .split(' ')
    .map((word) => word.charAt(0).toUpperCase() + word.slice(1).toLowerCase())
    .join(' ')
}

/**
 * Create a tool status string for embeds
 */
function createToolStatusString(tools: ToolActivity): string {
  const lines: string[] = []

  if (tools.running.size > 0) {
    const running = Array.from(tools.running.values())
      .map((t) => `🔄 ${formatToolName(t.name)}${t.title ? `: ${t.title}` : ''}`)
      .join('\n')
    lines.push(running)
  }

  if (tools.completed.length > 0) {
    const completed = tools.completed
      .slice(-3) // Show last 3 completed
      .map((name) => `✅ ${formatToolName(name)}`)
      .join('\n')
    lines.push(completed)
  }

  if (tools.errors.length > 0) {
    const errors = tools.errors
      .slice(-2) // Show last 2 errors
      .map((name) => `❌ ${formatToolName(name)}`)
      .join('\n')
    lines.push(errors)
  }

  return lines.join('\n') || '_No tools used yet_'
}

/**
 * Create an empty tool activity tracker
 */
export function createToolActivity(): ToolActivity {
  return {
    pending: [],
    running: new Map(),
    completed: [],
    errors: []
  }
}

/**
 * Update tool activity based on a tool event
 */
export function updateToolActivity(tools: ToolActivity, event: ToolEvent): void {
  const { callID, tool, state } = event

  switch (state.status) {
    case 'pending':
      if (!tools.pending.includes(callID)) {
        tools.pending.push(callID)
        log('Tool pending: %s (callID: %s)', tool, callID)
      }
      break

    case 'running':
      // Move from pending to running
      tools.pending = tools.pending.filter((id) => id !== callID)
      tools.running.set(callID, {
        name: tool,
        title: state.title
      })
      log('Tool running: %s (callID: %s)', tool, callID)
      break

    case 'completed':
      // Move from running to completed
      tools.running.delete(callID)
      if (!tools.completed.includes(tool)) {
        tools.completed.push(tool)
      }
      log('Tool completed: %s (callID: %s)', tool, callID)
      break

    case 'error':
      // Move from running to errors
      tools.running.delete(callID)
      if (!tools.errors.includes(tool)) {
        tools.errors.push(tool)
      }
      log('Tool error: %s (callID: %s) - %s', tool, callID, state.error)
      break
  }
}

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
  estimatedTotal: number = 2000,
  tools?: ToolActivity
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

  if (tools && (tools.running.size > 0 || tools.completed.length > 0 || tools.errors.length > 0)) {
    embed.addFields({ name: '🔧 Tools', value: createToolStatusString(tools), inline: false })
  }

  return embed
}

/**
 * Update a progress embed with new information
 */
export function updateProgressEmbed(
  charCount: number,
  estimatedTotal: number = 2000,
  tools?: ToolActivity
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

  if (tools && (tools.running.size > 0 || tools.completed.length > 0 || tools.errors.length > 0)) {
    embed.addFields({ name: '🔧 Tools', value: createToolStatusString(tools), inline: false })
  }

  return embed
}
