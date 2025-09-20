// Test workspace-specific configs
import { createOpencodeClient } from '@opencode-ai/sdk';
import path from 'path';
import fs from 'fs';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Test directories with config files
const testDir1 = path.join(__dirname, 'workspace1');
const testDir2 = path.join(__dirname, 'workspace2');

async function testWorkspaceConfigs() {
  console.log('=== Testing Workspace-Specific Configs ===\n');
  console.log('Connecting to OpenCode server on port 3456...\n');

  let client;

  try {
    client = createOpencodeClient({
      baseUrl: 'http://localhost:3456'
    });
    console.log('Client connected\n');

    // 1. Test default config (no directory)
    console.log('1. Default config (no directory):');
    console.log('   Expected: Global config or defaults');
    const defaultConfig = await client.config.get();
    if (defaultConfig.data) {
      console.log('   - Username:', defaultConfig.data.username || 'not set');
      console.log('   - Model:', defaultConfig.data.model || 'not set');
      console.log('   - Theme:', defaultConfig.data.theme || 'not set');
      console.log('   - Custom data:', defaultConfig.data.custom || 'none');
    }
    console.log();

    // 2. Test workspace1 config
    console.log('2. Workspace1 config:');
    console.log('   Expected: username=workspace1-user, model=claude-sonnet-3.5, theme=dark');
    const ws1Config = await client.config.get({
      query: { directory: testDir1 }
    });
    if (ws1Config.data) {
      console.log('   - Username:', ws1Config.data.username || 'not set');
      console.log('   - Model:', ws1Config.data.model || 'not set');
      console.log('   - Theme:', ws1Config.data.theme || 'not set');
      console.log('   - Custom data:', JSON.stringify(ws1Config.data.custom) || 'none');
      console.log('   - Agent test:', ws1Config.data.agent?.test?.description || 'not found');
    }
    console.log();

    // 3. Test workspace2 config
    console.log('3. Workspace2 config:');
    console.log('   Expected: username=workspace2-user, model=gpt-4, theme=light');
    const ws2Config = await client.config.get({
      query: { directory: testDir2 }
    });
    if (ws2Config.data) {
      console.log('   - Username:', ws2Config.data.username || 'not set');
      console.log('   - Model:', ws2Config.data.model || 'not set');
      console.log('   - Theme:', ws2Config.data.theme || 'not set');
      console.log('   - Custom data:', JSON.stringify(ws2Config.data.custom) || 'none');
      console.log('   - Agent test:', ws2Config.data.agent?.test?.description || 'not found');
    }
    console.log();

    // 4. Compare configs
    console.log('4. Config Comparison:');
    const areDefaultAndWs1Same = JSON.stringify(defaultConfig.data) === JSON.stringify(ws1Config.data);
    const areWs1AndWs2Same = JSON.stringify(ws1Config.data) === JSON.stringify(ws2Config.data);

    console.log('   Default == Workspace1?', areDefaultAndWs1Same);
    console.log('   Workspace1 == Workspace2?', areWs1AndWs2Same);

    if (!areWs1AndWs2Same && ws1Config.data?.custom?.workspace === 'workspace1' &&
        ws2Config.data?.custom?.workspace === 'workspace2') {
      console.log('\n   ✅ SUCCESS: Workspace-specific configs are working!');
      console.log('   Each workspace has its own configuration.');
    } else {
      console.log('\n   ❌ ISSUE: Configs appear to be the same across workspaces.');
      console.log('   The directory parameter may not be working as expected.');
    }

    // 5. Test non-existent workspace
    console.log('\n5. Non-existent workspace (no opencode.json):');
    const noConfigDir = path.join(__dirname, 'workspace3');
    if (!fs.existsSync(noConfigDir)) {
      fs.mkdirSync(noConfigDir, { recursive: true });
    }
    const ws3Config = await client.config.get({
      query: { directory: noConfigDir }
    });
    console.log('   Should fall back to global/default config:');
    console.log('   - Username:', ws3Config.data?.username || 'not set');
    console.log('   - Custom data:', ws3Config.data?.custom || 'none');

  } catch (error) {
    console.error('Test failed:', error);
  }

  console.log('\n=== Test Complete ===');
}

// Run the test
testWorkspaceConfigs().catch(console.error);