/**
 * Audio Processing Utilities
 * Based on Python's audio_processor.py from toji-services
 * Handles stereo→mono conversion, resampling, and WAV wrapping
 */

import { createLogger } from '../utils/logger'

const logger = createLogger('audio-processor')

/**
 * Convert stereo PCM audio to mono by averaging channels
 * @param stereoData - Interleaved stereo PCM data (16-bit signed)
 * @returns Mono PCM data
 */
export function stereoToMono(stereoData: Buffer): Buffer {
  // Each sample is 2 bytes (16-bit), stereo has 2 channels (4 bytes per sample pair)
  // Ensure we only process complete sample pairs
  const stereoBytes = Math.floor(stereoData.length / 4) * 4
  const sampleCount = stereoBytes / 4 // Total stereo samples (L+R pairs)
  const monoData = Buffer.allocUnsafe(sampleCount * 2) // Mono is half the size

  for (let i = 0; i < sampleCount; i++) {
    // Read left and right channels (16-bit signed integers)
    const left = stereoData.readInt16LE(i * 4)
    const right = stereoData.readInt16LE(i * 4 + 2)

    // Average the channels
    const mono = Math.round((left + right) / 2)

    // Write mono sample
    monoData.writeInt16LE(mono, i * 2)
  }

  logger.debug(`Converted stereo (${stereoData.length} bytes) to mono (${monoData.length} bytes)`)
  return monoData
}

/**
 * Resample audio by taking every Nth sample (simple decimation)
 * Discord sends 48kHz, Whisper wants 16kHz, so we take every 3rd sample
 * @param pcmData - PCM audio data
 * @param fromRate - Source sample rate (Hz)
 * @param toRate - Target sample rate (Hz)
 * @returns Resampled PCM data
 */
export function resample(pcmData: Buffer, fromRate: number, toRate: number): Buffer {
  if (fromRate === toRate) {
    return pcmData
  }

  const ratio = fromRate / toRate
  const sampleSize = 2 // 16-bit = 2 bytes
  const inputSamples = pcmData.length / sampleSize
  const outputSamples = Math.floor(inputSamples / ratio)
  const outputData = Buffer.allocUnsafe(outputSamples * sampleSize)

  for (let i = 0; i < outputSamples; i++) {
    const sourceIndex = Math.floor(i * ratio)
    const sample = pcmData.readInt16LE(sourceIndex * sampleSize)
    outputData.writeInt16LE(sample, i * sampleSize)
  }

  logger.debug(
    `Resampled ${fromRate}Hz → ${toRate}Hz (${pcmData.length} → ${outputData.length} bytes)`
  )
  return outputData
}

/**
 * Wrap PCM audio data in WAV format with resampling
 * @param pcmData - Raw PCM audio data (16-bit signed)
 * @param sampleRate - Source sample rate (Hz)
 * @param targetRate - Target sample rate (Hz) - defaults to 16000 for Whisper
 * @param channels - Number of channels (1 for mono, 2 for stereo)
 * @returns WAV audio buffer
 */
export function pcmToWav(
  pcmData: Buffer,
  sampleRate: number,
  targetRate: number = 16000,
  channels: number = 1
): Buffer {
  // Resample if needed
  const resampledData = resample(pcmData, sampleRate, targetRate)

  const bitsPerSample = 16
  const byteRate = (targetRate * channels * bitsPerSample) / 8
  const blockAlign = (channels * bitsPerSample) / 8
  const dataSize = resampledData.length

  // WAV header is 44 bytes
  const header = Buffer.alloc(44)

  // RIFF chunk descriptor
  header.write('RIFF', 0)
  header.writeUInt32LE(36 + dataSize, 4) // File size - 8
  header.write('WAVE', 8)

  // fmt sub-chunk
  header.write('fmt ', 12)
  header.writeUInt32LE(16, 16) // Subchunk size
  header.writeUInt16LE(1, 20) // Audio format (1 = PCM)
  header.writeUInt16LE(channels, 22)
  header.writeUInt32LE(targetRate, 24)
  header.writeUInt32LE(byteRate, 28)
  header.writeUInt16LE(blockAlign, 32)
  header.writeUInt16LE(bitsPerSample, 34)

  // data sub-chunk
  header.write('data', 36)
  header.writeUInt32LE(dataSize, 40)

  // Concatenate header and audio data
  const wavBuffer = Buffer.concat([header, resampledData])

  logger.debug(
    `Created WAV: ${targetRate}Hz, ${channels}ch, ${bitsPerSample}-bit, ${wavBuffer.length} bytes`
  )
  return wavBuffer
}

