// Test workspace settings persistence
// Run this in the browser console when the app is running

async function testWorkspaceSettings() {
  console.log('=== Testing Workspace Settings ===\n');

  const testPath = 'C:\\Users\\donth\\toji3';

  // 1. Get initial settings (should be empty)
  console.log('1. Getting initial settings...');
  const initial = await window.api.core.getWorkspaceSettings(testPath);
  console.log('Initial settings:', initial);

  // 2. Set some test settings
  console.log('\n2. Setting test workspace settings...');
  const testSettings = {
    opencodeConfig: {
      model: 'claude-3-5-sonnet',
      theme: 'dark'
    },
    ui: {
      sidebarWidth: 300,
      sidebarCollapsed: false,
      customLabel: 'Test Workspace'
    },
    session: {
      autoCreate: true,
      preserveOnRestart: true
    }
  };

  await window.api.core.setWorkspaceSettings(testPath, testSettings);
  console.log('Settings saved!');

  // 3. Get settings again to verify they were saved
  console.log('\n3. Getting settings after save...');
  const saved = await window.api.core.getWorkspaceSettings(testPath);
  console.log('Saved settings:', saved);

  // 4. Verify settings match
  console.log('\n4. Verifying settings...');
  const success = JSON.stringify(saved.opencodeConfig) === JSON.stringify(testSettings.opencodeConfig);
  console.log('Settings match:', success);

  // 5. Get all workspace settings
  console.log('\n5. Getting all workspace settings...');
  const all = await window.api.core.getAllWorkspaceSettings();
  console.log('All workspace settings:', all);

  if (success) {
    console.log('\n✅ Workspace settings test PASSED!');
    console.log('Settings are persisting correctly.');
  } else {
    console.log('\n❌ Workspace settings test FAILED!');
  }

  return success;
}

// Run the test
testWorkspaceSettings();