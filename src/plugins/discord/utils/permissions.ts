import type { ChatInputCommandInteraction, GuildMember } from 'discord.js'
import { createFileDebugLogger } from '../../../main/utils/logger'

const log = createFileDebugLogger('discord:permissions')

/**
 * Configuration for permission checking
 */
export interface PermissionConfig {
  /** Name of the role that grants admin access (default: "Toji Admin") */
  adminRoleName?: string
}

const DEFAULT_ADMIN_ROLE_NAME = 'Toji Admin'

/**
 * Check if a user has permission to use bot commands
 *
 * Users have permission if they are:
 * 1. The server owner
 * 2. Have the configured admin role (default: "Toji Admin")
 *
 * @param interaction - The command interaction
 * @param config - Optional permission configuration
 * @returns true if user has permission, false otherwise
 */
export function hasPermission(
  interaction: ChatInputCommandInteraction,
  config?: PermissionConfig
): boolean {
  const { guild, user, member } = interaction

  // Require guild context
  if (!guild || !member) {
    log('Permission denied: No guild context')
    return false
  }

  // Server owner always has permission
  if (user.id === guild.ownerId) {
    log(`Permission granted: ${user.tag} is server owner`)
    return true
  }

  // Check for admin role
  const adminRoleName = config?.adminRoleName ?? DEFAULT_ADMIN_ROLE_NAME
  const guildMember = member as GuildMember
  const hasAdminRole = guildMember.roles.cache.some((role) => role.name === adminRoleName)

  if (hasAdminRole) {
    log(`Permission granted: ${user.tag} has role "${adminRoleName}"`)
    return true
  }

  log(`Permission denied: ${user.tag} lacks required role "${adminRoleName}"`)
  return false
}

/**
 * Get a user-friendly description of permission requirements
 *
 * @param config - Optional permission configuration
 * @returns Description of who can use commands
 */
export function getPermissionDescription(config?: PermissionConfig): string {
  const adminRoleName = config?.adminRoleName ?? DEFAULT_ADMIN_ROLE_NAME
  return `Server Owner or members with the **${adminRoleName}** role`
}

/**
 * Check if the admin role exists in the guild
 *
 * @param guild - The guild to check
 * @param config - Optional permission configuration
 * @returns true if the admin role exists
 */
export function adminRoleExists(
  guild: { roles: { cache: Map<string, { name: string }> } },
  config?: PermissionConfig
): boolean {
  const adminRoleName = config?.adminRoleName ?? DEFAULT_ADMIN_ROLE_NAME
  return Array.from(guild.roles.cache.values()).some((role) => role.name === adminRoleName)
}
