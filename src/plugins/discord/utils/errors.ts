/**
 * Error handling utilities for Discord commands
 * Provides consistent error formatting and helpful user messages
 */

import { EmbedBuilder } from 'discord.js'
import { DISCORD_COLORS } from '../constants'
import { createFileDebugLogger } from '../../../main/utils/logger'

const log = createFileDebugLogger('discord:utils:errors')

/**
 * Get a safe error message from an unknown error value
 */
export function getErrorMessage(error: unknown): string {
  if (error instanceof Error) {
    return error.message
  }
  if (typeof error === 'string') {
    return error
  }
  if (error && typeof error === 'object' && 'message' in error) {
    return String(error.message)
  }
  return 'An unknown error occurred'
}

/**
 * Format error for code block display
 */
export function formatErrorAsCodeBlock(error: unknown, maxLength = 1900): string {
  const message = getErrorMessage(error)
  const codeBlock = `\`\`\`${message}\`\`\``

  if (codeBlock.length > maxLength) {
    return `\`\`\`${message.slice(0, maxLength - 6)}...\`\`\``
  }

  return codeBlock
}

/**
 * Get helpful suggestions based on the error type
 */
export function getErrorSuggestions(error: unknown): string[] {
  const message = getErrorMessage(error)
  const suggestions: string[] = []

  if (message.includes('No response data') || message.includes('ECONNREFUSED')) {
    suggestions.push('Select a project with `/project switch`')
    suggestions.push('Check if a project is active with `/project current`')
    suggestions.push('Use `/status` to diagnose connection issues')
    suggestions.push('Restart the Toji application if needed')
  } else if (message.includes('not ready')) {
    suggestions.push('Wait a moment for Toji to initialize')
    suggestions.push('Use `/status` to check system health')
    suggestions.push('Select a project with `/project switch`')
  } else if (message.includes('session')) {
    suggestions.push('Use `/clear` to reset the conversation')
    suggestions.push('Try switching projects with `/project switch`')
  } else if (message.includes('project')) {
    suggestions.push('Select a project with `/project switch`')
    suggestions.push('Type in a project channel in the Toji Desktop category')
    suggestions.push('Use `/project list` to see available projects')
  } else {
    suggestions.push('Use `/status` to check system health')
    suggestions.push('Use `/clear` to reset the conversation')
    suggestions.push('Check `/help` for command usage')
  }

  return suggestions
}

/**
 * Create a standard error embed for Discord
 */
export function createErrorEmbed(
  error: unknown,
  context: string,
  additionalInfo?: { [key: string]: string }
): EmbedBuilder {
  const errorMessage = getErrorMessage(error)
  const suggestions = getErrorSuggestions(error)

  log('ERROR in %s: %s', context, errorMessage)

  const embed = new EmbedBuilder()
    .setColor(DISCORD_COLORS.ERROR)
    .setTitle(`❌ ${context} Failed`)
    .setDescription(errorMessage.substring(0, 200) + (errorMessage.length > 200 ? '...' : ''))
    .setTimestamp()

  if (suggestions.length > 0) {
    embed.addFields({
      name: '💡 Suggestions',
      value: suggestions.map((s) => `• ${s}`).join('\n'),
      inline: false
    })
  }

  if (additionalInfo) {
    for (const [key, value] of Object.entries(additionalInfo)) {
      embed.addFields({
        name: key,
        value: value.substring(0, 1024),
        inline: true
      })
    }
  }

  return embed
}
