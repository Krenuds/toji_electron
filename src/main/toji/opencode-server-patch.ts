import { spawn } from 'child_process'
import type { Config } from '@opencode-ai/sdk'

export interface ServerOptions {
  hostname?: string
  port?: number
  timeout?: number
  signal?: AbortSignal
  config?: Config
  cwd?: string  // Add the missing cwd option
}

export async function createOpencodeServerWithCwd(options?: ServerOptions): Promise<{
  url: string
  close: () => void
}> {
  const opts = {
    hostname: '127.0.0.1',
    port: 4096,
    timeout: 5000,
    cwd: process.cwd(), // Default to current working directory
    ...options
  }

  const proc = spawn(
    'opencode',
    ['serve', `--hostname=${opts.hostname}`, `--port=${opts.port}`],
    {
      cwd: opts.cwd, // THIS IS THE KEY - Set the working directory!
      signal: opts.signal,
      env: {
        ...process.env,
        OPENCODE_CONFIG_CONTENT: JSON.stringify(opts.config ?? {})
      }
    }
  )

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
      let msg = `Server exited with code ${code}`
      if (output.trim()) {
        msg += `\nServer output: ${output}`
      }
      reject(new Error(msg))
    })

    proc.on('error', (error) => {
      clearTimeout(id)
      reject(error)
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