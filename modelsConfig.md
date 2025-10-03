# OpenCode SDK Models & Configuration Guide

## Overview

This guide provides comprehensive information about configuring models and providers in OpenCode, specifically for SDK usage. OpenCode supports 75+ LLM providers through the AI SDK and Models.dev.

## Model ID Format

In OpenCode, models are identified using the format:

```
provider_id/model_id
```

Examples:

- `anthropic/claude-sonnet-4-20250514`
- `opencode/grok-code-fast-1`
- `xai/grok-code-fast-1`

## Free Models Available on OpenCode

OpenCode currently offers **two free coding models** through launch partnerships:

### 1. Grok Code Fast 1

- **Model ID**: `opencode/grok-code-fast-1`
- **Provider**: xAI (via OpenCode partnership)
- **Features**:
  - Speedy and economical reasoning model
  - Optimized for agentic coding workflows
  - Built-in reasoning capabilities with visible reasoning traces
  - Excellent for TypeScript, Python, Java, Rust, C++, and Go
  - Fast response times designed for iterative development
- **Pricing**: Free for limited time (then $0.20/1M input, $1.50/1M output, $0.02/1M cached)
- **Context**: 256K context window
- **Note**: xAI team uses request logs during trial period to improve Grok Code

### 2. Code Supernova

- **Model ID**: `opencode/code-supernova`
- **Provider**: Anonymous frontier lab (stealth model)
- **Features**:
  - Multimodal support (accepts image inputs, screenshots, diagrams)
  - Built specifically for agentic coding
  - 200K context window
  - No usage limits or throttling during alpha
  - Versatile across full development stack
- **Pricing**: Completely free during alpha period
- **Note**: Stealth model where users opt-in to share usage data for model improvement

## OpenCode SDK Configuration

### Installing the SDK

```bash
npm install @opencode-ai/sdk
# or
bun install @opencode-ai/sdk
```

### Basic SDK Usage

```typescript
import { createOpencodeServer } from '@opencode-ai/sdk'

// Create a server instance
const server = createOpencodeServer({
  // Config overrides (still picks up opencode.json)
})

// Create a client
const client = server.client

// Create a session
const session = await client.session.create({
  body: { title: 'My coding session' }
})
```

### Sending Prompts with Specific Models

```typescript
// Using Grok Code Fast 1 (free)
const result1 = await client.session.prompt({
  path: { id: session.id },
  body: {
    model: {
      providerID: 'opencode',
      modelID: 'grok-code-fast-1'
    },
    parts: [
      {
        type: 'text',
        text: 'Build a React component for a todo list'
      }
    ]
  }
})

// Using Code Supernova (free)
const result2 = await client.session.prompt({
  path: { id: session.id },
  body: {
    model: {
      providerID: 'opencode',
      modelID: 'code-supernova'
    },
    parts: [
      {
        type: 'text',
        text: 'Debug this error'
      }
    ]
  }
})

// Using Claude Sonnet 4.5
const result3 = await client.session.prompt({
  path: { id: session.id },
  body: {
    model: {
      providerID: 'anthropic',
      modelID: 'claude-sonnet-4-20250514'
    },
    parts: [
      {
        type: 'text',
        text: 'Refactor this code'
      }
    ]
  }
})
```

### Querying Available Models

```typescript
// Get provider and model information
const { providers, default: defaults } = await client.config.providers()

// List available agents
const agents = await client.app.agents()

// Get current configuration
const config = await client.config.get()
```

## Configuration File (opencode.json)

### Location Options

1. **Global config**: `~/.config/opencode/opencode.json`
2. **Project config**: `./opencode.json` (in project root)
3. **Custom path**: Set `OPENCODE_CONFIG` environment variable

### Basic Configuration

```json
{
  "$schema": "https://opencode.ai/config.json",
  "model": "opencode/grok-code-fast-1",
  "small_model": "opencode/grok-code-fast-1",
  "theme": "opencode",
  "autoupdate": true
}
```

### Custom Provider Configuration

For xAI with direct API access:

```json
{
  "$schema": "https://opencode.ai/config.json",
  "provider": {
    "xai": {
      "npm": "@ai-sdk/xai",
      "name": "xAI",
      "options": {
        "baseURL": "https://api.x.ai/v1",
        "apiKey": "{env:XAI_API_KEY}"
      },
      "models": {
        "grok-code-fast-1": {
          "name": "Grok Code Fast 1",
          "reasoning": true,
          "tool_call": true,
          "cost": {
            "input": 0.2,
            "output": 1.5,
            "cache_read": 0.02
          }
        },
        "grok-4": {
          "name": "Grok 4",
          "reasoning": true,
          "tool_call": true
        }
      }
    }
  },
  "model": "xai/grok-code-fast-1"
}
```

### Using Environment Variables

```json
{
  "$schema": "https://opencode.ai/config.json",
  "provider": {
    "custom": {
      "npm": "@ai-sdk/openai-compatible",
      "options": {
        "apiKey": "{env:CUSTOM_API_KEY}",
        "baseURL": "{env:CUSTOM_BASE_URL}"
      }
    }
  }
}
```

### Agent-Specific Model Configuration

```json
{
  "$schema": "https://opencode.ai/config.json",
  "agent": {
    "build": {
      "model": "opencode/grok-code-fast-1",
      "description": "Full development work with fast iterations"
    },
    "plan": {
      "model": "anthropic/claude-sonnet-4-20250514",
      "description": "Planning and analysis without changes",
      "tools": {
        "write": false,
        "edit": false
      }
    }
  }
}
```

## Available xAI/Grok Models

If you have an xAI API key, these models are available:

