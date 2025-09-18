// ============================================
// Toji API - Main Barrel Export
// ============================================
// This is THE gateway to the entire Toji API platform.
// All interfaces import from here to get everything they need.

// ===== OPENCODE SDK - COMPLETE RE-EXPORT =====
// Re-export EVERYTHING from the OpenCode SDK
// This gives interfaces access to all 50+ methods and 226+ types
export * from '@opencode-ai/sdk'

// ===== TOJI TYPES =====
// Custom Toji types and configurations
export type * from './types'

// ===== TOJI MANAGERS =====
// Export all manager classes for direct access if needed
export { ServerManager } from './server'
export { ClientManager } from './client'
export { WorkspaceManager } from './workspace'
export { SessionManager } from './session'
export { ProjectManager } from './project'

// ===== THE TOJI API =====
// The main orchestrator class
export { Toji } from './Toji'

// ===== CONVENIENCE EXPORTS =====
// TODO: Next session - Create singleton instance and factory functions
// This will be where we export the main `toji` instance that
// all interfaces can import and use immediately:
//
// export const toji = createTojiInstance()
//
// Usage across all interfaces:
// import { toji } from '@main/api'
// await toji.initialize('/my/project')
// const response = await toji.session.prompt('Hello')
// await toji.beAwesome()

// ===== WHAT THIS PROVIDES =====
/*
Interfaces can now import:

1. Full OpenCode SDK:
   import { createOpencodeClient, type Session } from '@main/api'

2. Individual managers:
   import { SessionManager, ProjectManager } from '@main/api'

3. The complete Toji API:
   import { Toji } from '@main/api'

4. Everything at once:
   import * as TojiAPI from '@main/api'

5. Future: The singleton instance:
   import { toji } from '@main/api'
   await toji.quickStart('/workspace')
*/
