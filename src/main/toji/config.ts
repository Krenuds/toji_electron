// Default configuration for OpenCode SDK servers
import type { Config } from '@opencode-ai/sdk'

export const defaultOpencodeConfig: Config = {
  model: 'anthropic/claude-3-5-sonnet-20241022'
  // Add other default config options as needed
}

export type OpencodeConfig = Config
