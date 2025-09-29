import * as path from 'path'
import { homedir } from 'os'
import { join } from 'path'

/**
 * Get the full path to the OpenCode binary
 */
export function getOpenCodeBinaryPath(): string {
  const binaryName = process.platform === 'win32' ? 'opencode.exe' : 'opencode'
  return join(homedir(), '.local', 'share', 'opencode', 'bin', binaryName)
}

/**
 * Get the OpenCode bin directory path
 */
export function getOpenCodeBinDir(): string {
  return join(homedir(), '.local', 'share', 'opencode', 'bin')
}

/**
 * Normalize paths for consistent comparison across Windows and Unix systems
 * Handles the chaos of OpenCode returning different path formats
 */
export function normalizePath(inputPath: string): string {
  if (!inputPath) return ''

  // Resolve to absolute path
  let normalized = path.resolve(inputPath)

  // Convert all backslashes to forward slashes for consistent comparison
  normalized = normalized.replace(/\\/g, '/')

  // Remove any trailing slashes (but keep root slash)
  if (normalized.length > 1 && normalized.endsWith('/')) {
    normalized = normalized.slice(0, -1)
  }

  // Handle Windows drive letters - ensure uppercase
  if (normalized.match(/^[a-z]:/)) {
    normalized = normalized[0].toUpperCase() + normalized.slice(1)
  }

  return normalized
}

/**
 * Compare two paths for equality after normalization
 */
export function pathsAreEqual(path1: string, path2: string): boolean {
  if (!path1 || !path2) return false
  return normalizePath(path1) === normalizePath(path2)
}

/**
 * Check if a path is under another path (subdirectory check)
 */
export function isSubdirectory(child: string, parent: string): boolean {
  const normalizedChild = normalizePath(child)
  const normalizedParent = normalizePath(parent)

  if (normalizedChild === normalizedParent) return true
  return normalizedChild.startsWith(normalizedParent + '/')
}

/**
 * Extract project name from path
 */
export function getProjectName(projectPath: string): string {
  const normalized = normalizePath(projectPath)
  const parts = normalized.split('/')
  return parts[parts.length - 1] || normalized
}