| Model ID               | Description                       | Features                              |
| ---------------------- | --------------------------------- | ------------------------------------- |
| `grok-code-fast-1`     | Fast reasoning for agentic coding | Reasoning, Tool calling, 256K context |
| `grok-4`               | Most intelligent model            | Reasoning, Tool calling, Vision       |
| `grok-4-fast`          | Fast variant of Grok 4            | Reasoning, Tool calling               |
| `grok-3-mini-beta`     | Lightweight reasoning model       | Reasoning (low/high effort)           |
| `grok-2-vision-latest` | Vision model                      | Image support, 32K context            |

## Authentication

### For Free Models (OpenCode Partnership)

No authentication needed - just use `opencode/grok-code-fast-1` or `opencode/code-supernova`

### For Paid Providers

**CLI Method:**

```bash
opencode auth login
# Select provider from list
# Enter API key when prompted
```

**Environment Variables:**

```bash
export XAI_API_KEY="your-key-here"
export ANTHROPIC_API_KEY="your-key-here"
export OPENAI_API_KEY="your-key-here"
```

**Config File:**

```json
{
  "provider": {
    "xai": {
      "options": {
        "apiKey": "{env:XAI_API_KEY}"
      }
    }
  }
}
```

## Advanced SDK Features

### TypeScript Types

```typescript
import type { Session, Message, Part } from '@opencode-ai/sdk'

const session: Session = await client.session.create({
  body: { title: 'Typed session' }
})
```

### Error Handling

```typescript
try {
  const result = await client.session.prompt({
    path: { id: session.id },
    body: {
      model: { providerID: 'opencode', modelID: 'grok-code-fast-1' },
      parts: [{ type: 'text', text: 'Hello' }]
    }
  })
} catch (error) {
  console.error('Prompt failed:', error)
}
```

### Session Management

```typescript
// List all sessions
const sessions = await client.session.list()

// Get current project
const currentProject = await client.project.current()

// List all projects
const projects = await client.project.list()

// Get current path information
const pathInfo = await client.path.get()
```

### Logging

```typescript
await client.app.log({
  body: {
    service: 'my-app',
    level: 'info',
    message: 'Operation completed'
  }
})
```

## Finding Provider/Model IDs

### Method 1: CLI Command

```bash
opencode models
```

Output format: `provider_id/model_id`

### Method 2: TUI Command

In the OpenCode TUI, type:

```
/models
```

### Method 3: SDK Query

```typescript
const { providers } = await client.config.providers()
console.log(providers)
```

### Method 4: Check Models.dev

OpenCode uses Models.dev for provider/model listings:
https://models.dev

## Custom OpenAI-Compatible Providers

For any OpenAI-compatible API:

```json
{
  "$schema": "https://opencode.ai/config.json",
  "provider": {
    "custom-provider": {
      "npm": "@ai-sdk/openai-compatible",
      "name": "Custom Provider",
      "options": {
        "baseURL": "https://api.example.com/v1",
        "apiKey": "{env:CUSTOM_API_KEY}"
      },
      "models": {
        "custom-model": {
          "name": "Custom Model",
          "tool_call": true
        }
      }
    }
  },
  "model": "custom-provider/custom-model"
}
```

## Best Practices

### 1. Use Free Models for Testing

Start with `opencode/grok-code-fast-1` or `opencode/code-supernova` to test your integration without costs.

### 2. Environment Variables for API Keys

Never hardcode API keys - use environment variables:

```json
{
  "provider": {
    "xai": {
      "options": {
        "apiKey": "{env:XAI_API_KEY}"
      }
    }
  }
}
```

### 3. Project-Specific Configs

Use project-level `opencode.json` files for project-specific model preferences:

```json
{
  "$schema": "https://opencode.ai/config.json",
  "model": "opencode/code-supernova"
}
```

### 4. Agent-Based Model Selection

Configure different models for different agents:

- Fast models for iteration (Grok Code Fast)
- Powerful models for complex tasks (Claude Sonnet 4.5)
- Vision models when needed (Grok 2 Vision)

### 5. Monitor Free Period Status

Both free models are available "for a limited time" - check OpenCode documentation for updates.

## Troubleshooting

### Provider Not Found

1. Check `opencode auth list` to see configured providers
2. Verify provider ID matches config file
3. Ensure correct npm package (e.g., `@ai-sdk/xai` for xAI)

### Model Not Available

1. Run `opencode models` to see available models
2. Check if provider is disabled in config
3. Verify API key is set correctly

### API Key Issues

1. Check environment variables are set
2. Verify `~/.local/share/opencode/auth.json` for stored credentials
3. Try running `opencode auth login` again

## Additional Resources

- **OpenCode Docs**: https://opencode.ai/docs
- **Config Schema**: https://opencode.ai/config.json
- **SDK Documentation**: https://opencode.ai/docs/sdk
- **Provider Documentation**: https://opencode.ai/docs/providers
- **Models Documentation**: https://opencode.ai/docs/models
- **xAI API Docs**: https://docs.x.ai
- **AI SDK Documentation**: https://ai-sdk.dev

## Summary

OpenCode SDK provides powerful programmatic access to multiple AI providers. The key takeaways:

1. **Two free models available**: Grok Code Fast 1 and Code Supernova
2. **Model format**: `provider_id/model_id`
3. **SDK usage**: Configure models in `prompt()` calls with `providerID` and `modelID`
4. **Config file**: Optional `opencode.json` for defaults and provider setup
5. **Authentication**: Via CLI, environment variables, or config file
6. **TypeScript support**: Full type definitions included

Start with the free models to test your integration, then expand to other providers as needed!
