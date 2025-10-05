/**
 * Piper TTS Client - HTTP client for Piper text-to-speech service
 * Follows the pattern from Python's tts_client.py
 */

import { createFileDebugLogger } from '../utils/logger'

const log = createFileDebugLogger('piper-client')

export interface TTSRequest {
  text: string
  voice?: string
  speed?: number
}

export interface VoiceInfo {
  name: string
  language: string
  speaker: string
  quality: string
  sample_rate: number
  gender: string
  file_size_mb?: number
  available: boolean
}

export class PiperClient {
  private baseUrl: string
  private defaultVoice?: string

  constructor(baseUrl: string = 'http://localhost:9001', defaultVoice?: string) {
    this.baseUrl = baseUrl
    this.defaultVoice = defaultVoice
    log('PiperClient initialized with URL:', baseUrl)
    if (defaultVoice) {
      log('Default voice:', defaultVoice)
    }
  }

  /**
   * Convert text to speech
   * @param request - TTS request with text and optional parameters
   * @returns WAV audio buffer
   */
  async synthesize(request: TTSRequest): Promise<Buffer> {
    const startTime = Date.now()
    const { text, voice, speed = 1.0 } = request

    log(`Synthesizing ${text.length} characters of text...`)

    try {
      const body = {
        text,
        voice: voice || this.defaultVoice,
        speed
      }

      const response = await fetch(`${this.baseUrl}/tts`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify(body),
        signal: AbortSignal.timeout(30000) // 30 second timeout
      })

      if (!response.ok) {
        const errorText = await response.text()
        log('TTS failed:', response.status, errorText)
        throw new Error(`HTTP ${response.status}: ${errorText}`)
      }

      const audioBuffer = Buffer.from(await response.arrayBuffer())
      const duration = Date.now() - startTime

      log(`Synthesis complete in ${duration}ms, ${audioBuffer.length} bytes`)

      return audioBuffer
    } catch (error) {
      const duration = Date.now() - startTime
      log('TTS error after', duration, 'ms:', error)
      throw error
    }
  }

  /**
   * List available voices
   */
  async listVoices(): Promise<VoiceInfo[]> {
    try {
      const response = await fetch(`${this.baseUrl}/voices`, {
        signal: AbortSignal.timeout(5000)
      })

      if (!response.ok) {
        log('Failed to list voices:', response.status)
        return []
      }

      const voices = (await response.json()) as VoiceInfo[]
      log(`Found ${voices.length} available voices`)
      return voices
    } catch (error) {
      log('Error listing voices:', error)
      return []
    }
  }

  /**
   * Check if the Piper service is healthy
   */
  async checkHealth(): Promise<boolean> {
    try {
      const response = await fetch(`${this.baseUrl}/health`, {
        signal: AbortSignal.timeout(5000)
      })
      return response.ok
    } catch (error) {
      log('Health check failed:', error)
      return false
    }
  }

  /**
   * Get service information
   */
  async getInfo(): Promise<Record<string, unknown> | null> {
    try {
      const response = await fetch(`${this.baseUrl}/`, {
        signal: AbortSignal.timeout(5000)
      })

      if (!response.ok) {
        return null
      }

      return (await response.json()) as Record<string, unknown>
    } catch (error) {
      log('Failed to get service info:', error)
      return null
    }
  }

  /**
   * Download a new voice model (if service supports it)
   */
  async downloadVoice(voiceName: string): Promise<boolean> {
    try {
      log('Requesting download of voice:', voiceName)

      const response = await fetch(`${this.baseUrl}/download-voice`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({ voice_name: voiceName }),
        signal: AbortSignal.timeout(300000) // 5 minute timeout for downloads
      })

      if (!response.ok) {
        log('Voice download failed:', response.status)
        return false
      }

      log('Voice downloaded successfully:', voiceName)
      return true
    } catch (error) {
      log('Error downloading voice:', error)
      return false
    }
  }

  /**
   * Update the base URL for the service
   */
  setBaseUrl(url: string): void {
    this.baseUrl = url
    log('Base URL updated to:', url)
  }

  /**
   * Get the current base URL
   */
  getBaseUrl(): string {
    return this.baseUrl
  }

  /**
   * Set default voice
   */
  setDefaultVoice(voice: string): void {
    this.defaultVoice = voice
    log('Default voice set to:', voice)
  }

  /**
   * Get default voice
   */
  getDefaultVoice(): string | undefined {
    return this.defaultVoice
  }
}
