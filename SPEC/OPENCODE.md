# OpenCode SDK https://github.com/sst/opencode

Type-safe JavaScript/TypeScript client for OpenCode server integration.

The OpenCode JS/TS SDK provides a type-safe client for interacting with the OpenCode server. Use it to build integrations and control OpenCode programmatically.

[Learn more about how the server works →](https://github.com/sst/opencode)

## Installation

Install the SDK from npm:

```bash
npm install @opencode-ai/sdk
```

## Quick Start

### Create Client

Create a client instance to connect to your server:

```typescript
import { createOpencodeClient } from '@opencode-ai/sdk'

const client = createOpencodeClient({
  baseUrl: 'http://localhost:4096',
  responseStyle: 'data'
})
```

### Client Options

| Option          | Type       | Description                      | Default                 |
| --------------- | ---------- | -------------------------------- | ----------------------- |
| `baseUrl`       | `string`   | URL of the server                | `http://localhost:4096` |
| `fetch`         | `function` | Custom fetch implementation      | `globalThis.fetch`      |
| `parseAs`       | `string`   | Response parsing method          | `auto`                  |
| `responseStyle` | `string`   | Return style: `data` or `fields` | `fields`                |
| `throwOnError`  | `boolean`  | Throw errors instead of return   | `false`                 |

## Server Management

### Start Server Programmatically

You can programmatically start an OpenCode server:

```typescript
import { createOpencodeServer } from '@opencode-ai/sdk'

const server = await createOpencodeServer({
  hostname: '127.0.0.1',
  port: 4096
})

console.log(`Server running at ${server.url}`)
server.close()
```

### Server with Custom Configuration

Pass a configuration object to customize server behavior. The server still picks up your `opencode.json`, but you can override or add configuration inline:

```typescript
import { createOpencodeServer } from '@opencode-ai/sdk'

const server = await createOpencodeServer({
  hostname: '127.0.0.1',
  port: 4096,
  config: {
    model: 'anthropic/claude-3-5-sonnet-20241022'
  }
})

console.log(`Server running at ${server.url}`)
server.close()
```

### Server Options

| Option     | Type          | Description                    | Default     |
| ---------- | ------------- | ------------------------------ | ----------- |
| `hostname` | `string`      | Server hostname                | `127.0.0.1` |
| `port`     | `number`      | Server port                    | `4096`      |
| `signal`   | `AbortSignal` | Abort signal for cancellation  | `undefined` |
| `timeout`  | `number`      | Timeout in ms for server start | `5000`      |
| `config`   | `Config`      | Configuration object           | `{}`        |

## TypeScript Support

The SDK includes TypeScript definitions for all API types. Import them directly:

```typescript
import type { Session, Message, Part } from '@opencode-ai/sdk'
```

All types are generated from the server's OpenAPI specification and available in the [types file](https://github.com/opencode-ai/sdk/blob/main/src/types.ts).

## Error Handling

The SDK can throw errors that you can catch and handle:

```typescript
try {
  await client.session.get({ path: { id: 'invalid-id' } })
} catch (error) {
  console.error('Failed to get session:', (error as Error).message)
}
```

## API Reference

The SDK exposes all server APIs through a type-safe client.

### App API

| Method         | Description               | Response  |
| -------------- | ------------------------- | --------- |
| `app.log()`    | Write a log entry         | `boolean` |
| `app.agents()` | List all available agents | `Agent[]` |

#### Examples

```typescript
// Write a log entry
await client.app.log({
  body: {
    service: 'my-app',
    level: 'info',
    message: 'Operation completed'
  }
})

// List available agents
const agents = await client.app.agents()
```

### Project API

| Method              | Description         | Response    |
| ------------------- | ------------------- | ----------- |
| `project.list()`    | List all projects   | `Project[]` |
| `project.current()` | Get current project | `Project`   |

#### Examples

```typescript
// List all projects
const projects = await client.project.list()

// Get current project
const currentProject = await client.project.current()
```

### Path API

| Method       | Description      | Response |
| ------------ | ---------------- | -------- |
| `path.get()` | Get current path | `Path`   |

#### Examples

```typescript
// Get current path information
const pathInfo = await client.path.get()
```

### Config API

| Method               | Description                       | Response                                                        |
| -------------------- | --------------------------------- | --------------------------------------------------------------- |
| `config.get()`       | Get config info                   | `Config`                                                        |
| `config.providers()` | List providers and default models | `{ providers: Provider[], default: { [key: string]: string } }` |

#### Examples

```typescript
const config = await client.config.get()

const { providers, default: defaults } = await client.config.providers()
```

### Sessions API https://github.com/sst/opencode

| Method                                                     | Description                      | Response                                   |
| ---------------------------------------------------------- | -------------------------------- | ------------------------------------------ |
| `session.list()`                                           | List sessions                    | `Session[]`                                |
| `session.get({ path })`                                    | Get session                      | `Session`                                  |
| `session.children({ path })`                               | List child sessions              | `Session[]`                                |
| `session.create({ body })`                                 | Create session                   | `Session`                                  |
| `session.delete({ path })`                                 | Delete session                   | `boolean`                                  |
| `session.update({ path, body })`                           | Update session properties        | `Session`                                  |
| `session.init({ path, body })`                             | Analyze app and create AGENTS.md | `boolean`                                  |
| `session.abort({ path })`                                  | Abort a running session          | `boolean`                                  |
| `session.share({ path })`                                  | Share session                    | `Session`                                  |
| `session.unshare({ path })`                                | Unshare session                  | `Session`                                  |
| `session.summarize({ path, body })`                        | Summarize session                | `boolean`                                  |
| `session.messages({ path })`                               | List messages in a session       | `{ info: Message, parts: Part[]}[]`        |
| `session.message({ path })`                                | Get message details              | `{ info: Message, parts: Part[]}`          |
| `session.prompt({ path, body })`                           | Send prompt message              | `{ info: AssistantMessage, parts: Part[]}` |
| `session.command({ path, body })`                          | Send command to session          | `{ info: AssistantMessage, parts: Part[]}` |
| `session.shell({ path, body })`                            | Run a shell command              | `AssistantMessage`                         |
| `session.revert({ path, body })`                           | Revert a message                 | `Session`                                  |
| `session.unrevert({ path })`                               | Restore reverted messages        | `Session`                                  |
| `postSessionByIdPermissionsByPermissionId({ path, body })` | Respond to a permission request  | `boolean`                                  |

#### Examples

```typescript
// Create and manage sessions
const session = await client.session.create({
  body: { title: 'My session' }
})

const sessions = await client.session.list()

// Send a prompt message
const result = await client.session.prompt({
  path: { id: session.id },
  body: {
    model: {
      providerID: 'anthropic',
      modelID: 'claude-3-5-sonnet-20241022'
    },
    parts: [{ type: 'text', text: 'Hello!' }]
  }
})
```

### Files API

| Method                    | Description                  | Response                                                                          |
| ------------------------- | ---------------------------- | --------------------------------------------------------------------------------- |
| `find.text({ query })`    | Search for text in files     | Array of match objects with path, lines, line_number, absolute_offset, submatches |
| `find.files({ query })`   | Find files by name           | `string[]` (file paths)                                                           |
| `find.symbols({ query })` | Find workspace symbols       | `Symbol[]`                                                                        |
| `file.read({ query })`    | Read a file                  | `{ type: "raw" \| "patch", content: string }`                                     |
| `file.status({ query? })` | Get status for tracked files | `File[]`                                                                          |

#### Examples

```typescript
// Search and read files
const textResults = await client.find.text({
  query: { pattern: 'function.*opencode' }
})

const files = await client.find.files({
  query: { query: '*.ts' }
})

const content = await client.file.read({
  query: { path: 'src/index.ts' }
})
```

### TUI API

| Method                         | Description               | Response  |
| ------------------------------ | ------------------------- | --------- |
| `tui.appendPrompt({ body })`   | Append text to the prompt | `boolean` |
| `tui.openHelp()`               | Open the help dialog      | `boolean` |
| `tui.openSessions()`           | Open the session selector | `boolean` |
| `tui.openThemes()`             | Open the theme selector   | `boolean` |
| `tui.openModels()`             | Open the model selector   | `boolean` |
| `tui.submitPrompt()`           | Submit the current prompt | `boolean` |
| `tui.clearPrompt()`            | Clear the prompt          | `boolean` |
| `tui.executeCommand({ body })` | Execute a command         | `boolean` |
| `tui.showToast({ body })`      | Show toast notification   | `boolean` |

#### Examples

```typescript
// Control TUI interface
await client.tui.appendPrompt({
  body: { text: 'Add this to prompt' }
})

await client.tui.showToast({
  body: {
    message: 'Task completed',
    variant: 'success'
  }
})
```

### Auth API

| Method              | Description                    | Response  |
| ------------------- | ------------------------------ | --------- |
| `auth.set({ ... })` | Set authentication credentials | `boolean` |

#### Examples

```typescript
await client.auth.set({
  path: { id: 'anthropic' },
  body: {
    type: 'api',
    key: 'your-api-key'
  }
})
```

### Events API

| Method              | Description               | Response                  |
| ------------------- | ------------------------- | ------------------------- |
| `event.subscribe()` | Server-sent events stream | Server-sent events stream |

#### Examples

```typescript
// Listen to real-time events
const events = await client.event.subscribe()
for await (const event of events.stream) {
  console.log('Event:', event.type, event.properties)
}
```

## Resources

- [OpenCode Documentation](https://docs.opencode.ai)
- [GitHub Repository](https://github.com/opencode-ai/sdk)

---

_© Anomaly Innovations Inc._
