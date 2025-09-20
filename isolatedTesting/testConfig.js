// Test script to explore OpenCode config behavior
const { createOpencodeServer, createOpencodeClient } = require('@opencode-ai/sdk');
const path = require('path');
const fs = require('fs');

// Test directories
const testDir1 = path.join(__dirname, 'workspace1');
const testDir2 = path.join(__dirname, 'workspace2');

// Create test directories if they don't exist
if (!fs.existsSync(testDir1)) fs.mkdirSync(testDir1, { recursive: true });
if (!fs.existsSync(testDir2)) fs.mkdirSync(testDir2, { recursive: true });

async function testConfigSystem() {
  console.log('=== OpenCode Config System Test ===\n');

  let server;
  let client;

  try {
    // 1. Start the server
    console.log('1. Starting OpenCode server...');
    server = await createOpencodeServer({
      port: 3456,
      quiet: true
    });

    console.log('   Server started on port 3456\n');

    // 2. Create client
    console.log('2. Creating client connection...');
    client = createOpencodeClient({
      baseUrl: 'http://localhost:3456'
    });
    console.log('   Client connected\n');

    // 3. Test default config (no directory)
    console.log('3. Testing config.get() without directory:');
    try {
      const defaultConfig = await client.config.get();
      console.log('   Default config received:');
      console.log('   - Has theme?', !!defaultConfig.data?.theme);
      console.log('   - Has model?', !!defaultConfig.data?.model);
      console.log('   - Has keybinds?', !!defaultConfig.data?.keybinds);
      console.log('   - Config keys:', Object.keys(defaultConfig.data || {}));
    } catch (err) {
      console.log('   Error:', err.message);
    }
    console.log();

    // 4. Test config with specific directory
    console.log('4. Testing config.get() with workspace1 directory:');
    try {
      const ws1Config = await client.config.get({
        query: { directory: testDir1 }
      });
      console.log('   Workspace1 config received:');
      console.log('   - Config keys:', Object.keys(ws1Config.data || {}));
      console.log('   - Model:', ws1Config.data?.model || 'not set');
    } catch (err) {
      console.log('   Error:', err.message);
    }
    console.log();

    // 5. Test config with different directory
    console.log('5. Testing config.get() with workspace2 directory:');
    try {
      const ws2Config = await client.config.get({
        query: { directory: testDir2 }
      });
      console.log('   Workspace2 config received:');
      console.log('   - Config keys:', Object.keys(ws2Config.data || {}));
      console.log('   - Model:', ws2Config.data?.model || 'not set');
    } catch (err) {
      console.log('   Error:', err.message);
    }
    console.log();

    // 6. Check if configs are the same or different
    console.log('6. Comparing configs:');
    const config1 = await client.config.get({ query: { directory: testDir1 }});
    const config2 = await client.config.get({ query: { directory: testDir2 }});
    const configDefault = await client.config.get();

    console.log('   Are workspace configs identical?',
      JSON.stringify(config1.data) === JSON.stringify(config2.data));
    console.log('   Are workspace1 and default identical?',
      JSON.stringify(config1.data) === JSON.stringify(configDefault.data));
    console.log();

    // 7. Test providers
    console.log('7. Testing config.providers():');
    try {
      const providers = await client.config.providers();
      console.log('   Available providers:', Object.keys(providers.data?.providers || {}));
      console.log('   Default model:', providers.data?.default);
    } catch (err) {
      console.log('   Error:', err.message);
    }
    console.log();

    // 8. Look for config files
    console.log('8. Checking for config files:');
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

    // Check home directory too
    const homeDir = require('os').homedir();
    const homeConfigPath = path.join(homeDir, '.opencode');
    if (fs.existsSync(homeConfigPath)) {
      console.log(`   Found home config: ${homeConfigPath}`);
      const files = fs.readdirSync(homeConfigPath);
      console.log(`     Contents: ${files.join(', ')}`);
    }

  } catch (error) {
    console.error('Test failed:', error);
  } finally {
    // Cleanup
    if (server) {
      console.log('\nStopping server...');
      await server.stop();
    }
    console.log('Test complete!');
  }
}

// Run the test
testConfigSystem().catch(console.error);