import { Message, EmbedBuilder } from 'discord.js'
import { DISCORD_COLORS } from '../constants'
import { createLogger } from '../../../main/utils/logger'
import type { ToolEvent } from '../../../main/toji/types'

const logger = createLogger('discord:utils:messages')

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

  // Calculate totals
  const totalCompleted = tools.completed.length
  const totalErrors = tools.errors.length
  const totalRunning = tools.running.size
  const totalTools = totalCompleted + totalErrors + totalRunning

  // Add summary header if any tools have been used
  if (totalTools > 0) {
    lines.push(`**Total: ${totalTools}**`)
    lines.push('') // Empty line for spacing
  }

  // Show currently running tools (all of them)
  if (tools.running.size > 0) {
    const running = Array.from(tools.running.values())
      .map((t) => `🔄 **${formatToolName(t.name)}**${t.title ? `\n   └─ ${t.title}` : ''}`)
      .join('\n')
    lines.push(running)
  }

  // Show last 5 completed tools with more detail
  if (tools.completed.length > 0) {
    const recentCompleted = tools.completed.slice(-5)
    const completed = recentCompleted.map((name) => `✅ ${formatToolName(name)}`).join('\n')
    lines.push(completed)

    // Show "and X more" if there are more than 5
    if (tools.completed.length > 5) {
      lines.push(`   _...and ${tools.completed.length - 5} more_`)
    }
  }

  // Show last 3 errors
  if (tools.errors.length > 0) {
    const recentErrors = tools.errors.slice(-3)
    const errors = recentErrors.map((name) => `❌ **${formatToolName(name)}**`).join('\n')
    lines.push(errors)

    // Show "and X more" if there are more than 3
    if (tools.errors.length > 3) {
      lines.push(`   _...and ${tools.errors.length - 3} more errors_`)
    }
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
        logger.debug('Tool pending: %s (callID: %s)', tool, callID)
      }
      break

    case 'running':
      // Move from pending to running
      tools.pending = tools.pending.filter((id) => id !== callID)
      tools.running.set(callID, {
        name: tool,
        title: state.title
      })
      logger.debug('Tool running: %s (callID: %s)', tool, callID)
      break

    case 'completed':
      // Move from running to completed
      tools.running.delete(callID)
      if (!tools.completed.includes(tool)) {
        tools.completed.push(tool)
      }
      logger.debug('Tool completed: %s (callID: %s)', tool, callID)
      break

    case 'error':
      // Move from running to errors
      tools.running.delete(callID)
      if (!tools.errors.includes(tool)) {
        tools.errors.push(tool)
      }
      logger.debug('Tool error: %s (callID: %s) - %s', tool, callID, state.error)
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
      logger.debug('WARNING: Empty response received, sending default message')
      await message.reply('I received your message but got an empty response. Please try again.')
      return undefined
    }

    // Split and send if necessary
    if (response.length > DISCORD_MAX_MESSAGE_LENGTH) {
      logger.debug('Response is long (%d chars), splitting into chunks', response.length)
      const chunks = splitMessage(response)
      let firstMessage: Message | undefined
      for (const chunk of chunks) {
        const sent = await message.reply(chunk)
        if (!firstMessage) firstMessage = sent
      }
      return firstMessage
    } else {
      logger.debug('Sending response (%d chars)', response.length)
      return await message.reply(response)
    }
  } catch (error) {
    logger.debug('ERROR: Failed to send Discord response: %o', error)
    try {
      await message.reply(
        '❌ Failed to send response: ' + (error instanceof Error ? error.message : 'Unknown error')
      )
    } catch (fallbackError) {
      logger.debug('ERROR: Failed to send error message: %o', fallbackError)
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
 * Create a visual activity indicator for Discord embeds
 * Shows activity level rather than fake progress
 */
export function createActivityIndicator(updateCount: number): string {
  // Show 1-10 chevrons based on activity, cycling
  const chevronCount = Math.min(10, (updateCount % 10) + 1)
  // Use ANSI color codes for green chevrons in Discord
  const chevrons = '⟩'.repeat(chevronCount)
  // ANSI code: \u001b[32m = green, \u001b[1m = bold, \u001b[0m = reset
  return `\`\`\`ansi\n\u001b[1;32m${chevrons}\u001b[0m\n\`\`\``
}

/**
 * Create a progress embed for streaming responses
 */
export function createProgressEmbed(updateCount: number = 0, tools?: ToolActivity): EmbedBuilder {
  const activity = createActivityIndicator(updateCount)

  const embed = new EmbedBuilder()
    .setColor(DISCORD_COLORS.SUCCESS)
    .setDescription('🔄 Streaming response...')
    .setTimestamp()

  embed.addFields({ name: `Tasks: ${updateCount}`, value: activity, inline: false })

  // Always add Tools field to maintain consistent embed size
  const toolsValue =
    tools && (tools.running.size > 0 || tools.completed.length > 0 || tools.errors.length > 0)
      ? createToolStatusString(tools)
      : '_Waiting for tools..._'
  embed.addFields({ name: '🔧 Tools', value: toolsValue, inline: false })

  return embed
}

/**
 * Update a progress embed with new information
 */
export function updateProgressEmbed(updateCount: number, tools?: ToolActivity): EmbedBuilder {
  const activity = createActivityIndicator(updateCount)

  const embed = new EmbedBuilder()
    .setColor(DISCORD_COLORS.SUCCESS)
    .setDescription('✍️ Writing response...')
    .addFields({ name: `Tasks: ${updateCount}`, value: activity, inline: false })
    .setTimestamp()

  // Always add Tools field to maintain consistent embed size
  const toolsValue =
    tools && (tools.running.size > 0 || tools.completed.length > 0 || tools.errors.length > 0)
      ? createToolStatusString(tools)
      : '_No tools running yet..._'
  embed.addFields({ name: '🔧 Tools', value: toolsValue, inline: false })

  return embed
}
