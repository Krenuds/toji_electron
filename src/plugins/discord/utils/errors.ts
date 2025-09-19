/**
 * Error handling utilities for Discord commands
 * Provides consistent error formatting
 */

/**
 * Get a safe error message from an unknown error value
 */
function getErrorMessage(error: unknown): string {
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
