import { resolve } from 'path'
import { defineConfig, externalizeDepsPlugin } from 'electron-vite'
import react from '@vitejs/plugin-react'

export default defineConfig({
  main: {
    plugins: [externalizeDepsPlugin({ exclude: ['@opencode-ai/sdk', 'electron-store'] })],
    resolve: {
      conditions: ['import', 'module', 'node', 'default'],
      alias: {
        '@opencode-ai/sdk': resolve(__dirname, 'node_modules/@opencode-ai/sdk/dist/index.js')
      }
    }
  },
  preload: {
    plugins: [externalizeDepsPlugin()]
  },
  renderer: {
    resolve: {
      alias: {
        '@renderer': resolve('src/renderer/src')
      }
    },
    plugins: [react()]
  }
})
