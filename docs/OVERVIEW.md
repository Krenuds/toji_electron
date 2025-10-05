# Toji Project Overview

**Modern AI-powered development assistant combining MCP tools, Discord bot, and voice interaction.**

---

## What is Toji?

Toji is an Electron-based desktop application that serves as your AI coding companion. It combines:

- **Toji MCP Server** - Model Context Protocol tools for project management
- **Discord Bot** - Slash commands and voice chat integration
- **Voice Features** - Text-to-Speech (OpenAI) and Speech-to-Text (Whisper)
- **Modern UI** - React with Chakra UI components
- **Multi-Project Support** - Manage multiple coding projects simultaneously

---

## Core Features

### 1. Project Management
- Initialize and manage multiple projects
- Session history and context switching
- Persistent configuration via `opencode.json`

### 2. Discord Integration
- Slash commands (`/init`, `/project`, `/help`, `/voice`, `/clear`)
- Voice channel connectivity with TTS output
- Message search and file upload
- Category-based organization

### 3. Voice Features
- **TTS**: OpenAI voices (ballad, alloy, echo, etc.) with streaming
- **STT**: Local Whisper transcription (in development)
- **Voice Commands**: Speak to Toji in Discord voice channels

### 4. MCP Tools
- `initialize-project` - Create new projects
- `list-sessions` - View project sessions
- `read-session` - Access session history
- `discord-*` - Discord operations (search, upload, etc.)
- `clear-session` - Clean up sessions

---

## Technology Stack

### Frontend
- **Electron** - Desktop application framework
- **React 18** - UI library
- **Chakra UI** - Component library
- **TypeScript** - Type safety

### Backend (Main Process)
- **Node.js** - Runtime
- **Discord.js** - Discord bot framework
- **OpenAI SDK** - TTS integration
- **whisper.cpp** - Local STT (planned)
- **MCP Protocol** - Tool communication

### Build Tools
- **electron-vite** - Fast bundling
- **TypeScript** - Type checking
- **ESLint** - Code linting

---

## Architecture

```
┌─────────────────────────────────────────┐
│         Electron Renderer               │
│    (React + Chakra UI Frontend)         │
└────────────────┬────────────────────────┘
                 │ IPC
┌────────────────┴────────────────────────┐
│         Electron Main Process           │
│                                          │
│  ┌────────────────────────────────────┐ │
│  │ Toji MCP Server                    │ │
│  │  - Project initialization          │ │
│  │  - Session management              │ │
│  │  - Tool routing                    │ │
│  └────────────────────────────────────┘ │
│                                          │
│  ┌────────────────────────────────────┐ │
│  │ Discord Bot Service                │ │
│  │  - Slash commands                  │ │
│  │  - Voice integration               │ │
│  │  - Message handling                │ │
│  └────────────────────────────────────┘ │
│                                          │
│  ┌────────────────────────────────────┐ │
│  │ TTS Service (OpenAI)               │ │
│  │  - Voice selection                 │ │
│  │  - Audio streaming                 │ │
│  │  - Discord voice output            │ │
│  └────────────────────────────────────┘ │
│                                          │
│  ┌────────────────────────────────────┐ │
│  │ STT Service (Whisper) [Planned]    │ │
│  │  - Local transcription             │ │
│  │  - Voice commands                  │ │
│  └────────────────────────────────────┘ │
└─────────────────────────────────────────┘
```

---

## Project Structure

```
toji_electron/
├── src/
│   ├── main/              # Electron main process
│   │   ├── index.ts       # Entry point
│   │   ├── services/      # Core services (Discord, TTS, STT)
│   │   ├── handlers/      # IPC handlers
│   │   ├── toji/          # MCP server implementation
│   │   └── utils/         # Utilities (logger, paths)
│   │
│   ├── preload/           # IPC bridge
│   │   ├── index.ts
│   │   └── api/           # Exposed APIs
│   │
│   ├── renderer/          # React frontend
│   │   ├── src/
│   │   │   ├── components/  # UI components
│   │   │   ├── hooks/       # React hooks
│   │   │   ├── contexts/    # React contexts
│   │   │   └── theme.ts     # Chakra theme
│   │   └── index.html
│   │
│   └── plugins/           # Discord plugin
│       └── discord/
│           ├── DiscordPlugin.ts
│           ├── commands/     # Slash commands
│           ├── modules/      # Discord modules
│           └── voice/        # Voice system
│
├── docs/                  # Documentation (NEW!)
├── SPEC/                  # Legacy specs (archived)
├── resources/             # Static resources
└── build/                 # Build artifacts
```

