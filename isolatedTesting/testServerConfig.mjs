// Test if server started from workspace inherits its config
import { createOpencodeClient } from '@opencode-ai/sdk';

async function testServerConfig() {
  console.log('=== Testing Server Config Inheritance ===\n');

  try {
    // Connect to server started from workspace1
    console.log('Connecting to server started from workspace1 (port 3457)...');
    const client = createOpencodeClient({
      baseUrl: 'http://localhost:3457'
    });

    const config = await client.config.get();
    console.log('\nConfig from server (should reflect workspace1 settings):');
    console.log('- Username:', config.data?.username || 'not set');
    console.log('- Model:', config.data?.model || 'not set');
    console.log('- Theme:', config.data?.theme || 'not set');
    console.log('- Custom data:', JSON.stringify(config.data?.custom) || 'none');
    console.log('- Agent test:', config.data?.agent?.test?.description || 'not found');

    if (config.data?.custom?.workspace === 'workspace1' ||
        config.data?.username === 'workspace1-user' ||
        config.data?.model === 'claude-sonnet-3.5') {
      console.log('\n✅ SUCCESS: Server inherits workspace config!');
    } else {
      console.log('\n❓ Server may not be using workspace config');
    }

  } catch (error) {
    console.error('Test failed:', error.message);
  }
}

testServerConfig().catch(console.error);