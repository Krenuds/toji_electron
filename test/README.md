# Testing Setup

## Overview

Lightweight testing for the refactored Toji3 Electron application focusing on Core API and OpenCodeService logic.

## Test Strategy

**Direct API Testing** - Tests the business logic directly without Electron overhead for fast, reliable validation.

## Running Tests

```bash
# Run all tests
npm test

# Run specific test suites
npm run test:core      # Core API logic
npm run test:service   # Binary management logic
```

## Test Coverage

### Core API Tests (`core.test.js`)
- ✅ Core initialization with OpenCodeService
- ✅ Binary service functionality validation  
- ✅ OpenCode SDK workflow simulation (mocked)
- ✅ Directory preparation logic
- ✅ Session creation and prompting workflow

### OpenCodeService Tests (`opencode-service.test.js`)
- ✅ Environment setup and directory creation
- ✅ Binary path resolution across platforms
- ✅ Binary installation simulation
- ✅ Platform/architecture mapping logic
- ✅ Download URL construction
- ✅ Binary detection and status reporting

## Key Features

- **Zero Dependencies**: Uses Node.js built-in test runner
- **Fast Execution**: ~50ms total runtime
- **Clean Isolation**: Tests use temporary directories with automatic cleanup
- **Mocked SDK**: OpenCode SDK calls are mocked for consistent testing
- **Cross-Platform**: Platform-specific logic tested for Windows/Mac/Linux

## Test Output

```
# tests 15
# suites 2  
# pass 15
# fail 0
```

## Adding Tests

1. Create new `.test.js` files in this directory
2. Use Node.js test API: `import { test, describe } from 'node:test'`
3. Follow existing patterns for setup/cleanup
4. Run `npm test` to verify

## Future Enhancements

When ready for full integration testing:

1. **Playwright Setup**: For full Electron app testing
2. **IPC Testing**: Test main ↔ renderer communication
3. **UI Testing**: Test React components and user workflows

For now, this lightweight approach validates the core architectural refactor works correctly.