---

## Development Workflow

### 1. Planning
- Create spec in `docs/implementation/`
- Define architecture in `docs/architecture/`
- Document features in `docs/features/`

### 2. Implementation
1. Write code in small increments
2. Run linting: `npm run lint`
3. Type check: `npm run typecheck:node`
4. Test functionality
5. Commit with conventional commits

### 3. Testing
- Unit tests for services
- Integration tests for IPC
- Manual testing in dev mode
- Test on all platforms (Windows/macOS/Linux)

### 4. Documentation
- Update relevant docs in `docs/`
- Add examples and screenshots
- Update README if needed

---

## Key Concepts

### MCP (Model Context Protocol)
Communication standard for AI tools. Toji implements:
- Tools (functions AI can call)
- Resources (data AI can access)
- Prompts (pre-defined interactions)

### OpenCode Configuration
`opencode.json` stores:
- API keys (OpenAI, Discord)
- Project settings
- Voice preferences
- Discord configurations

### Session Management
Each project has sessions that track:
- Conversation history
- Tool invocations
- Context switches

### Discord Integration
Bot runs in main process, communicates via:
- Slash commands (user input)
- Voice channels (TTS output)
- Text channels (message search, uploads)

---

## Configuration

### Required API Keys
```json
{
  "apiKeys": {
    "openai": "sk-...",      // For TTS
    "discord": "Bot ..."     // For Discord bot
  }
}
```

### Voice Configuration
```json
{
  "voice": {
    "model": "gpt-4o-mini-tts",
    "voice": "ballad",
    "speed": 1.0,
    "format": "pcm"
  }
}
```

### Discord Configuration
```json
{
  "discord": {
    "guildId": "...",
    "clientId": "...",
    "autoJoinVoice": true
  }
}
```

---

## Development Phases

### Phase 1: Core Platform ✅
- Electron setup
- MCP server
- Project management
- Basic UI

### Phase 2: Discord + TTS ✅
- Discord bot with slash commands
- Voice channel integration
- OpenAI TTS streaming
- Voice module with audio playback

### Phase 3: STT 🚧 (Current)
- Local Whisper integration
- Voice command detection
- Real-time transcription

### Phase 4: Advanced Features ⏳
- Speaker diarization
- Multi-language support
- Custom voice training
- Advanced MCP tools

---

## Use Cases

### 1. Solo Developer
- Ask questions about your codebase
- Get code suggestions via Discord
- Hear responses in voice chat
- Manage multiple projects

### 2. Team Collaboration
- Share Toji bot in team Discord
- Voice-based code reviews
- Project documentation generation
- Automated task tracking

### 3. Learning & Exploration
- Interactive coding tutorials
- Voice-guided walkthroughs
- Contextual help in Discord
- Session history for review

---

## Getting Started

See [Quick Start Guide](./quickstart/README.md) for:
1. Installation steps
2. API key setup
3. Discord bot configuration
4. Your first project

---

## Contributing

See [Contributing Guide](./CONTRIBUTING.md) for:
- Code style standards
- Pull request process
- Testing requirements
- Documentation standards

---

## License

MIT License - See LICENSE file

---

## Links

- **Documentation**: [docs/README.md](./README.md)
- **GitHub**: https://github.com/Krenuds/toji_electron
- **Discord**: [Join our server]
- **Issues**: [GitHub Issues](https://github.com/Krenuds/toji_electron/issues)

---

**Last Updated:** October 4, 2025
