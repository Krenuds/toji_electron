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

// Model selection structure (primary + optional small model)
export type ModelConfig = Pick<Config, 'model' | 'small_model'>

/**
 * Default OpenCode configuration for new projects
 * Sets reasonable defaults including temperature for balanced AI responses
 */
export const defaultOpencodeConfig: Config = {
  model: 'opencode/grok-code',
  // Configure agents with default temperature of 0.7 (more creative/verbose responses)
  // Temperature range: 0.0-0.2 (focused), 0.3-0.5 (balanced), 0.6-1.0 (creative)
  // See: https://opencode.ai/docs/modes/#temperature
  agent: {
    build: {
      temperature: 0.7
    },
    plan: {
      temperature: 0.7
    },
    general: {
      temperature: 0.7
    }
  }
}
