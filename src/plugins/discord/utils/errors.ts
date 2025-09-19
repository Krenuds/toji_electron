/**
 * Error handling utilities for Discord commands
 * Provides consistent error formatting and type guards
 */

/**
 * Type guard to check if value is an Error
 */
export function isError(value: unknown): value is Error {
  return value instanceof Error
}

/**
 * Get a safe error message from an unknown error value
 */
export function getErrorMessage(error: unknown): string {
  if (isError(error)) {
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
 * Format error for Discord reply
 * Truncates to Discord's message limit if needed
 */
export function formatErrorForDiscord(error: unknown, prefix = 'Error'): string {
  const message = getErrorMessage(error)
  const formatted = `❌ ${prefix}: ${message}`

  // Discord has a 2000 character limit for messages
  if (formatted.length > 1900) {
    return formatted.slice(0, 1897) + '...'
  }

  return formatted
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
 * Check if error contains warning indicators
 */
export function isWarning(error: unknown): boolean {
  const message = getErrorMessage(error).toLowerCase()
  return message.includes('warning') && !message.includes('error')
}

/**
 * Check if error is a known non-critical error
 */
export function isNonCritical(error: unknown): boolean {
  const message = getErrorMessage(error).toLowerCase()
  const nonCriticalPatterns = ['warning', 'deprecated', 'info', 'notice']

  return nonCriticalPatterns.some((pattern) => message.includes(pattern))
}
