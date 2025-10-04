/**
 * Test/Example file for streaming chat implementation
 *
 * This demonstrates how to use the new chatStreaming() method
 * Run this manually to test the streaming functionality
 */

import type { Toji } from './index'
import { createFileDebugLogger } from '../utils/logger'

const log = createFileDebugLogger('toji:streaming-test')

/**
 * Test the streaming chat functionality
 */
export async function testStreamingChat(toji: Toji, testMessage: string): Promise<void> {
  log('Starting streaming chat test')
  log('Message: %s', testMessage)

  let buffer = ''
  let chunkCount = 0
  const startTime = Date.now()

  try {
    await toji.chatStreaming(testMessage, {
      onChunk: async (text, partId) => {
        chunkCount++
        buffer += text
        const elapsed = Date.now() - startTime
        log(
          'Chunk #%d received: %d chars (total: %d chars) after %dms [partId: %s]',
          chunkCount,
          text.length,
          buffer.length,
          elapsed,
          partId
        )
        // Log first 50 chars of the chunk for debugging
        log('  Content preview: "%s..."', text.substring(0, 50))
      },

      onComplete: async (fullText) => {
        const elapsed = Date.now() - startTime
        log('Streaming complete!')
        log('  Total chunks: %d', chunkCount)
        log('  Total characters: %d', fullText.length)
        log('  Total time: %dms', elapsed)
        log('  Avg chunk size: %d chars', Math.round(fullText.length / chunkCount))
        log('  First 100 chars: "%s..."', fullText.substring(0, 100))
      },

      onError: async (error) => {
        log('ERROR: Streaming failed: %o', error)
      }
    })

    log('Test completed successfully')
  } catch (error) {
    log('ERROR: Test failed: %o', error)
    throw error
  }
}

/**
 * Example usage for plugins (like Discord)
 */
export async function exampleDiscordUsage(toji: Toji, userMessage: string): Promise<string> {
  let fullResponse = ''
  let lastUpdateTime = 0
  const UPDATE_INTERVAL = 500 // Update every 500ms to respect rate limits

  await toji.chatStreaming(userMessage, {
    onChunk: async (text) => {
      fullResponse += text

      // Throttle updates to respect Discord rate limits
      const now = Date.now()
      if (now - lastUpdateTime >= UPDATE_INTERVAL) {
        lastUpdateTime = now
        // In real Discord code, you would edit the message here
        log('Discord: Would update message (%d chars)', fullResponse.length)
      }
    },

    onComplete: async (fullText) => {
      // Final update with complete text
      log('Discord: Final message (%d chars)', fullText.length)
      fullResponse = fullText
    },

    onError: async (error) => {
      log('Discord: Error - %s', error.message)
      throw error
    }
  })

  return fullResponse
}

/**
 * Example showing how to buffer chunks and update every N characters
 */
export async function exampleBufferedUsage(
  toji: Toji,
  userMessage: string,
  onUpdate: (text: string) => Promise<void>
): Promise<void> {
  let buffer = ''
  const BUFFER_SIZE = 100 // Update every 100 characters

  await toji.chatStreaming(userMessage, {
    onChunk: async (text) => {
      buffer += text

      // Update when buffer reaches threshold
      if (buffer.length >= BUFFER_SIZE) {
        await onUpdate(buffer)
        // Don't clear buffer - we want cumulative updates
      }
    },

    onComplete: async (fullText) => {
      // Final update with complete text
      await onUpdate(fullText)
    }
  })
}
