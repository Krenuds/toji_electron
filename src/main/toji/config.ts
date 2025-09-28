// Default configuration for OpenCode SDK servers

// Valid OpenCode configuration based on the official Config API
// See: https://github.com/sst/opencode/blob/dev/packages/sdk/js/src/gen/types.gen.ts
export interface OpencodeConfig {
  model?: string // Primary model in "provider/model" format
  small_model?: string // Smaller model for tasks like title generation
  instructions?: string[] // Additional instruction files
  share?: 'manual' | 'auto' | 'disabled' // Control sharing behavior
  autoupdate?: boolean // Automatically update to latest version
  // Note: "rules" and "project" are NOT valid fields
}

export const defaultOpencodeConfig: OpencodeConfig = {
  model: 'opencode/grok-code'
  // Minimal config - only model is required
}
