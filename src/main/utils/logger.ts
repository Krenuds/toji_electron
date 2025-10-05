// Unified logging system for Toji3
import { writeFileSync, appendFileSync, existsSync, mkdirSync } from 'fs'
import { join } from 'path'
import { app } from 'electron'

type LogLevel = 'debug' | 'info' | 'warn' | 'error'

interface LogEntry {
  timestamp: string
  level: LogLevel
  namespace: string
  message: string
  data?: unknown
}

// ANSI color codes for console
const colors = {
  reset: '\x1b[0m',
  dim: '\x1b[2m',
  cyan: '\x1b[36m',
  green: '\x1b[32m',
  yellow: '\x1b[33m',
  red: '\x1b[31m',
  magenta: '\x1b[35m',
  blue: '\x1b[34m',
  brightBlue: '\x1b[94m',
  orange: '\x1b[38;5;208m'
}

// Namespace color mapping
const namespaceColors: Record<string, string> = {
  'toji:': colors.cyan,
  'discord:': colors.magenta,
  'mcp:': colors.blue,
  voice: colors.green,
  whisper: colors.green,
  piper: colors.green,
  docker: colors.green
}

function getNamespaceColor(namespace: string): string {
  for (const [prefix, color] of Object.entries(namespaceColors)) {
    if (namespace.startsWith(prefix) || namespace.includes(prefix)) {
      return color
    }
  }
  return colors.dim
}

class LoggerImpl {
  private logDir: string
  private logFile: string
  private initialized = false
  private minLevel: LogLevel = 'debug'

  constructor() {
    this.logDir = join(app.getPath('userData'), 'logs')
    this.logFile = join(this.logDir, `toji-${new Date().toISOString().split('T')[0]}.log`)
  }

  initialize(): void {
    if (this.initialized) return

    if (!existsSync(this.logDir)) {
      mkdirSync(this.logDir, { recursive: true })
    }

    // In debug mode, clear the log file on startup for ephemeral logs
    if (this.minLevel === 'debug') {
      writeFileSync(this.logFile, `=== Toji3 Log - ${new Date().toISOString()} ===\n`)
    } else if (!existsSync(this.logFile)) {
      // In production modes (info/warn/error), append to existing log
      writeFileSync(this.logFile, `=== Toji3 Log - ${new Date().toISOString()} ===\n`)
    }

    this.initialized = true
  }

  private shouldLog(level: LogLevel): boolean {
    const levels: LogLevel[] = ['debug', 'info', 'warn', 'error']
    return levels.indexOf(level) >= levels.indexOf(this.minLevel)
  }

  private formatTimestamp(isoString: string): string {
    const date = new Date(isoString)
    return Math.floor(date.getTime() / 1000).toString()
  }

  private formatMessage(entry: LogEntry, forConsole = false): string {
    const timestamp = this.formatTimestamp(entry.timestamp)
    const dataStr = entry.data !== undefined ? ` ${JSON.stringify(entry.data)}` : ''

    // Plain text for file
    if (!forConsole) {
      return `[${timestamp}] ${entry.level.toUpperCase().padEnd(5)} ${entry.namespace}: ${entry.message}${dataStr}`
    }

    // Colorized for console (no emojis)
    const levelColor = {
      debug: colors.green,
      info: colors.brightBlue,
      warn: colors.yellow,
      error: colors.red
    }[entry.level]

    const namespaceColor = getNamespaceColor(entry.namespace)
    const timestampColored = `${colors.dim}[${timestamp}]${colors.reset}`
    const levelColored = `${levelColor}${entry.level.toUpperCase().padEnd(5)}${colors.reset}`
    const namespaceColored = `${namespaceColor}${entry.namespace}${colors.reset}`

    return `${timestampColored} ${levelColored} ${namespaceColored}: ${entry.message}${dataStr}`
  }

  write(level: LogLevel, namespace: string, message: string, data?: unknown): void {
    if (!this.shouldLog(level)) return

    if (!this.initialized) {
      this.initialize()
    }

    const entry: LogEntry = {
      timestamp: new Date().toISOString(),
      level,
      namespace,
      message,
      data
    }

    // Console output (colorized)
    const formattedConsole = this.formatMessage(entry, true)
    if (level === 'error') {
      console.error(formattedConsole)
    } else if (level === 'warn') {
      console.warn(formattedConsole)
    } else {
      console.log(formattedConsole)
    }

    // File output (plain text)
    const formattedFile = this.formatMessage(entry, false)
    try {
      appendFileSync(this.logFile, formattedFile + '\n')
    } catch (error) {
      console.error('Failed to write to log file:', error)
    }
  }

  getLogPath(): string {
    return this.logFile
  }

  getLogDir(): string {
    return this.logDir
  }
}

// Singleton
const loggerImpl = new LoggerImpl()

/**
 * Logger instance with namespace - this is what you use everywhere
 */
export class Logger {
  constructor(private namespace: string) {}

  private formatArgs(...args: unknown[]): { message: string; data?: unknown } {
    if (args.length === 0) return { message: '' }
    if (args.length === 1) return { message: String(args[0]) }
    if (args.length === 2) return { message: String(args[0]), data: args[1] }

    // Handle multiple arguments - join them into message
    const message = args.map((a) => String(a)).join(' ')
    return { message }
  }

  debug(...args: unknown[]): void {
    const { message, data } = this.formatArgs(...args)
    loggerImpl.write('debug', this.namespace, message, data)
  }

  info(...args: unknown[]): void {
    const { message, data } = this.formatArgs(...args)
    loggerImpl.write('info', this.namespace, message, data)
  }

  warn(...args: unknown[]): void {
    const { message, data } = this.formatArgs(...args)
    loggerImpl.write('warn', this.namespace, message, data)
  }

  error(...args: unknown[]): void {
    const { message, data } = this.formatArgs(...args)
    loggerImpl.write('error', this.namespace, message, data)
  }

  // Convenience alias for compatibility
  log(...args: unknown[]): void {
    const { message, data } = this.formatArgs(...args)
    this.info(message, data)
  }
}

/**
 * Create a logger for a specific namespace
 * Usage: const logger = createLogger('toji:core')
 */
export function createLogger(namespace: string): Logger {
  return new Logger(namespace)
}

/**
 * Initialize logging system - call once at startup
 */
export function initializeFileLogging(): void {
  loggerImpl.initialize()
}

/**
 * Get the current log file path
 */
export function getLogPath(): string {
  return loggerImpl.getLogPath()
}

/**
 * Get the logs directory path
 */
export function getLogDir(): string {
  return loggerImpl.getLogDir()
}

// Legacy compatibility - will be removed after migration
export { createLogger as createFileDebugLogger }
