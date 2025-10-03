import { z } from 'zod'
import type { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js'
import type { OpencodeClient } from '@opencode-ai/sdk'
import type { SessionManager } from '../../sessions'

interface ClearSessionDependencies {
  getClient: () => OpencodeClient | null
  getCurrentProjectPath: () => string | undefined
  sessionManager: SessionManager
}

/**
 * Register clear_and_start_session tool
 * Creates a new session and sets it as active, effectively clearing the conversation
 */
export function registerClearSessionTool(
  server: McpServer,
  dependencies: ClearSessionDependencies
): void {
  server.registerTool(
    'clear_and_start_session',
    {
      title: 'Clear and Start New Session',
      description:
        'Creates a new session for the current project and sets it as active. This clears the conversation history while maintaining project context.',
      inputSchema: {
        title: z.string().optional().describe('Optional title for the new session')
      },
      outputSchema: {
        sessionId: z.string(),
        sessionTitle: z.string(),
        projectPath: z.string().optional(),
        message: z.string()
      }
    },
    async ({ title }) => {
      const { getClient, getCurrentProjectPath, sessionManager } = dependencies

      // Get current project
      const projectPath = getCurrentProjectPath()
      if (!projectPath) {
        return {
          content: [
            {
              type: 'text',
              text: 'Error: No project is currently active. Please open a project first.'
            }
          ],
          structuredContent: {
            sessionId: '',
            sessionTitle: '',
            message: 'No active project'
          },
          isError: true
        }
      }

      // Get OpenCode client
      const client = getClient()
      if (!client) {
        return {
          content: [
            {
              type: 'text',
              text: 'Error: OpenCode client is not connected. Cannot create session.'
            }
          ],
          structuredContent: {
            sessionId: '',
            sessionTitle: '',
            projectPath,
            message: 'Client not connected'
          },
          isError: true
        }
      }

      try {
        // Create new session using OpenCode SDK
        const sessionTitle =
          title ||
          `Fresh Start - ${new Date().toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit' })}`

        const newSession = await sessionManager.createSession(client, sessionTitle, projectPath)

        // Set as active session
        sessionManager.setActiveSession(newSession.id, projectPath)

        const message = `Successfully created and activated new session: "${newSession.title}"`

        return {
          content: [
            {
              type: 'text',
              text: message
            }
          ],
          structuredContent: {
            sessionId: newSession.id,
            sessionTitle: newSession.title,
            projectPath,
            message
          }
        }
      } catch (error) {
        const errorMessage =
          error instanceof Error ? error.message : 'Unknown error creating session'

        return {
          content: [
            {
              type: 'text',
              text: `Error creating new session: ${errorMessage}`
            }
          ],
          structuredContent: {
            sessionId: '',
            sessionTitle: '',
            projectPath,
            message: errorMessage
          },
          isError: true
        }
      }
    }
  )
}
