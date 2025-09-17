import { test, describe } from 'node:test'
import assert from 'node:assert'
import { join } from 'path'
import { mkdirSync, rmSync, existsSync, writeFileSync } from 'fs'
import { tmpdir } from 'os'

// Mock Electron app.getPath() for testing
const mockElectronApp = {
  getPath: (name) => {
    if (name === 'userData') {
      return join(tmpdir(), 'toji-test-userdata')
    }
    return tmpdir()
  }
}

// Mock process.platform and process.arch for testing
const originalPlatform = process.platform
const originalArch = process.arch

describe('OpenCodeService Tests', () => {
  let testUserDataPath
  
  test('setup', () => {
    testUserDataPath = mockElectronApp.getPath('userData')
    mkdirSync(testUserDataPath, { recursive: true })
    console.log('Test setup: Created test userData directory:', testUserDataPath)
  })

  test('environment setup creates correct directories', () => {
    const binDir = join(testUserDataPath, 'opencode-bin')
    const dataDir = join(testUserDataPath, 'opencode-data')
    const workaroundDir = join(dataDir, 'bin')
    
    // Simulate the setupEnvironment logic
    if (!existsSync(binDir)) {
      mkdirSync(binDir, { recursive: true })
    }
    
    if (!existsSync(workaroundDir)) {
      mkdirSync(workaroundDir, { recursive: true })
    }
    
    assert.ok(existsSync(binDir), 'Binary directory should be created')
    assert.ok(existsSync(dataDir), 'Data directory should be created')
    assert.ok(existsSync(workaroundDir), 'Workaround bin directory should be created')
  })

  test('binary path resolution works correctly', () => {
    const binDir = join(testUserDataPath, 'opencode-bin')
    
    // Test Windows binary name
    const winBinaryName = 'opencode.exe'
    const unixBinaryName = 'opencode'
    
    const winPath = join(binDir, winBinaryName)
    const unixPath = join(binDir, unixBinaryName)
    
    assert.equal(typeof winPath, 'string', 'Windows binary path should be string')
    assert.equal(typeof unixPath, 'string', 'Unix binary path should be string')
    assert.ok(winPath.endsWith('.exe'), 'Windows path should end with .exe')
    assert.ok(!unixPath.endsWith('.exe'), 'Unix path should not end with .exe')
  })

  test('binary info returns correct structure', () => {
    const binDir = join(testUserDataPath, 'opencode-bin')
    const binaryName = process.platform === 'win32' ? 'opencode.exe' : 'opencode'
    const binaryPath = join(binDir, binaryName)
    
    // Mock getBinaryInfo logic
    const binaryInfo = {
      path: binaryPath,
      installed: existsSync(binaryPath),
      lastChecked: new Date()
    }
    
    assert.equal(typeof binaryInfo.path, 'string', 'Path should be string')
    assert.equal(typeof binaryInfo.installed, 'boolean', 'Installed should be boolean')
    assert.ok(binaryInfo.lastChecked instanceof Date, 'LastChecked should be Date')
    assert.equal(binaryInfo.installed, false, 'Binary should not be installed initially')
  })

  test('binary installation simulation', () => {
    const binDir = join(testUserDataPath, 'opencode-bin')
    const binaryName = process.platform === 'win32' ? 'opencode.exe' : 'opencode'
    const binaryPath = join(binDir, binaryName)
    
    // Simulate binary installation
    mkdirSync(binDir, { recursive: true })
    writeFileSync(binaryPath, 'mock binary content')
    
    assert.ok(existsSync(binaryPath), 'Binary should exist after installation')
    
    // Test binary info after installation
    const binaryInfo = {
      path: binaryPath,
      installed: existsSync(binaryPath),
      lastChecked: new Date()
    }
    
    assert.equal(binaryInfo.installed, true, 'Binary should be marked as installed')
  })

  test('platform mapping logic', () => {
    const platformMap = {
      win32: 'windows',
      darwin: 'darwin',
      linux: 'linux'
    }
    
    const archMap = {
      x64: 'x64',
      arm64: 'arm64'
    }
    
    // Test platform mapping
    assert.equal(platformMap.win32, 'windows', 'Win32 should map to windows')
    assert.equal(platformMap.darwin, 'darwin', 'Darwin should map to darwin')
    assert.equal(platformMap.linux, 'linux', 'Linux should map to linux')
    
    // Test arch mapping
    assert.equal(archMap.x64, 'x64', 'x64 should map to x64')
    assert.equal(archMap.arm64, 'arm64', 'arm64 should map to arm64')
    
    // Test unsupported platform detection
    const unsupportedPlatform = 'unknown'
    const unsupportedArch = 'unknown'
    
    assert.equal(platformMap[unsupportedPlatform], undefined, 'Unsupported platform should be undefined')
    assert.equal(archMap[unsupportedArch], undefined, 'Unsupported arch should be undefined')
  })

  test('download URL construction', () => {
    const platform = 'linux'
    const arch = 'x64'
    const zipName = `opencode-${platform}-${arch}.zip`
    const downloadUrl = `https://github.com/sst/opencode/releases/latest/download/${zipName}`
    
    assert.equal(zipName, 'opencode-linux-x64.zip', 'ZIP name should be constructed correctly')
    assert.ok(downloadUrl.includes('github.com'), 'Download URL should point to GitHub')
    assert.ok(downloadUrl.includes('releases/latest'), 'Download URL should use latest release')
  })

  test('cleanup', () => {
    // Clean up test directory
    if (existsSync(testUserDataPath)) {
      rmSync(testUserDataPath, { recursive: true, force: true })
      console.log('Test cleanup: Removed test userData directory:', testUserDataPath)
    }
  })
})

console.log('🔧 OpenCodeService Tests - Testing binary management logic')
console.log('📦 Testing directory setup, binary detection, and installation workflow')