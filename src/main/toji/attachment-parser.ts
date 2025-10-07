/**
 * Attachment parser - extracts @filename references from messages
 * Inspired by OpenCode TUI's attachment system
 */

import path from 'path'
import { existsSync } from 'fs'
import type { ImageAttachment } from './types'
import { createLogger } from '../utils/logger'

const logger = createLogger('toji:attachment-parser')

// Supported image extensions
const IMAGE_EXTENSIONS = ['.png', '.jpg', '.jpeg', '.gif', '.webp', '.bmp']

/**
 * Check if a file path points to an image
 */
function isImageFile(filePath: string): boolean {
  const ext = path.extname(filePath).toLowerCase()
  return IMAGE_EXTENSIONS.includes(ext)
}

/**
 * Parse result containing clean message and extracted attachments
 */
export interface ParseResult {
  cleanMessage: string
  images: ImageAttachment[]
}

/**
 * Parse @filename references from a message
 *
 * Supports formats:
 * - @filename.png
 * - @./relative/path/file.jpg
 * - @C:\absolute\path\image.png
 * - @/unix/absolute/path.gif
 *
 * Only extracts files that:
 * 1. Exist on disk
 * 2. Have image extensions
 *
 * @param message - User message potentially containing @filename references
 * @param workingDirectory - Base directory for resolving relative paths
 * @returns ParseResult with clean message and extracted image attachments
 */
export function parseFileAttachments(message: string, workingDirectory?: string): ParseResult {
  const images: ImageAttachment[] = []

  // Pattern matches @filename with optional path components
  // Captures: @path/to/file.ext or @C:\path\to\file.ext
  const filePattern = /@([\w\-./\\:]+\.[\w]+)/gi

  // Track which matches are valid images
  const validMatches = new Map<string, ImageAttachment>()

  // Find all @filename references
  let match: RegExpExecArray | null
  while ((match = filePattern.exec(message)) !== null) {
    const fullMatch = match[0] // "@filename.png"
    const filePath = match[1] // "filename.png"

    // Skip if already processed
    if (validMatches.has(fullMatch)) {
      continue
    }

    // Resolve to absolute path
    let absolutePath = filePath
    if (!path.isAbsolute(filePath)) {
      absolutePath = workingDirectory
        ? path.resolve(workingDirectory, filePath)
        : path.resolve(filePath)
    }

    // Check if file exists and is an image
    if (existsSync(absolutePath) && isImageFile(absolutePath)) {
      logger.debug('Found image attachment: %s -> %s', filePath, absolutePath)
      validMatches.set(fullMatch, { path: absolutePath })
    } else {
      logger.debug('Skipping @reference (not an image or does not exist): %s', filePath)
    }
  }

  // Replace valid matches with attachment markers
  let cleanMessage = message
  for (const [matchText, attachment] of validMatches.entries()) {
    images.push(attachment)
    const filename = path.basename(attachment.path)
    cleanMessage = cleanMessage.replace(
      new RegExp(matchText.replace(/[.*+?^${}()|[\]\\]/g, '\\$&'), 'g'),
      `[Attached: ${filename}]`
    )
  }

  logger.debug('Parsed %d image attachments from message', images.length)

  return { cleanMessage, images }
}
