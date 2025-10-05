/**
 * Whisper STT Client - HTTP client for Whisper speech-to-text service
 * Follows the pattern from Python's stt_client.py
 */

import { createLogger } from '../utils/logger'

const logger = createLogger('whisper-client')

export interface TranscriptionResult {
  text: string
  error?: string
  duration?: number
}

export interface TranscriptionOptions {
  language?: string
  model?: string
}

export class WhisperClient {
  private baseUrl: string

  constructor(baseUrl: string = 'http://localhost:9000') {
    this.baseUrl = baseUrl
    logger.debug('WhisperClient initialized with URL:', baseUrl)
  }

  /**
   * Transcribe audio to text
   * @param audioData - WAV audio buffer (16kHz mono recommended)
   * @param options - Optional transcription parameters
   */
  async transcribe(
    audioData: Buffer,
    options: TranscriptionOptions = {}
  ): Promise<TranscriptionResult> {
    const startTime = Date.now()
    logger.debug(`Transcribing ${audioData.length} bytes of audio...`)

    try {
      const formData = new FormData()

      // Create a Blob from the Buffer for the FormData
      // Convert Buffer to Uint8Array for Blob compatibility
      const audioBlob = new Blob([new Uint8Array(audioData)], { type: 'audio/wav' })
      // FastAPI expects 'audio_file' field name
      formData.append('audio_file', audioBlob, 'audio.wav')

      // Add optional parameters
      if (options.language) {
        formData.append('language', options.language)
      }

      const response = await fetch(`${this.baseUrl}/asr`, {
        method: 'POST',
        body: formData,
        signal: AbortSignal.timeout(30000) // 30 second timeout
      })

      if (!response.ok) {
        const errorText = await response.text()
        logger.debug('Transcription failed:', response.status, errorText)
        return {
          text: '',
          error: `HTTP ${response.status}: ${errorText}`
        }
      }

      const result = (await response.json()) as { text: string }
      const duration = Date.now() - startTime

      logger.debug(`Transcription complete in ${duration}ms: "${result.text}"`)

      // Filter out Whisper hallucinations (repeated characters)
      const text = result.text || ''
      if (text && text.length > 0) {
        // Check for hallucinations (e.g., "aaaaaaa" or "...")
        const uniqueChars = new Set(text.replace(/\s/g, ''))
        if (uniqueChars.size <= 2) {
          logger.debug('Detected hallucination (repeated characters), filtering out:', text)
          return {
            text: '',
            error: 'Hallucination detected',
            duration
          }
        }
      }

      return {
        text,
        duration
      }
    } catch (error) {
      const duration = Date.now() - startTime
      logger.debug('Transcription error:', error)

      if (error instanceof Error) {
        return {
          text: '',
          error: error.message,
          duration
        }
      }

      return {
        text: '',
        error: 'Unknown error',
        duration
      }
    }
  }

  /**
   * Check if the Whisper service is healthy
   */
  async checkHealth(): Promise<boolean> {
    try {
      const response = await fetch(`${this.baseUrl}/health`, {
        signal: AbortSignal.timeout(5000)
      })
      return response.ok
    } catch (error) {
      logger.debug('Health check failed:', error)
      return false
    }
  }

  /**
   * Get service information
   */
  async getInfo(): Promise<Record<string, unknown> | null> {
    try {
      const response = await fetch(`${this.baseUrl}/info`, {
        signal: AbortSignal.timeout(5000)
      })

      if (!response.ok) {
        return null
      }

      return (await response.json()) as Record<string, unknown>
    } catch (error) {
      logger.debug('Failed to get service info:', error)
      return null
    }
  }

  /**
   * Update the base URL for the service
   */
  setBaseUrl(url: string): void {
    this.baseUrl = url
    logger.debug('Base URL updated to:', url)
  }

  /**
   * Get the current base URL
   */
  getBaseUrl(): string {
    return this.baseUrl
  }
}
