/**
 * Voice API - Preload API for voice service management
 */

import { ipcRenderer } from 'electron'

// Type imports - these will be bundled by electron-vite
export interface VoiceServiceStatus {
  available: boolean
  dockerInstalled: boolean
  dockerMode: string
  whisperHealthy: boolean
  piperHealthy: boolean
  error?: string
}

export interface TranscriptionResult {
  text: string
  error?: string
  duration?: number
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

export interface BuildState {
  imagesBuilt: boolean
  whisperImageId?: string
  piperImageId?: string
  lastBuildDate?: string
}

export const voiceApi = {
  /**
   * Initialize voice services
   * @param withProgress - Whether to receive progress updates
   */
  initialize: (withProgress?: boolean): Promise<VoiceServiceStatus> =>
    ipcRenderer.invoke('voice:initialize', withProgress),

  /**
   * Get current status of voice services
   */
  getStatus: (): Promise<VoiceServiceStatus> => ipcRenderer.invoke('voice:status'),

  /**
   * Check if voice services are available
   */
  isAvailable: (): Promise<boolean> => ipcRenderer.invoke('voice:isAvailable'),

  /**
   * Transcribe audio to text
   * @param audioBuffer - Audio data as Buffer
   */
  transcribe: (audioBuffer: Buffer): Promise<TranscriptionResult> =>
    ipcRenderer.invoke('voice:transcribe', audioBuffer),

  /**
   * Convert text to speech
   * @param text - Text to convert
   * @param voice - Optional voice name
   * @param speed - Optional speed multiplier
   */
  speak: (text: string, voice?: string, speed?: number): Promise<Uint8Array | null> =>
    ipcRenderer.invoke('voice:speak', text, voice, speed),

  /**
   * List available TTS voices
   */
  listVoices: (): Promise<VoiceInfo[]> => ipcRenderer.invoke('voice:listVoices'),

  /**
   * Set default TTS voice
   * @param voice - Voice name to use as default
   */
  setDefaultVoice: (voice: string): Promise<boolean> =>
    ipcRenderer.invoke('voice:setDefaultVoice', voice),

  /**
   * Stop voice services
   */
  stop: (): Promise<boolean> => ipcRenderer.invoke('voice:stop'),

  /**
   * Restart voice services
   * @param withProgress - Whether to receive progress updates
   */
  restart: (withProgress?: boolean): Promise<VoiceServiceStatus> =>
    ipcRenderer.invoke('voice:restart', withProgress),

  /**
   * Get Docker build state
   */
  getBuildState: (): Promise<BuildState> => ipcRenderer.invoke('voice:getBuildState'),

  /**
   * Reset build state (force rebuild on next start)
   */
  resetBuildState: (): Promise<boolean> => ipcRenderer.invoke('voice:resetBuildState'),

  /**
   * Listen for progress updates
   * @param callback - Function to call with progress messages
   */
  onProgress: (callback: (message: string) => void): (() => void) => {
    const handler = (_event: Electron.IpcRendererEvent, message: string): void => {
      callback(message)
    }
    ipcRenderer.on('voice:progress', handler)

    // Return cleanup function
    return () => {
      ipcRenderer.removeListener('voice:progress', handler)
    }
  }
}
