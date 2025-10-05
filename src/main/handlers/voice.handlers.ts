/**
 * Voice Handlers - IPC handlers for voice service management
 */

import { ipcMain } from 'electron'
import { createLogger } from '../utils/logger'
import { getVoiceServiceManager } from '../services/voice-service-manager'
import type { VoiceServiceStatus } from '../services/voice-service-manager'
import type { TranscriptionResult } from '../services/whisper-client'
import type { VoiceInfo } from '../services/piper-client'

const logger = createLogger('voice-handlers')

/**
 * Register all voice-related IPC handlers
 */
export function registerVoiceHandlers(): void {
  logger.debug('Registering voice IPC handlers...')

  // Initialize voice services
  ipcMain.handle('voice:initialize', async (_event, onProgress?: boolean) => {
    try {
      const manager = getVoiceServiceManager()

      if (onProgress) {
        // Send progress updates to renderer
        const progressCallback = (message: string): void => {
          _event.sender.send('voice:progress', message)
        }
        return await manager.initialize(progressCallback)
      }

      return await manager.initialize()
    } catch (error) {
      logger.debug('Error initializing voice services:', error)
      return {
        available: false,
        dockerInstalled: false,
        dockerMode: 'error',
        whisperHealthy: false,
        piperHealthy: false,
        error: error instanceof Error ? error.message : 'Unknown error'
      } as VoiceServiceStatus
    }
  })

  // Get voice service status
  ipcMain.handle('voice:status', async () => {
    try {
      const manager = getVoiceServiceManager()
      return await manager.getStatus()
    } catch (error) {
      logger.debug('Error getting voice status:', error)
      return {
        available: false,
        dockerInstalled: false,
        dockerMode: 'error',
        whisperHealthy: false,
        piperHealthy: false,
        error: error instanceof Error ? error.message : 'Unknown error'
      } as VoiceServiceStatus
    }
  })

  // Check if voice services are available
  ipcMain.handle('voice:isAvailable', () => {
    const manager = getVoiceServiceManager()
    return manager.isAvailable()
  })

  // Transcribe audio
  ipcMain.handle('voice:transcribe', async (_event, audioBuffer: Buffer) => {
    try {
      const manager = getVoiceServiceManager()
      return await manager.transcribe(audioBuffer)
    } catch (error) {
      logger.debug('Error transcribing audio:', error)
      return {
        text: '',
        error: error instanceof Error ? error.message : 'Unknown error'
      } as TranscriptionResult
    }
  })

  // Text to speech
  ipcMain.handle('voice:speak', async (_event, text: string, voice?: string, speed?: number) => {
    try {
      const manager = getVoiceServiceManager()
      const audioBuffer = await manager.speak({ text, voice, speed })

      if (!audioBuffer) {
        return null
      }

      // Convert Buffer to Uint8Array for transfer
      return new Uint8Array(audioBuffer)
    } catch (error) {
      logger.debug('Error generating speech:', error)
      return null
    }
  })

  // List available voices
  ipcMain.handle('voice:listVoices', async () => {
    try {
      const manager = getVoiceServiceManager()
      return await manager.listVoices()
    } catch (error) {
      logger.debug('Error listing voices:', error)
      return [] as VoiceInfo[]
    }
  })

  // Set default voice
  ipcMain.handle('voice:setDefaultVoice', (_event, voice: string) => {
    try {
      const manager = getVoiceServiceManager()
      manager.setDefaultVoice(voice)
      return true
    } catch (error) {
      logger.debug('Error setting default voice:', error)
      return false
    }
  })

  // Stop voice services
  ipcMain.handle('voice:stop', async () => {
    try {
      const manager = getVoiceServiceManager()
      await manager.stop()
      return true
    } catch (error) {
      logger.debug('Error stopping voice services:', error)
      return false
    }
  })

  // Restart voice services
  ipcMain.handle('voice:restart', async (_event, withProgress?: boolean) => {
    try {
      const manager = getVoiceServiceManager()

      if (withProgress) {
        const progressCallback = (message: string): void => {
          _event.sender.send('voice:progress', message)
        }
        return await manager.restart(progressCallback)
      }

      return await manager.restart()
    } catch (error) {
      logger.debug('Error restarting voice services:', error)
      return {
        available: false,
        dockerInstalled: false,
        dockerMode: 'error',
        whisperHealthy: false,
        piperHealthy: false,
        error: error instanceof Error ? error.message : 'Unknown error'
      } as VoiceServiceStatus
    }
  })

  // Get build state
  ipcMain.handle('voice:getBuildState', () => {
    try {
      const manager = getVoiceServiceManager()
      return manager.getBuildState()
    } catch (error) {
      logger.debug('Error getting build state:', error)
      return { imagesBuilt: false }
    }
  })

  // Reset build state
  ipcMain.handle('voice:resetBuildState', async () => {
    try {
      const manager = getVoiceServiceManager()
      await manager.resetBuildState()
      return true
    } catch (error) {
      logger.debug('Error resetting build state:', error)
      return false
    }
  })

  logger.debug('Voice IPC handlers registered')
}

/**
 * Cleanup voice services on app quit
 */
export async function cleanupVoiceServices(): Promise<void> {
  try {
    const manager = getVoiceServiceManager()
    await manager.cleanup()
    logger.debug('Voice services cleaned up')
  } catch (error) {
    logger.debug('Error cleaning up voice services:', error)
  }
}
