// Default configuration for OpenCode SDK servers
// Uses types from @opencode-ai/sdk for full type safety

import type { Config } from '@opencode-ai/sdk'

// Re-export SDK Config type as OpencodeConfig for convenience
export type { Config as OpencodeConfig }

// Helper type aliases for permission management
export type PermissionLevel = 'ask' | 'allow' | 'deny'
export type PermissionType = 'edit' | 'bash' | 'webfetch'

// Type for the permission configuration object
export type PermissionConfig = NonNullable<Config['permission']>

export const defaultOpencodeConfig: Config = {
  model: 'opencode/grok-code'
  // Minimal config - only model is required
}
