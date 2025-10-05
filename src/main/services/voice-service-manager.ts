/**
 * Voice Service Manager - Orchestrates Docker services and HTTP clients for voice features
 * Provides high-level API for voice transcription and text-to-speech
 */

import { createLogger } from '../utils/logger'
import { DockerServiceManager, DockerMode } from './docker-service-manager'
import { WhisperClient, type TranscriptionResult } from './whisper-client'
import { PiperClient, type TTSRequest } from './piper-client'

const logger = createLogger('voice-service-manager')

export interface VoiceServiceStatus {
  available: boolean
  dockerInstalled: boolean
  dockerMode: DockerMode
  whisperHealthy: boolean
  piperHealthy: boolean
  error?: string
}

export class VoiceServiceManager {
  private dockerManager: DockerServiceManager
  private whisperClient: WhisperClient
  private piperClient: PiperClient
  private initialized = false

  constructor() {
    this.dockerManager = new DockerServiceManager()
    this.whisperClient = new WhisperClient()
    this.piperClient = new PiperClient()
    logger.debug('VoiceServiceManager created')
  }

  /**
   * Initialize the voice services
   * Checks Docker, starts services if needed
   */
  async initialize(onProgress?: (message: string) => void): Promise<VoiceServiceStatus> {
    logger.debug('Initializing voice services...')
    onProgress?.('Checking Docker installation...')

    // Check if Docker is installed
    const dockerInstalled = await this.dockerManager.checkDockerInstalled()

    if (!dockerInstalled) {
      logger.debug('Docker not installed, voice features unavailable')
      this.initialized = false
      return {
        available: false,
        dockerInstalled: false,
        dockerMode: DockerMode.NOT_INSTALLED,
        whisperHealthy: false,
        piperHealthy: false,
        error: 'Docker not installed'
      }
    }

    // Check if Docker Compose is available
    const composeAvailable = await this.dockerManager.checkDockerCompose()
    if (!composeAvailable) {
      logger.debug('Docker Compose not available')
      this.initialized = false
      return {
        available: false,
        dockerInstalled: true,
        dockerMode: DockerMode.ERROR,
        whisperHealthy: false,
        piperHealthy: false,
        error: 'Docker Compose not available'
      }
    }

    try {
      // Start services (will build if needed, will skip if already running)
      onProgress?.('Starting voice services...')
      await this.dockerManager.startServices(onProgress)

      // Verify services are healthy
      const health = await this.dockerManager.getServiceHealth()

      if (!health.whisper.healthy || !health.piper.healthy) {
        logger.debug('Services started but not healthy')
        this.initialized = false
        return {
          available: false,
          dockerInstalled: true,
          dockerMode: this.dockerManager.getMode(),
          whisperHealthy: health.whisper.healthy,
          piperHealthy: health.piper.healthy,
          error: 'Services not healthy'
        }
      }

      // Update client URLs based on service URLs
      const urls = this.dockerManager.getServiceUrls()
      this.whisperClient.setBaseUrl(urls.whisper)
      this.piperClient.setBaseUrl(urls.piper)

      this.initialized = true
      logger.debug('✅ Voice services initialized and ready')
      onProgress?.('Voice services ready!')

      return {
        available: true,
        dockerInstalled: true,
        dockerMode: DockerMode.RUNNING,
        whisperHealthy: true,
        piperHealthy: true
      }
    } catch (error) {
      logger.debug('Failed to initialize services:', error)
      this.initialized = false
      return {
        available: false,
        dockerInstalled: true,
        dockerMode: DockerMode.ERROR,
        whisperHealthy: false,
        piperHealthy: false,
        error: error instanceof Error ? error.message : 'Unknown error'
      }
    }
  }

  /**
   * Transcribe audio to text
   * @param audioBuffer - Audio data (WAV format, 16kHz mono recommended)
   * @returns Transcription result
   */
  async transcribe(audioBuffer: Buffer): Promise<TranscriptionResult> {
    if (!this.initialized) {
      return {
        text: '',
        error: 'Voice services not initialized'
      }
    }

    try {
      return await this.whisperClient.transcribe(audioBuffer)
    } catch (error) {
      logger.debug('Transcription failed:', error)
      return {
        text: '',
        error: error instanceof Error ? error.message : 'Unknown error'
      }
    }
  }

  /**
   * Convert text to speech
   * @param request - TTS request with text and options
   * @returns Audio buffer (WAV format)
   */
  async speak(request: TTSRequest): Promise<Buffer | null> {
    if (!this.initialized) {
      logger.debug('Cannot speak: services not initialized')
      return null
    }

    try {
      return await this.piperClient.synthesize(request)
    } catch (error) {
      logger.debug('TTS failed:', error)
      return null
    }
  }

  /**
   * Get current status of voice services
   */
  async getStatus(): Promise<VoiceServiceStatus> {
    const dockerInstalled = await this.dockerManager.checkDockerInstalled()

    if (!dockerInstalled) {
      return {
        available: false,
        dockerInstalled: false,
        dockerMode: DockerMode.NOT_INSTALLED,
        whisperHealthy: false,
        piperHealthy: false
      }
    }

    const health = await this.dockerManager.getServiceHealth()
    const mode = this.dockerManager.getMode()

    return {
      available: this.initialized && health.whisper.healthy && health.piper.healthy,
      dockerInstalled: true,
      dockerMode: mode,
      whisperHealthy: health.whisper.healthy,
      piperHealthy: health.piper.healthy
    }
  }

  /**
   * Check if voice services are available
   */
  isAvailable(): boolean {
    return this.initialized
  }

  /**
   * Stop voice services
   */
  async stop(): Promise<void> {
    logger.debug('Stopping voice services...')
    await this.dockerManager.stopServices()
    this.initialized = false
  }

  /**
   * Restart voice services
   */
  async restart(onProgress?: (message: string) => void): Promise<VoiceServiceStatus> {
    logger.debug('Restarting voice services...')
    await this.stop()
    return await this.initialize(onProgress)
  }

  /**
   * Get list of available TTS voices
   */
  async listVoices(): Promise<import('./piper-client').VoiceInfo[]> {
    if (!this.initialized) {
      return []
    }
    return await this.piperClient.listVoices()
  }

  /**
   * Set default TTS voice
   */
  setDefaultVoice(voice: string): void {
    this.piperClient.setDefaultVoice(voice)
  }

  /**
   * Get Docker build state
   */
  getBuildState(): import('./docker-service-manager').BuildState {
    return this.dockerManager.getBuildState()
  }

  /**
   * Reset build state (force rebuild on next start)
   */
  async resetBuildState(): Promise<void> {
    await this.dockerManager.resetBuildState()
  }

  /**
   * Cleanup when app closes
   */
  async cleanup(): Promise<void> {
    await this.dockerManager.cleanup()
  }
}

// Singleton instance
let voiceServiceManager: VoiceServiceManager | null = null

/**
 * Get the singleton VoiceServiceManager instance
 */
export function getVoiceServiceManager(): VoiceServiceManager {
  if (!voiceServiceManager) {
    voiceServiceManager = new VoiceServiceManager()
  }
  return voiceServiceManager
}

/**
 * Reset the singleton instance (for testing)
 */
export function resetVoiceServiceManager(): void {
  voiceServiceManager = null
}
