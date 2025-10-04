# Testing the initialize_project MCP Tool

## Quick Test

1. **Start Toji** in dev mode:

   ```powershell
   npm run dev
   ```

2. **Open any project** (or let it use global mode)

3. **Chat with OpenCode** and try:

   ```text
   "Create a new project at C:\Users\donth\Documents\test-project"
   ```

   or

   ```text
   "Initialize a new Python project at C:\Dev\my-python-app with description 'My Python App'"
   ```

## Expected Behavior

1. AI should recognize the intent to create a project
2. AI calls `initialize_project` MCP tool with extracted path
3. Tool creates directory (if needed)
4. Switches to that directory
5. Initializes git, .gitignore, opencode.json, README.md
6. Returns success message
7. AI reports back to user
8. Project is now active in Toji

## Verify

Check that the new directory contains:

- `.git/` directory
- `.gitignore` file
- `opencode.json` with MCP configuration
- `README.md` file

## Tool Parameters

Test variations:

```text
"Create a Node.js project called 'my-api' at C:\Dev\my-api"
```

→ Should set project name to "my-api"

```text
"Initialize a project at C:\Dev\test with model anthropic/claude-3-5-sonnet-20241022"
```

→ Should set default model in opencode.json

## Error Cases to Test

1. **No path specified**: AI should ask for clarification
2. **Invalid path** (e.g., invalid drive): Tool returns error
3. **Permission denied**: Tool returns clear error
4. **Git not installed**: Tool returns error with installation link

## MCP Tool Details

Tool name: `initialize_project`

Parameters:

- `path` (required): Full absolute path
- `projectName` (optional): Project name
- `description` (optional): Project description
- `model` (optional): Default AI model
- `autoSwitch` (optional): Auto-switch to project (default: true)

Returns:

- `success`: boolean
- `projectPath`: string
- `steps`: array of completed steps
- `switched`: boolean
- `message`: human-readable message
- `error`: string (if failed)
- `needsGitInstall`: boolean (if git missing)
