// Image utilities for OpenCode multimodal support
import { promises as fs } from 'fs'
import { extname } from 'path'
import type { Part } from '@opencode-ai/sdk'
import { createLogger } from '../utils/logger'

const logger = createLogger('toji:image-utils')

// Map file extensions to MIME types
const MIME_TYPES: Record<string, string> = {
  '.jpg': 'image/jpeg',
  '.jpeg': 'image/jpeg',
  '.png': 'image/png',
  '.gif': 'image/gif',
  '.webp': 'image/webp',
  '.bmp': 'image/bmp'
}

// Detect MIME type from file extension
function detectMimeType(filePath: string): string {
  const ext = extname(filePath).toLowerCase()
  return MIME_TYPES[ext] || 'application/octet-stream'
}

/**
 * Convert an image file to a FilePart for OpenCode
 * @param imagePath Absolute path to the image file
 * @param mimeType Optional MIME type (will be auto-detected if not provided)
 * @returns FilePart with base64-encoded image data
 */
export async function imageToFilePart(imagePath: string, mimeType?: string): Promise<Part> {
  try {
    logger.debug('Converting image to FilePart: %s', imagePath)

    // Read the image file
    const imageBuffer = await fs.readFile(imagePath)

    // Detect MIME type if not provided
    const mime = mimeType || detectMimeType(imagePath)
    logger.debug('Image MIME type: %s', mime)

    // Convert to base64
    const base64Data = imageBuffer.toString('base64')

    // Create data URI
    const dataUri = `data:${mime};base64,${base64Data}`

    // Extract filename
    const filename = imagePath.split(/[\\/]/).pop() || 'image'

    logger.debug('Image converted successfully: %s (%d bytes)', filename, imageBuffer.length)

    // Return FilePart matching OpenCode SDK type
    return {
      type: 'file',
      mime,
      url: dataUri,
      filename
    } as Part
  } catch (error) {
    logger.error('Failed to convert image to FilePart: %o', error)
    throw new Error(
      `Failed to read image file: ${error instanceof Error ? error.message : String(error)}`
    )
  }
}

/**
 * Check if a file path is likely an image based on extension
 * @param filePath Path to check
 * @returns true if file extension matches known image types
 */
export function isImageFile(filePath: string): boolean {
  const ext = extname(filePath).toLowerCase()
  return ext in MIME_TYPES
}
