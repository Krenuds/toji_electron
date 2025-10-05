import { z } from 'zod'
import type { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js'
import type { ITojiCore } from '../../interfaces'
import { existsSync, mkdirSync } from 'fs'
import { resolve, normalize } from 'path'

interface InitializeProjectDependencies {
  getToji: () => ITojiCore | null
}

/**
 * Register initialize_project tool
 * Creates and initializes a new project at the specified path
 */
export function registerInitializeProjectTool(
  server: McpServer,
  dependencies: InitializeProjectDependencies
): void {
  server.registerTool(
    'initialize_project',
    {
      title: 'Initialize Project',
      description:
        'Initialize a project directory with git repository and opencode.json configuration. If the directory does not exist, it will be created. The user should specify the full path where they want the project created. Example: "C:\\Users\\MyName\\Projects\\my-project" or "/home/user/projects/my-project"',
      inputSchema: {
        path: z
          .string()
          .describe(
            'Full absolute path where the project should be initialized. Will be created if it does not exist.'
          ),
        projectName: z
          .string()
          .optional()
          .describe('Optional project name for opencode.json (defaults to directory name)'),
        description: z
          .string()
          .optional()
          .describe('Optional project description for opencode.json'),
        model: z
          .string()
          .optional()
          .describe('Optional default model to use (e.g., "anthropic/claude-3-5-sonnet-20241022")'),
        autoSwitch: z
          .boolean()
          .optional()
          .describe(
            'If true, automatically switch to the newly initialized project (default: true)'
          )
      },
      outputSchema: {
        success: z.boolean(),
        projectPath: z.string().optional(),
        steps: z.array(z.string()).optional(),
        error: z.string().optional(),
        needsGitInstall: z.boolean().optional(),
        switched: z.boolean().optional(),
        message: z.string()
      }
    },
    async ({ path: projectPath, projectName, description, model, autoSwitch = true }) => {
      const { getToji } = dependencies

      const toji = getToji()
      if (!toji) {
        return {
          content: [
            {
              type: 'text',
              text: 'Error: Toji instance not available. Cannot initialize project.'
            }
          ],
          structuredContent: {
            success: false,
            message: 'Toji not available',
            error: 'Toji instance not initialized'
          },
          isError: true
        }
      }

      try {
        // Normalize and validate the path
        const normalizedPath = normalize(projectPath)
        const absolutePath = resolve(normalizedPath)

        // Check if path exists, if not create it
        if (!existsSync(absolutePath)) {
          try {
            mkdirSync(absolutePath, { recursive: true })
          } catch (error) {
            const errMsg = error instanceof Error ? error.message : String(error)
            return {
              content: [
                {
                  type: 'text',
                  text: `Error: Could not create directory at ${absolutePath}: ${errMsg}`
                }
              ],
              structuredContent: {
                success: false,
                error: `Failed to create directory: ${errMsg}`,
                message: 'Directory creation failed'
              },
              isError: true
            }
          }
        }

        // Build config object first
        const config: Record<string, unknown> = {}
        if (projectName) config.name = projectName
        if (description) config.description = description
        if (model) config.model = model

        // Switch to the directory to set context
        // Note: This may show "global" status initially since the directory is empty
        try {
          await toji.switchToProject(absolutePath)
        } catch (error) {
          const errMsg = error instanceof Error ? error.message : String(error)
          return {
            content: [
              {
                type: 'text',
                text: `Error: Could not switch to directory ${absolutePath}: ${errMsg}`
              }
            ],
            structuredContent: {
              success: false,
              projectPath: absolutePath,
              error: `Failed to switch to directory: ${errMsg}`,
              message: 'Switch failed'
            },
            isError: true
          }
        }

        // Initialize the project (this will restart the server and properly configure it)
        const result = await toji.initializeProject(config)

        if (result.success) {
          // Give the server a moment to fully stabilize after restart
          await new Promise((resolve) => setTimeout(resolve, 500))

          const stepsCompleted = result.steps?.join(', ') || 'initialization'
          const message = `Successfully initialized project at ${result.projectPath}. Completed: ${stepsCompleted}${autoSwitch ? '. Project is now active and ready.' : ''}`

          return {
            content: [
              {
                type: 'text',
                text: message
              }
            ],
            structuredContent: {
              success: true,
              projectPath: result.projectPath,
              steps: result.steps,
              switched: autoSwitch,
              message
            }
          }
        } else {
          const errorMsg = result.error || 'Unknown error occurred during project initialization'

          return {
            content: [
              {
                type: 'text',
                text: `Failed to initialize project: ${errorMsg}${result.needsGitInstall ? '\n\nPlease install Git from https://git-scm.com and try again.' : ''}`
              }
            ],
            structuredContent: {
              success: false,
              error: errorMsg,
              needsGitInstall: result.needsGitInstall,
              message: 'Initialization failed'
            },
            isError: true
          }
        }
      } catch (error) {
        const errorMessage = error instanceof Error ? error.message : String(error)
        return {
          content: [
            {
              type: 'text',
              text: `Error initializing project: ${errorMessage}`
            }
          ],
          structuredContent: {
            success: false,
            error: errorMessage,
            message: 'Initialization error'
          },
          isError: true
        }
      }
    }
  )
}
