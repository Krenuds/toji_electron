import { createOpencodeClient } from '@opencode-ai/sdk';

async function testCliServer() {
  console.log('Testing CLI server at http://127.0.0.1:4097...');

  // Test our SDK server
  console.log('\n=== Testing SDK Server (port 4096) ===');
  const sdkClient = createOpencodeClient({
    baseUrl: 'http://127.0.0.1:4096'
  });

  try {
    const sdkProject = await sdkClient.project.current();
    console.log('SDK Server - Current project:', JSON.stringify(sdkProject, null, 2));

    const sdkFiles = await sdkClient.find.files({ query: { query: '*' } });
    console.log('SDK Server - Files found:', sdkFiles.data);
  } catch (error) {
    console.error('SDK Server error:', error.message);
  }

  // Test CLI server after Git commit
  console.log('\n=== Testing CLI Server After Git Commit (port 4098) ===');
  const client = createOpencodeClient({
    baseUrl: 'http://127.0.0.1:4098'
  });

  try {
    // Check current project
    console.log('Checking current project...');
    const currentProject = await client.project.current();
    console.log('Current project:', JSON.stringify(currentProject, null, 2));

    // List all projects
    console.log('\nListing all projects...');
    const allProjects = await client.project.list();
    console.log('All projects:', JSON.stringify(allProjects, null, 2));

    // Test file operations
    console.log('CLI Server - Testing file operations...');
    const files = await client.find.files({
      query: { query: '*' }
    });
    console.log('CLI Server - Files found:', files.data);

  } catch (error) {
    console.error('Error:', error.message);
  }
}

testCliServer();