// File logging utility for Toji debug logs
import { writeFileSync, appendFileSync, existsSync, mkdirSync } from 'fs'
import { join } from 'path'
import { app } from 'electron'
import debug from 'debug'

class FileLogger {
  private logDir: string
  private logFile: string
  private initialized = false

  constructor() {
    // Create logs directory in user data
    this.logDir = join(app.getPath('userData'), 'logs')
    this.logFile = join(this.logDir, `toji-${new Date().toISOString().split('T')[0]}.log`)
  }

  initialize(): void {
    if (this.initialized) return

    // Ensure logs directory exists
    if (!existsSync(this.logDir)) {
      mkdirSync(this.logDir, { recursive: true })
    }

    // Create log file if it doesn't exist
    if (!existsSync(this.logFile)) {
      writeFileSync(this.logFile, `=== Toji3 Debug Log - ${new Date().toISOString()} ===\n`)
    }

    this.initialized = true
  }

  log(namespace: string, message: string): void {
    if (!this.initialized) {
      this.initialize()
    }

    const timestamp = new Date().toISOString()
    const logEntry = `[${timestamp}] ${namespace}: ${message}\n`

    try {
      appendFileSync(this.logFile, logEntry)
    } catch (error) {
      // Fallback to console if file write fails
      console.error('Failed to write to log file:', error)
      console.log(logEntry.trim())
    }
  }

  getLogPath(): string {
    return this.logFile
  }

  getLogDir(): string {
    return this.logDir
  }
}

// Singleton instance
const fileLogger = new FileLogger()

/**
 * Creates a debug logger that writes to both console and file
 */
export function createFileDebugLogger(namespace: string): debug.Debugger {
  const logger = debug(namespace)

  // Create a custom logger function that wraps the debug logger
  const customLogger = (...args: unknown[]) => {
    // Call original debug logging (console output)
    logger(...(args as [unknown, ...unknown[]]))

    // Also write to file with better formatting
    if (args.length > 0) {
      const [format, ...values] = args
      let message = String(format)

      // Simple substitution for common debug patterns
      if (typeof format === 'string' && values.length > 0) {
        let valueIndex = 0
        message = format.replace(/%[sdo]/g, () => {
          if (valueIndex < values.length) {
            const value = values[valueIndex++]
            return typeof value === 'object' ? JSON.stringify(value) : String(value)
          }
          return ''
        })
      }

      fileLogger.log(namespace, message)
    }
  }

  // Copy all properties from the original logger
  Object.setPrototypeOf(customLogger, Object.getPrototypeOf(logger))
  Object.defineProperty(customLogger, 'enabled', {
    get: () => logger.enabled
  })
  Object.defineProperty(customLogger, 'namespace', {
    get: () => logger.namespace
  })

  return customLogger as debug.Debugger
}

/**
 * Initialize file logging system
 */
export function initializeFileLogging(): void {
  fileLogger.initialize()
}

/**
 * Get the current log file path
 */
export function getLogPath(): string {
  return fileLogger.getLogPath()
}

/**
 * Get the logs directory path
 */
export function getLogDir(): string {
  return fileLogger.getLogDir()
}
