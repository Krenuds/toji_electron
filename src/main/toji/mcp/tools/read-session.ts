import { z } from 'zod'
import type { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js'
import type { OpencodeClient } from '@opencode-ai/sdk'
import type { SessionManager } from '../../sessions'

interface ReadSessionDependencies {
  getClient: () => OpencodeClient | null
  getCurrentProjectPath: () => string | undefined
  sessionManager: SessionManager
}

/**
 * Register read_session_messages tool
 * Allows AI to read messages from any session to gather context
 */
export function registerReadSessionTool(
  server: McpServer,
  dependencies: ReadSessionDependencies
): void {
  server.registerTool(
    'read_session_messages',
    {
      title: 'Read Session Messages',
      description:
        'Read messages from a specific session or search for sessions by title. Useful for gathering context from previous conversations.',
      inputSchema: {
        sessionId: z
          .string()
          .optional()
          .describe('Specific session ID to read. If omitted, searches by title.'),
        searchTitle: z
          .string()
          .optional()
          .describe('Search term to find sessions by title (case-insensitive).'),
        limit: z
          .number()
          .optional()
          .default(20)
          .describe('Maximum number of messages to return (default: 20)')
      },
      outputSchema: {
        sessionId: z.string(),
        sessionTitle: z.string(),
        messageCount: z.number(),
        messages: z.array(
          z.object({
            role: z.string(),
            content: z.string(),
            timestamp: z.string().optional()
          })
        )
      }
    },
    async ({ sessionId, searchTitle, limit = 20 }) => {
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
            messageCount: 0,
            messages: []
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
              text: 'Error: OpenCode client is not connected. Cannot read sessions.'
            }
          ],
          structuredContent: {
            sessionId: '',
            sessionTitle: '',
            messageCount: 0,
            messages: []
          },
          isError: true
        }
      }

      try {
        let targetSessionId = sessionId
        let sessionTitle = ''

        // If no sessionId provided, search by title
        if (!targetSessionId && searchTitle) {
          const sessions = await sessionManager.listSessions(client, projectPath)
          const searchLower = searchTitle.toLowerCase()

          // Find first session matching search term
          const matchedSession = sessions.find((s) => s.title.toLowerCase().includes(searchLower))

          if (!matchedSession) {
            return {
              content: [
                {
                  type: 'text',
                  text: `No sessions found matching "${searchTitle}". Available sessions: ${sessions.map((s) => s.title).join(', ')}`
                }
              ],
              structuredContent: {
                sessionId: '',
                sessionTitle: searchTitle,
                messageCount: 0,
                messages: []
              },
              isError: true
            }
          }

          targetSessionId = matchedSession.id
          sessionTitle = matchedSession.title
        } else if (targetSessionId) {
          // Get session title for provided ID
          const sessions = await sessionManager.listSessions(client, projectPath)
          const session = sessions.find((s) => s.id === targetSessionId)
          sessionTitle = session?.title || 'Unknown Session'
        } else {
          return {
            content: [
              {
                type: 'text',
                text: 'Error: Must provide either sessionId or searchTitle'
              }
            ],
            structuredContent: {
              sessionId: '',
              sessionTitle: '',
              messageCount: 0,
              messages: []
            },
            isError: true
          }
        }

        // Fetch messages from the session
        const messagesData = await sessionManager.getSessionMessages(
          client,
          targetSessionId,
          projectPath,
          false // Don't use cache, get fresh data
        )

        // Limit messages if needed
        const limitedMessages = messagesData.slice(0, limit)

        // Format messages for output
        const formattedMessages = limitedMessages.map((msg) => {
          const role = msg.info.role || 'unknown'
          const timestamp = msg.info.time?.created
            ? new Date(msg.info.time.created).toISOString()
            : undefined

          // Extract text content from parts
          const textParts = msg.parts.filter((p) => p.type === 'text').map((p) => p.text || '')
          const content = textParts.join('\n')

          return {
            role,
            content,
            timestamp
          }
        })

        const summary = `Found ${formattedMessages.length} messages in session "${sessionTitle}" (${targetSessionId})`

        return {
          content: [
            {
              type: 'text',
              text: `${summary}\n\nMessages:\n${formattedMessages.map((m, i) => `${i + 1}. [${m.role}] ${m.content.substring(0, 100)}${m.content.length > 100 ? '...' : ''}`).join('\n')}`
            }
          ],
          structuredContent: {
            sessionId: targetSessionId,
            sessionTitle,
            messageCount: formattedMessages.length,
            messages: formattedMessages
          }
        }
      } catch (error) {
        const errorMessage =
          error instanceof Error ? error.message : 'Unknown error reading session'

        return {
          content: [
            {
              type: 'text',
              text: `Error reading session: ${errorMessage}`
            }
          ],
          structuredContent: {
            sessionId: sessionId || '',
            sessionTitle: searchTitle || '',
            messageCount: 0,
            messages: []
          },
          isError: true
        }
      }
    }
  )
}
