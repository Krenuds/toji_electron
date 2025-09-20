// Simple test - just connect to existing OpenCode server
import { createOpencodeClient } from '@opencode-ai/sdk';
import path from 'path';
import fs from 'fs';
import { fileURLToPath } from 'url';
import os from 'os';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Test directories
const testDir1 = path.join(__dirname, 'workspace1');
const testDir2 = path.join(__dirname, 'workspace2');

// Create test directories if they don't exist
if (!fs.existsSync(testDir1)) fs.mkdirSync(testDir1, { recursive: true });
if (!fs.existsSync(testDir2)) fs.mkdirSync(testDir2, { recursive: true });

async function testConfigSystem() {
  console.log('=== OpenCode Config System Test ===\n');
  console.log('Connecting to OpenCode server on port 3456...\n');

  let client;

  try {
    // Create client for existing server
    console.log('1. Creating client connection to existing server...');
    client = createOpencodeClient({
      baseUrl: 'http://localhost:3456'
    });
    console.log('   Client connected\n');

    // Test default config (no directory)
    console.log('2. Testing config.get() without directory:');
    try {
      const defaultConfig = await client.config.get();
      console.log('   Default config received:');
      console.log('   - Response status:', defaultConfig.response?.status);
      console.log('   - Has data?', !!defaultConfig.data);
      console.log('   - Config type:', typeof defaultConfig.data);

      if (defaultConfig.data) {
        console.log('   - Has theme?', !!defaultConfig.data.theme);
        console.log('   - Has model?', !!defaultConfig.data.model);
        console.log('   - Model value:', defaultConfig.data.model);
        console.log('   - Has keybinds?', !!defaultConfig.data.keybinds);
        console.log('   - Config keys:', Object.keys(defaultConfig.data));
        console.log('   - Full config:', JSON.stringify(defaultConfig.data, null, 2));
      }
    } catch (err) {
      console.log('   Error:', err.message);
    }
    console.log();

    // Test config with specific directory
    console.log('3. Testing config.get() with workspace1 directory:');
    try {
      const ws1Config = await client.config.get({
        query: { directory: testDir1 }
      });
      console.log('   Workspace1 config received:');
      console.log('   - Response status:', ws1Config.response?.status);
      console.log('   - Has data?', !!ws1Config.data);

      if (ws1Config.data) {
        console.log('   - Config keys:', Object.keys(ws1Config.data));
        console.log('   - Model:', ws1Config.data.model || 'not set');
      }
    } catch (err) {
      console.log('   Error:', err.message);
    }
    console.log();

    // Test config with different directory
    console.log('4. Testing config.get() with workspace2 directory:');
    try {
      const ws2Config = await client.config.get({
        query: { directory: testDir2 }
      });
      console.log('   Workspace2 config received:');
      console.log('   - Response status:', ws2Config.response?.status);
      console.log('   - Has data?', !!ws2Config.data);

      if (ws2Config.data) {
        console.log('   - Config keys:', Object.keys(ws2Config.data));
        console.log('   - Model:', ws2Config.data.model || 'not set');
      }
    } catch (err) {
      console.log('   Error:', err.message);
    }
    console.log();

    // Check if configs are the same or different
    console.log('5. Comparing configs:');
    const config1 = await client.config.get({ query: { directory: testDir1 }});
    const config2 = await client.config.get({ query: { directory: testDir2 }});
    const configDefault = await client.config.get();

    console.log('   Are workspace configs identical?',
      JSON.stringify(config1.data) === JSON.stringify(config2.data));
    console.log('   Are workspace1 and default identical?',
      JSON.stringify(config1.data) === JSON.stringify(configDefault.data));
    console.log();

    // Test providers
    console.log('6. Testing config.providers():');
    try {
      const providers = await client.config.providers();
      console.log('   Response status:', providers.response?.status);
      console.log('   Has data?', !!providers.data);

      if (providers.data) {
        console.log('   Available providers:', Object.keys(providers.data.providers || {}));
        console.log('   Default model:', providers.data.default);
      }
    } catch (err) {
      console.log('   Error:', err.message);
    }
    console.log();

    // Look for config files
    console.log('7. Checking for config files:');
    const possibleConfigPaths = [
      path.join(testDir1, '.opencode'),
      path.join(testDir1, 'opencode.json'),
      path.join(testDir1, '.opencode.json'),
      path.join(testDir2, '.opencode'),
      path.join(testDir2, 'opencode.json'),
      path.join(testDir2, '.opencode.json'),
    ];

    possibleConfigPaths.forEach(configPath => {
      if (fs.existsSync(configPath)) {
        console.log(`   Found: ${configPath}`);
        const stats = fs.statSync(configPath);
        if (stats.isDirectory()) {
          const files = fs.readdirSync(configPath);
          console.log(`     Contents: ${files.join(', ')}`);
        }
      }
    });

    // Check home directory
    const homeDir = os.homedir();
    const homeConfigPath = path.join(homeDir, '.opencode');
    if (fs.existsSync(homeConfigPath)) {
      console.log(`   Found home config: ${homeConfigPath}`);
      const files = fs.readdirSync(homeConfigPath);
      console.log(`     Contents: ${files.join(', ')}`);

      // Check for config.json
      const configJsonPath = path.join(homeConfigPath, 'config.json');
      if (fs.existsSync(configJsonPath)) {
        console.log(`   Found config.json, reading...`);
        const configContent = fs.readFileSync(configJsonPath, 'utf8');
        console.log(`   Config content (first 200 chars):`, configContent.substring(0, 200) + '...');
      }
    }

  } catch (error) {
    console.error('Test failed:', error);
  }

  console.log('\nTest complete!');
}

// Run the test
testConfigSystem().catch(console.error);