/**
 * TTS Service - OpenAI Text-to-Speech Integration
 * Converts text to speech audio using OpenAI's TTS API
 */

import { createFileDebugLogger } from '../utils/logger'
import type { ConfigProvider } from '../config/ConfigProvider'
import { readFileSync, existsSync } from 'fs'
import { join } from 'path'

const log = createFileDebugLogger('tts-service')

// Load .env file manually if it exists
try {
  const envPath = join(process.cwd(), '.env')
  if (existsSync(envPath)) {
    const envContent = readFileSync(envPath, 'utf-8')
    envContent.split('\n').forEach((line) => {
      const match = line.match(/^OPENAI_TTS_API_KEY=(.+)$/)
      if (match && !process.env.OPENAI_TTS_API_KEY) {
        process.env.OPENAI_TTS_API_KEY = match[1].trim()
        log('Loaded OPENAI_TTS_API_KEY from .env file')
      }
    })
  }
} catch (err) {
  log('Could not load .env file:', err)
}

export interface TTSConfig {
  model: 'tts-1' | 'tts-1-hd' | 'gpt-4o-mini-tts'
  voice:
    | 'alloy'
    | 'ash'
    | 'ballad'
    | 'coral'
    | 'echo'
    | 'fable'
    | 'nova'
    | 'onyx'
    | 'sage'
    | 'shimmer'
  speed?: number // 0.25 to 4.0
  responseFormat?: 'mp3' | 'opus' | 'aac' | 'flac' | 'wav' | 'pcm'
  instructions?: string // Voice instructions for gpt-4o-mini-tts (accent, emotion, tone, etc.)
}

export class TTSService {
  private apiKey?: string

  constructor(config: ConfigProvider) {
    log('Initializing TTSService')

    // Try to get API key from ConfigProvider first
    this.apiKey = config.getOpencodeApiKey('openai')

    // Fall back to environment variable if not in config
    if (!this.apiKey && process.env.OPENAI_TTS_API_KEY) {
      this.apiKey = process.env.OPENAI_TTS_API_KEY
      log('✅ OpenAI API key loaded from environment variable')
    }

    if (!this.apiKey) {
      log('⚠️ OpenAI API key not found in config or environment - TTS will not be available')
      log('   Set OPENAI_TTS_API_KEY environment variable or configure in UI')
    } else {
      log(`✅ OpenAI API key configured (length: ${this.apiKey.length})`)
    }
  }

  /**
   * Convert text to speech using OpenAI TTS API with retry logic and streaming support
   * The gpt-4o-mini-tts model supports chunk transfer encoding for lower latency.
   * Audio chunks are streamed as they're generated, reducing perceived latency.
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
      model: options.model || 'gpt-4o-mini-tts', // Latest streaming model by default
      voice: options.voice || 'ash', // Clear, articulate voice
      speed: options.speed || 1.0,
      responseFormat: options.responseFormat || 'pcm', // PCM format: 24kHz mono s16le (upsampled to 48kHz stereo in VoiceModule)
      instructions:
        options.instructions ||
        'Voice: Deep and commanding, with a gravitas befitting an ancient Japanese samurai who has witnessed countless battles. Japanese accent with traditional pronunciation. Tone: Stoic yet wise, with measured intensity and quiet strength, making every word feel purposeful and profound. Dialect: Classical samurai speech patterns with formal honorifics, deliberate pacing, and occasional sharp emphasis on key words. Pronunciation: Precise and resonant, with controlled intensity, slight guttural undertones, and a rhythm that mirrors the discipline of the blade. Features: Uses thoughtful pauses for emphasis, maintains dignified composure, blends ancient wisdom with warrior spirit to create an immersive and honorable presence.' // Ancient samurai character by default
    }

    log('Generating TTS:')
    log(`  Text: "${text.substring(0, 50)}${text.length > 50 ? '...' : ''}"`)
    log(`  Length: ${text.length} characters`)
    log(`  Model: ${config.model}`)
    log(`  Voice: ${config.voice}`)
    log(`  Format: ${config.responseFormat}`)

    const startTime = Date.now()

    // Retry logic for transient errors
    const maxRetries = 3
    const retryDelay = 1000 // Start with 1 second

    for (let attempt = 1; attempt <= maxRetries; attempt++) {
      try {
        if (attempt > 1) {
          log(`🔄 Retry attempt ${attempt}/${maxRetries}`)
        }

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
            response_format: config.responseFormat,
            ...(config.instructions && { instructions: config.instructions })
          })
        })

        if (!response.ok) {
          const errorText = await response.text()
          const isServerError = response.status >= 500
          const isRateLimited = response.status === 429

          log(`❌ TTS API error: ${response.status} - ${errorText}`)

          // Retry on server errors or rate limits
          if ((isServerError || isRateLimited) && attempt < maxRetries) {
            const delay = retryDelay * Math.pow(2, attempt - 1) // Exponential backoff
            log(`⏳ Waiting ${delay}ms before retry...`)
            await new Promise((resolve) => setTimeout(resolve, delay))
            continue
          }

          throw new Error(`TTS API error: ${response.status} - ${errorText}`)
        }

        // Stream the response body chunks as they arrive
        // This reduces perceived latency with gpt-4o-mini-tts model
        log(`📡 Streaming audio response...`)
        const chunks: Uint8Array[] = []
        const reader = response.body?.getReader()

        if (!reader) {
          throw new Error('Response body stream not available')
        }

        let firstChunkTime: number | null = null
        let chunkCount = 0

        try {
          while (true) {
            const { done, value } = await reader.read()

            if (done) break

            if (firstChunkTime === null) {
              firstChunkTime = Date.now()
              const timeToFirstChunk = firstChunkTime - startTime
              log(`⚡ First chunk received in ${timeToFirstChunk}ms`)
            }

            chunks.push(value)
            chunkCount++
          }
        } finally {
          reader.releaseLock()
        }

        // Combine all chunks into a single buffer
        const totalLength = chunks.reduce((acc, chunk) => acc + chunk.length, 0)
        const audioBuffer = Buffer.concat(
          chunks.map((chunk) => Buffer.from(chunk)),
          totalLength
        )

        const duration = Date.now() - startTime

        log(`✅ TTS generated successfully`)
        log(`  Buffer size: ${audioBuffer.length} bytes`)
        log(`  Total duration: ${duration}ms`)
        log(`  Chunks received: ${chunkCount}`)
        if (firstChunkTime) {
          log(`  Time to first chunk: ${firstChunkTime - startTime}ms`)
        }
        if (attempt > 1) {
          log(`  (succeeded on attempt ${attempt})`)
        }

        return audioBuffer
      } catch (error) {
        // If it's the last attempt or a non-retryable error, throw
        if (
          attempt === maxRetries ||
          (error instanceof Error && !error.message.includes('500')) // Don't retry non-500 errors
        ) {
          log('❌ TTS generation failed after all retries:', error)
          throw error
        }

        // Otherwise, wait and retry
        const delay = retryDelay * Math.pow(2, attempt - 1)
        log(`⏳ Error occurred, waiting ${delay}ms before retry...`)
        await new Promise((resolve) => setTimeout(resolve, delay))
      }
    }

    // Should never reach here, but TypeScript requires it
    throw new Error('TTS generation failed: max retries exceeded')
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
