// Default configuration for OpenCode SDK servers

// The Config type from SDK is optional partial config override
// We'll define our own minimal config interface
export interface OpencodeConfig {
  model?: string
  // Add other config options as needed
}

export const defaultOpencodeConfig: OpencodeConfig = {
  model: 'anthropic/claude-3-5-sonnet-20241022'
  // Add other default config options as needed
}
