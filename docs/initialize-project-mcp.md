# Project Initialization via MCP Tool

## Overview

The `initialize_project` MCP tool enables AI agents to create and initialize new OpenCode projects at user-specified locations.

## How It Works

### User Flow

1. **User specifies location**: "Create a new project at C:\\Users\\MyName\\Projects\\my-app"
2. **AI extracts path**: Inference determines the path from natural language
3. **AI calls MCP tool**: `initialize_project` with the path parameter
4. **Tool execution**:
   - Creates directory if it doesn't exist
   - Switches Toji to that directory
   - Initializes git repository
   - Creates .gitignore
   - Creates opencode.json with MCP configuration
   - Creates README.md
   - Optionally switches to the new project (default: true)

### Path Handling

The tool accepts **absolute paths** in any format:
- Windows: `C:\\Users\\Name\\Projects\\my-app`
- Linux/Mac: `/home/user/projects/my-app`

The tool normalizes and resolves paths automatically.

### Safety & Validation

- **Directory creation**: Uses `recursive: true` to create parent directories
- **Path normalization**: Converts to absolute paths before processing
- **Error handling**: Returns detailed error messages if:
  - Directory cannot be created (permissions)
  - Git is not installed
  - Initialization fails

## Integration Points

### Toji Class
- Sets MCP instance getter during initialization
- Passes `() => this` to provide tool access to full Toji API

### McpManager
- Stores Toji instance getter
- Registers tool with all MCP servers (existing and future)
- Tool becomes available to AI in all project contexts

### Tool Implementation
- Uses `switchToProject()` to set context before initialization
- Calls `initializeProject()` for actual git/config setup
- Returns structured response for AI to parse

## Example Conversations

**User**: "create a new typescript project at C:\\Dev\\my-ts-app"

**AI**: *Calls `initialize_project` with:*
```json
{
  "path": "C:\\Dev\\my-ts-app",
  "projectName": "my-ts-app",
  "description": "TypeScript project",
  "autoSwitch": true
}
```

**Tool Response**:
```json
{
  "success": true,
  "projectPath": "C:\\Dev\\my-ts-app",
  "steps": ["git-init", "gitignore", "opencode-config", "readme"],
  "switched": true,
  "message": "Successfully initialized project at C:\\Dev\\my-ts-app..."
}
```

**AI to User**: "I've created and initialized your TypeScript project at C:\\Dev\\my-ts-app. It now has git version control and is configured for OpenCode. The project is active and ready to use."

## Edge Cases Handled

1. **Path doesn't exist**: Creates it recursively
2. **Project already initialized**: Detects and reports gracefully
3. **Git not installed**: Returns error with installation instructions
4. **Permission errors**: Returns clear error message
5. **Already open project**: Switches context, then initializes

## Configuration Options

All optional parameters for customization:

- `projectName`: Overrides directory name in opencode.json
- `description`: Adds project description
- `model`: Sets default AI model for the project
- `autoSwitch`: Control whether to immediately switch to new project (default: true)

## Future Enhancements

Potential additions:
- Project templates (React, Node.js, Python, etc.)
- Custom .gitignore templates based on project type
- Dependency initialization (npm, pip, etc.)
- IDE configuration files (.vscode, .idea)
- License file generation
