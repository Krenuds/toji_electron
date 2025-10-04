/**
 * TTS Service - OpenAI Text-to-Speech Integration
 * Converts text to speech audio using OpenAI's TTS API
 */

import { createFileDebugLogger } from '../utils/logger'
import type { ConfigProvider } from '../config/ConfigProvider'

const log = createFileDebugLogger('tts-service')

export interface TTSConfig {
  model: 'tts-1' | 'tts-1-hd'
  voice: 'alloy' | 'echo' | 'fable' | 'onyx' | 'nova' | 'shimmer'
  speed?: number // 0.25 to 4.0
  responseFormat?: 'mp3' | 'opus' | 'aac' | 'flac' | 'wav' | 'pcm'
}

export class TTSService {
  private apiKey?: string

  constructor(config: ConfigProvider) {
    log('Initializing TTSService')
    this.apiKey = config.getOpencodeApiKey('openai')

    if (!this.apiKey) {
      log('⚠️ OpenAI API key not found - TTS will not be available')
    } else {
      log('✅ OpenAI API key configured')
    }
  }

  /**
   * Convert text to speech using OpenAI TTS API
   * @param text The text to convert to speech (max 4096 characters)
   * @param options TTS configuration options
   * @returns Audio buffer in specified format
   */
  async textToSpeech(text: string, options: Partial<TTSConfig> = {}): Promise<Buffer> {
    if (!this.apiKey) {
      throw new Error('OpenAI API key not configured. Cannot generate TTS.')
    }

    // Validate text length
    if (text.length > 4096) {
      log(`⚠️ Text too long (${text.length} chars), truncating to 4096`)
      text = text.substring(0, 4096)
    }

    if (text.trim().length === 0) {
      throw new Error('Cannot generate TTS for empty text')
    }

    const config: TTSConfig = {
      model: options.model || 'tts-1', // Fast model by default
      voice: options.voice || 'nova', // Default voice
      speed: options.speed || 1.0,
      responseFormat: options.responseFormat || 'opus' // Discord-friendly format
    }

    log('Generating TTS:')
    log(`  Text: "${text.substring(0, 50)}${text.length > 50 ? '...' : ''}"`)
    log(`  Length: ${text.length} characters`)
    log(`  Model: ${config.model}`)
    log(`  Voice: ${config.voice}`)
    log(`  Format: ${config.responseFormat}`)

    const startTime = Date.now()

    try {
      const response = await fetch('https://api.openai.com/v1/audio/speech', {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${this.apiKey}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          model: config.model,
          input: text,
          voice: config.voice,
          speed: config.speed,
          response_format: config.responseFormat
        })
      })

      if (!response.ok) {
        const errorText = await response.text()
        log(`❌ TTS API error: ${response.status} - ${errorText}`)
        throw new Error(`TTS API error: ${response.status} - ${errorText}`)
      }

      const audioBuffer = Buffer.from(await response.arrayBuffer())
      const duration = Date.now() - startTime

      log(`✅ TTS generated successfully`)
      log(`  Buffer size: ${audioBuffer.length} bytes`)
      log(`  Duration: ${duration}ms`)

      return audioBuffer
    } catch (error) {
      log('❌ TTS generation failed:', error)
      throw error
    }
  }

  /**
   * Split long text into chunks that fit within TTS API limits
   * @param text The text to split
   * @param maxLength Maximum length per chunk (default 4000, leaving buffer)
   * @returns Array of text chunks
   */
  splitText(text: string, maxLength: number = 4000): string[] {
    if (text.length <= maxLength) {
      return [text]
    }

    log(`Splitting long text (${text.length} chars) into chunks`)

    const chunks: string[] = []

    // Try to split on sentence boundaries
    const sentences = text.split(/(?<=[.!?])\s+/)
    let currentChunk = ''

    for (const sentence of sentences) {
      // If a single sentence is too long, split it further
      if (sentence.length > maxLength) {
        if (currentChunk) {
          chunks.push(currentChunk.trim())
          currentChunk = ''
        }

        // Split long sentence on word boundaries
        const words = sentence.split(/\s+/)
        for (const word of words) {
          if (currentChunk.length + word.length + 1 > maxLength) {
            chunks.push(currentChunk.trim())
            currentChunk = word
          } else {
            currentChunk += (currentChunk ? ' ' : '') + word
          }
        }
      } else if (currentChunk.length + sentence.length + 1 > maxLength) {
        // Current chunk + new sentence would be too long
        chunks.push(currentChunk.trim())
        currentChunk = sentence
      } else {
        currentChunk += (currentChunk ? ' ' : '') + sentence
      }
    }

    // Add remaining chunk
    if (currentChunk.trim()) {
      chunks.push(currentChunk.trim())
    }

    log(`Split into ${chunks.length} chunks:`)
    chunks.forEach((chunk, i) => {
      log(`  Chunk ${i + 1}: ${chunk.length} chars`)
    })

    return chunks
  }

  /**
   * Check if TTS is available (API key configured)
   */
  isAvailable(): boolean {
    return !!this.apiKey
  }

  /**
   * Get the configured API key status (for debugging)
   */
  getStatus(): { available: boolean; reason?: string } {
    if (!this.apiKey) {
      return {
        available: false,
        reason: 'OpenAI API key not configured'
      }
    }

    return { available: true }
  }
}
