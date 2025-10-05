// Discord file upload tool for MCP
import { z } from 'zod'
import type { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js'
import { createLogger } from '../../../utils/logger'

const logger = createLogger('mcp:discord-upload')

export interface DiscordFileUploader {
  uploadFile(
    channelId: string | undefined,
    filePath: string,
    message?: string
  ): Promise<{
    messageId: string
    channelId: string
    attachmentUrl: string
  }>
}

/**
 * Register Discord file upload tool with MCP server
 */
export function registerDiscordUploadTool(
  server: McpServer,
  fileUploader: DiscordFileUploader
): void {
  logger.debug('Registering discord_upload tool')

  server.registerTool(
    'discord_upload',
    {
      title: 'Upload File to Discord',
      description:
        'Upload a file to a Discord channel with an optional message. If channelId is not provided, uses the current active channel.',
      inputSchema: {
        filePath: z
          .string()
          .describe('Absolute path to the file to upload. The file must exist and be accessible.'),
        channelId: z
          .string()
          .optional()
          .describe(
            'Discord channel ID to upload to. If not provided, uses the current active channel.'
          ),
        message: z.string().optional().describe('Optional message to send with the file attachment')
      },
      outputSchema: {
        messageId: z.string().describe('ID of the message containing the attachment'),
        channelId: z.string().describe('ID of the channel where file was uploaded'),
        attachmentUrl: z.string().describe('URL of the uploaded attachment'),
        success: z.boolean()
      }
    },
    async ({ filePath, channelId, message }) => {
      try {
        logger.debug(
          'Uploading file %s to channel %s with message: %s',
          filePath,
          channelId || 'current',
          message || 'none'
        )

        const result = await fileUploader.uploadFile(channelId, filePath, message)

        const output = {
          ...result,
          success: true
        }

        logger.debug('File uploaded successfully: %s', result.attachmentUrl)

        return {
          content: [
            {
              type: 'text',
              text: `Successfully uploaded file to Discord.\nMessage ID: ${result.messageId}\nAttachment URL: ${result.attachmentUrl}`
            }
          ],
          structuredContent: output
        }
      } catch (error) {
        logger.debug('Error uploading file: %o', error)
        const errorMessage = error instanceof Error ? error.message : 'Unknown error'

        return {
          content: [
            {
              type: 'text',
              text: `Error uploading file to Discord: ${errorMessage}`
            }
          ],
          isError: true
        }
      }
    }
  )

  logger.debug('discord_upload tool registered successfully')
}
