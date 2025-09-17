import { test, expect } from '@playwright/test'
import { existsSync } from 'fs'

test('build artifacts exist', async () => {
  // Test that build outputs exist
  expect(existsSync('./out/main/index.js')).toBe(true)
  expect(existsSync('./out/preload/index.mjs')).toBe(true)
  expect(existsSync('./out/renderer/index.html')).toBe(true)
  expect(existsSync('./node_modules/electron/dist/electron')).toBe(true)
})

test('playwright electron integration setup', async () => {
  const { _electron } = await import('@playwright/test')
  
  // Test that Playwright's Electron integration is available
  expect(typeof _electron).toBe('object')
  expect(typeof _electron.launch).toBe('function')
  
  // Verify electron binary is accessible
  const electronPath = './node_modules/electron/dist/electron'
  expect(existsSync(electronPath)).toBe(true)
})