# Provider Configuration Guide

This document lists all supported AI model providers that can be configured in Toji.

## Common Providers

Quick-select buttons are available in the UI for these popular providers:

| Provider | ID | API Key URL | Notes |
|----------|-----|-------------|-------|
| OpenCode ZEN | `opencode` | https://opencode.ai/auth | Includes access to multiple AI models |
| Anthropic | `anthropic` | https://console.anthropic.com | Claude models |
| OpenAI | `openai` | https://platform.openai.com/api-keys | GPT models |
| Google | `google` | https://makersuite.google.com | Gemini models |
| DeepSeek | `deepseek` | https://platform.deepseek.com/ | DeepSeek models |
| Groq | `groq` | https://console.groq.com/ | Fast inference models |

## Other Supported Providers

These providers are also supported through OpenCode. Enter the provider ID manually:

- **Together**: `together` - https://api.together.xyz/
- **Fireworks**: `fireworksai` - https://fireworks.ai/
- **Cerebras**: `cerebras` - https://cerebras.ai/
- **OpenRouter**: `openrouter` - https://openrouter.ai/
- **Moonshot**: `moonshot` - https://moonshot.cn/
- **Azure OpenAI**: `azure` - https://azure.microsoft.com/en-us/products/ai-services/openai-service
- **AWS Bedrock**: `bedrock` - https://aws.amazon.com/bedrock/
- **GitHub Models**: `github-copilot` - https://github.com/marketplace/models
- **xAI**: `xai` - https://x.ai/
- **Z.ai**: `z.ai` - https://z.ai/

## Custom Providers

You can also add custom OpenAI-compatible API providers by:
1. Entering a unique provider ID
2. Providing your API key
3. The provider will appear in your model selection dropdown

## How to Add a Provider

1. Navigate to the **Integrations** view in Toji
2. Scroll to **OpenCode API Configuration**
3. Click **Add New API Key**
4. Select a common provider or enter a custom provider ID
5. Click the link to get your API key from the provider's website
6. Paste the API key into the field
7. Click **Save**

Your API keys are encrypted and synced securely with OpenCode.

## Model Organization

When you have multiple providers configured, models in the chat settings will be organized by provider in dropdown groups. If the same model ID exists across multiple providers, it will be labeled with the provider name for clarity (e.g., "Claude 3.5 Sonnet (Anthropic)" vs "Claude 3.5 Sonnet (OpenCode)").

## Troubleshooting

### No models appearing after adding API key
- Ensure the API key is valid and active
- Check that the provider ID matches exactly (case-sensitive)
- Try removing and re-adding the API key
- Click the refresh button in the Integrations view

### Multiple entries for the same provider
- Remove duplicate entries using the trash icon
- Only keep one API key per provider

### Custom provider not working
- Verify the provider uses OpenAI-compatible API format
- Check the provider's documentation for the correct API endpoint configuration
- Ensure your API key has the necessary permissions

## API Key Security

- All API keys are encrypted before storage
- Keys are synced securely through OpenCode's authentication system
- Keys are never transmitted in plain text
- You can remove API keys at any time through the UI
