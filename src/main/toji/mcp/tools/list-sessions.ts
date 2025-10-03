import { z } from 'zod'
import type { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js'
import type { OpencodeClient } from '@opencode-ai/sdk'
import type { SessionManager } from '../../sessions'

interface ListSessionDependencies {
  getClient: () => OpencodeClient | null
  getCurrentProjectPath: () => string | undefined
  sessionManager: SessionManager
}

/**
 * Register list_sessions tool
 * Provides overview of all available sessions in current project
 */
export function registerListSessionsTool(
  server: McpServer,
  dependencies: ListSessionDependencies
): void {
  server.registerTool(
    'list_sessions',
    {
      title: 'List Sessions',
      description:
        'List all available sessions in the current project with metadata (title, message count, last active). Use this to discover what sessions exist before reading specific ones.',
      inputSchema: {
        includeMessageCount: z
          .boolean()
          .optional()
          .default(true)
          .describe('Include message count for each session (default: true)')
      },
      outputSchema: {
        currentSessionId: z.string().optional(),
        totalCount: z.number(),
        sessions: z.array(
          z.object({
            id: z.string(),
            title: z.string(),
            messageCount: z.number().optional(),
            created: z.string(),
            updated: z.string(),
            lastActive: z.string().optional()
          })
        )
      }
    },
    async ({ includeMessageCount = true }) => {
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
            totalCount: 0,
            sessions: []
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
              text: 'Error: OpenCode client is not connected. Cannot list sessions.'
            }
          ],
          structuredContent: {
            totalCount: 0,
            sessions: []
          },
          isError: true
        }
      }

      try {
        // Get active session ID
        const currentSessionId = sessionManager.getActiveSession(projectPath)

        // List all sessions for current project
        const sessions = await sessionManager.listSessions(client, projectPath)

        // Get message counts if requested
        const sessionsWithMetadata = await Promise.all(
          sessions.map(async (session) => {
            let messageCount: number | undefined = undefined

            if (includeMessageCount) {
              try {
                const messages = await sessionManager.getSessionMessages(
                  client,
                  session.id,
                  projectPath,
                  true // Use cache for faster listing
                )
                messageCount = messages.length
              } catch {
                // If we can't get message count, just skip it
                messageCount = undefined
              }
            }

            return {
              id: session.id,
              title: session.title,
              messageCount,
              created: session.created?.toISOString() || new Date().toISOString(),
              updated: session.updated?.toISOString() || new Date().toISOString(),
              lastActive: session.lastActive?.toISOString()
            }
          })
        )

        // Sort by last active (most recent first)
        sessionsWithMetadata.sort((a, b) => {
          const aTime = a.lastActive || a.updated
          const bTime = b.lastActive || b.updated
          return new Date(bTime).getTime() - new Date(aTime).getTime()
        })

        // Format output message
        const sessionList = sessionsWithMetadata
          .map((s, i) => {
            const isActive = s.id === currentSessionId ? ' (active)' : ''
            const msgCount = s.messageCount !== undefined ? ` - ${s.messageCount} messages` : ''
            return `${i + 1}. "${s.title}"${isActive}${msgCount}\n   ID: ${s.id}`
          })
          .join('\n')

        const summary = `Found ${sessionsWithMetadata.length} session(s) in current project`
        const activeNote = currentSessionId
          ? `\nCurrent active session: ${currentSessionId}`
          : '\nNo active session'

        return {
          content: [
            {
              type: 'text',
              text: `${summary}${activeNote}\n\nSessions:\n${sessionList}`
            }
          ],
          structuredContent: {
            currentSessionId,
            totalCount: sessionsWithMetadata.length,
            sessions: sessionsWithMetadata
          }
        }
      } catch (error) {
        const errorMessage =
          error instanceof Error ? error.message : 'Unknown error listing sessions'

        return {
          content: [
            {
              type: 'text',
              text: `Error listing sessions: ${errorMessage}`
            }
          ],
          structuredContent: {
            totalCount: 0,
            sessions: []
          },
          isError: true
        }
      }
    }
  )
}
