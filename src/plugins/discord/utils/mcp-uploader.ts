// Discord file uploader for MCP integration
import { existsSync } from 'fs'
import { AttachmentBuilder, Client, TextChannel } from 'discord.js'
import type { DiscordFileUploader } from '../../../main/toji/mcp'
import { createLogger } from '../../../main/utils/logger'

const logger = createLogger('discord:mcp-uploader')

/**
 * Creates a Discord file uploader that implements the MCP interface
 * Tracks the last active channel for convenience
 */
export function createDiscordFileUploader(client: Client): DiscordFileUploader & {
  setCurrentChannel: (channelId: string) => void
  getCurrentChannel: () => string | undefined
} {
  let currentChannelId: string | undefined

  return {
    setCurrentChannel(channelId: string) {
      currentChannelId = channelId
      logger.debug('Current channel set to: %s', channelId)
    },

    getCurrentChannel() {
      return currentChannelId
    },

    async uploadFile(channelId: string | undefined, filePath: string, message?: string) {
      // Use current channel if not specified
      const targetChannelId = channelId || currentChannelId

      if (!targetChannelId) {
        throw new Error('No channel ID provided and no current channel set')
      }

      logger.debug('Uploading file %s to channel %s', filePath, targetChannelId)

      // Verify file exists
      if (!existsSync(filePath)) {
        throw new Error(`File not found: ${filePath}`)
      }

      try {
        // Get the channel
        const channel = await client.channels.fetch(targetChannelId)

        if (!channel?.isTextBased()) {
          throw new Error(`Channel ${targetChannelId} is not a text channel`)
        }

        // Create attachment
        const attachment = new AttachmentBuilder(filePath)

        // Send message with attachment
        const sentMessage = await (channel as TextChannel).send({
          content: message || undefined,
          files: [attachment]
        })

        // Get attachment URL (Discord returns the uploaded URL)
        const attachmentUrl = sentMessage.attachments.first()?.url || 'No attachment URL available'

        const result = {
          messageId: sentMessage.id,
          channelId: sentMessage.channelId,
          attachmentUrl
        }

        logger.debug('File uploaded successfully: %s', attachmentUrl)
        return result
      } catch (error) {
        logger.debug('Error uploading file: %o', error)
        throw new Error(
          `Failed to upload file to Discord: ${error instanceof Error ? error.message : 'Unknown error'}`
        )
      }
    }
  }
}
