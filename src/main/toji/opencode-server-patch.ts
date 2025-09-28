import { spawn } from 'child_process'
import { join } from 'path'
import { homedir } from 'os'
import { existsSync } from 'fs'
import type { Config } from '@opencode-ai/sdk'

export interface ServerOptions {
  hostname?: string
  port?: number
  timeout?: number
  signal?: AbortSignal
  config?: Config
  cwd?: string // Add the missing cwd option
}

export async function createOpencodeServerWithCwd(options?: ServerOptions): Promise<{
  url: string
  close: () => void
}> {
  const opts = {
    hostname: '127.0.0.1',
    port: 4096,
    timeout: 10000, // Increased from 5s to 10s for slower systems
    cwd: process.cwd(), // Default to current working directory
    ...options
  }

  // Get the full path to the opencode binary
  const binaryName = process.platform === 'win32' ? 'opencode.exe' : 'opencode'
  const binaryPath = join(homedir(), '.local', 'share', 'opencode', 'bin', binaryName)

  // Verify binary exists
  if (!existsSync(binaryPath)) {
    throw new Error(`OpenCode binary not found at ${binaryPath}. Please ensure it is installed.`)
  }

  const proc = spawn(binaryPath, ['serve', `--hostname=${opts.hostname}`, `--port=${opts.port}`], {
    cwd: opts.cwd, // THIS IS THE KEY - Set the working directory!
    signal: opts.signal,
    env: {
      ...process.env,
      OPENCODE_CONFIG_CONTENT: JSON.stringify(opts.config ?? {})
    }
  })

  const url = await new Promise<string>((resolve, reject) => {
    const id = setTimeout(() => {
      reject(new Error(`Timeout waiting for server to start after ${opts.timeout}ms`))
    }, opts.timeout!)

    let output = ''
    proc.stdout?.on('data', (chunk) => {
      output += chunk.toString()
      const lines = output.split('\n')
      for (const line of lines) {
        if (line.startsWith('opencode server listening')) {
          const match = line.match(/on\s+(https?:\/\/[^\s]+)/)
          if (!match) {
            throw new Error(`Failed to parse server url from output: ${line}`)
          }
          clearTimeout(id)
          resolve(match[1])
          return
        }
      }
    })

    proc.stderr?.on('data', (chunk) => {
      output += chunk.toString()
    })

    proc.on('exit', (code) => {
      clearTimeout(id)
      let msg = `OpenCode server failed to start (exit code ${code})`

      // Check for common issues
      if (output.includes('port') && output.includes('in use')) {
        msg = `Port ${opts.port} is already in use. Another OpenCode server may be running.`
      } else if (output.includes('permission') || output.includes('access')) {
        msg = `Permission denied when starting OpenCode server. Check file permissions.`
      } else if (output.includes('not found') || output.includes('cannot find')) {
        msg = `OpenCode binary issue: ${output}`
      }

      if (output.trim() && !msg.includes(output)) {
        msg += `\n\nServer output: ${output}`
      }

      msg += `\n\nWorking directory: ${opts.cwd}`
      msg += `\nBinary path: ${binaryPath}`

      reject(new Error(msg))
    })

    proc.on('error', (error) => {
      clearTimeout(id)
      const enhancedError = new Error(
        `Failed to spawn OpenCode server: ${error.message}\n` +
          `Binary path: ${binaryPath}\n` +
          `Working directory: ${opts.cwd}`
      )
      reject(enhancedError)
    })

    if (opts.signal) {
      opts.signal.addEventListener('abort', () => {
        clearTimeout(id)
        reject(new Error('Aborted'))
      })
    }
  })

  return {
    url,
    close() {
      proc.kill()
    }
  }
}
