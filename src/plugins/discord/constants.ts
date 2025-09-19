// Discord Embed Color Constants
// Centralized color definitions for consistent UI across all Discord commands

/**
 * Color palette for Discord embeds
 * Uses hex color codes as required by Discord.js
 */
export const DISCORD_COLORS = {
  // Status colors
  SUCCESS: 0x33b42f, // Toji green - success/active states
  ERROR: 0xff0000, // Red - errors and failures
  WARNING: 0xffa500, // Orange - warnings and issues
  INFO: 0x3b82f6, // Blue - informational messages

  // State colors
  ACTIVE: 0x33b42f, // Green - active/running states
  INACTIVE: 0x808080, // Gray - inactive/stopped states
  PENDING: 0xffa500, // Orange - pending/processing states

  // Special colors
  TOJI_BRAND: 0x33b42f, // Official Toji brand color
  NEUTRAL: 0x808080 // Gray - neutral information
} as const

/**
 * Get appropriate color based on boolean condition
 */
export function getStatusColor(isSuccess: boolean): number {
  return isSuccess ? DISCORD_COLORS.SUCCESS : DISCORD_COLORS.ERROR
}

/**
 * Get color based on error severity
 */
export function getErrorColor(hasErrors: boolean, hasWarnings: boolean): number {
  if (hasErrors) return DISCORD_COLORS.ERROR
  if (hasWarnings) return DISCORD_COLORS.WARNING
  return DISCORD_COLORS.SUCCESS
}