/**
 * Trim silence from the beginning and end of audio
 * Uses energy-based detection
 * @param pcmData - PCM audio data (16-bit signed)
 * @param threshold - Energy threshold (0-1, default 0.005)
 * @returns Trimmed PCM data
 */
export function trimSilence(pcmData: Buffer, threshold: number = 0.005): Buffer {
  const sampleSize = 2
  const sampleCount = pcmData.length / sampleSize

  if (sampleCount === 0) {
    return pcmData
  }

  // Find max amplitude for normalization
  let maxAmplitude = 0
  for (let i = 0; i < sampleCount; i++) {
    const sample = Math.abs(pcmData.readInt16LE(i * sampleSize))
    if (sample > maxAmplitude) {
      maxAmplitude = sample
    }
  }

  if (maxAmplitude === 0) {
    logger.debug('Audio is silent, returning empty buffer')
    return Buffer.alloc(0)
  }

  const energyThreshold = maxAmplitude * threshold

  // Find start (first sample above threshold)
  let start = 0
  for (let i = 0; i < sampleCount; i++) {
    const sample = Math.abs(pcmData.readInt16LE(i * sampleSize))
    if (sample > energyThreshold) {
      start = i
      break
    }
  }

  // Find end (last sample above threshold)
  let end = sampleCount - 1
  for (let i = sampleCount - 1; i >= 0; i--) {
    const sample = Math.abs(pcmData.readInt16LE(i * sampleSize))
    if (sample > energyThreshold) {
      end = i
      break
    }
  }

  if (start >= end) {
    logger.debug('No speech detected in audio')
    return Buffer.alloc(0)
  }

  const trimmedData = pcmData.subarray(start * sampleSize, (end + 1) * sampleSize)
  logger.debug(`Trimmed silence: ${pcmData.length} → ${trimmedData.length} bytes`)
  return trimmedData
}

/**
 * Get duration of PCM audio in seconds
 * @param pcmData - PCM audio data
 * @param sampleRate - Sample rate (Hz)
 * @param channels - Number of channels
 * @returns Duration in seconds
 */
export function getAudioDuration(
  pcmData: Buffer,
  sampleRate: number,
  channels: number = 1
): number {
  const sampleSize = 2 // 16-bit
  const totalSamples = pcmData.length / sampleSize / channels
  return totalSamples / sampleRate
}

/**
 * Process Discord audio for Whisper transcription
 * Complete pipeline: stereo→mono, resample, trim, wrap in WAV
 * @param stereoData - Raw stereo PCM from Discord (48kHz, 16-bit)
 * @param minDuration - Minimum duration in seconds (default 1.0)
 * @returns Object with WAV data and duration, or null if too short
 */
export function processDiscordAudio(
  pcmData: Buffer,
  minDuration: number = 1.0
): { wavData: Buffer; duration: number } | null {
  if (pcmData.length === 0) {
    return null
  }

  logger.debug(`Processing Discord audio: ${pcmData.length} bytes`)

  // 1. Convert stereo to mono
  const monoData = stereoToMono(pcmData)

  // 2. Trim silence
  const trimmedData = trimSilence(monoData, 0.005)

  if (trimmedData.length === 0) {
    logger.debug('Audio is empty after silence trimming')
    return null
  }

  // 3. Check duration (at original 48kHz)
  const duration = getAudioDuration(trimmedData, 48000, 1)
  logger.debug(`Audio duration: ${duration.toFixed(2)}s`)

  if (duration < minDuration) {
    logger.debug(`Audio too short (${duration.toFixed(2)}s < ${minDuration}s)`)
    return null
  }

  // 4. Wrap in WAV with resampling to 16kHz for Whisper
  const wavData = pcmToWav(trimmedData, 48000, 16000, 1)

  logger.debug(`Processed audio ready: ${wavData.length} bytes, ${duration.toFixed(2)}s`)
  return { wavData, duration }
}
