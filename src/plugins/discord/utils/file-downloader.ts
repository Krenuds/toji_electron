// Discord file downloader - saves attachments to project directory
import { promises as fs } from 'fs'
import path from 'path'
import type { Message } from 'discord.js'
import { createLogger } from '../../../main/utils/logger'

const logger = createLogger('discord:file-downloader')

export interface DownloadedFile {
  filename: string
  filepath: string
  size: number
  url: string
}

/**
 * Downloads Discord message attachments to the project directory
 * @param message Discord message with attachments
 * @param projectDir Target project directory
 * @returns Array of downloaded file info
 */
export async function downloadAttachments(
  message: Message,
  projectDir: string
): Promise<DownloadedFile[]> {
  if (!message.attachments.size) {
    return []
  }

  const downloadedFiles: DownloadedFile[] = []

  for (const [, attachment] of message.attachments) {
    try {
      logger.debug('Downloading attachment: %s (%d bytes)', attachment.name, attachment.size)

      // Fetch the file
      const response = await fetch(attachment.url)
      if (!response.ok) {
        throw new Error(`Failed to fetch file: ${response.statusText}`)
      }

      // Get file buffer
      const buffer = await response.arrayBuffer()
      const nodeBuffer = Buffer.from(buffer)

      // Sanitize filename to prevent path traversal
      const sanitizedFilename = path.basename(attachment.name || 'unknown_file')
      const targetPath = path.join(projectDir, sanitizedFilename)

      // Check if file already exists and create unique name if needed
      let finalPath = targetPath
      let counter = 1
      while (await fileExists(finalPath)) {
        const ext = path.extname(sanitizedFilename)
        const base = path.basename(sanitizedFilename, ext)
        finalPath = path.join(projectDir, `${base}_${counter}${ext}`)
        counter++
      }

      // Write file to disk
      await fs.writeFile(finalPath, nodeBuffer)

      const downloadedFile: DownloadedFile = {
        filename: path.basename(finalPath),
        filepath: finalPath,
        size: nodeBuffer.length,
        url: attachment.url
      }

      downloadedFiles.push(downloadedFile)
      logger.debug('✅ Downloaded to: %s', finalPath)
    } catch (error) {
      logger.debug('ERROR: Failed to download attachment %s: %o', attachment.name, error)
      // Continue with other attachments even if one fails
    }
  }

  return downloadedFiles
}

/**
 * Check if file exists
 */
async function fileExists(filepath: string): Promise<boolean> {
  try {
    await fs.access(filepath)
    return true
  } catch {
    return false
  }
}

/**
 * Format attachment info for AI message
 * @param files Array of downloaded files
 * @returns Formatted message string
 */
export function formatAttachmentMessage(files: DownloadedFile[]): string {
  if (files.length === 0) {
    return ''
  }

  if (files.length === 1) {
    const file = files[0]
    const sizeKb = (file.size / 1024).toFixed(2)
    return `[User uploaded file: ${file.filename} (${sizeKb} KB)]`
  }

  const fileList = files
    .map((f) => {
      const sizeKb = (f.size / 1024).toFixed(2)
      return `  - ${f.filename} (${sizeKb} KB)`
    })
    .join('\n')

  return `[User uploaded ${files.length} files:\n${fileList}]`
}
