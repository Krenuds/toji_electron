# Toji3

> **⚠️ Proof of Concept**: This is an early-stage proof of concept demonstrating the integration of OpenCode AI SDK with Discord and desktop interfaces. The full production version is under active development.

## About

Toji3 is an AI-powered development assistant desktop application that bridges the gap between conversational AI and your development workflow. Built on top of the [OpenCode SDK](https://github.com/sst/opencode), Toji3 provides a multi-interface approach to AI-assisted development through both a desktop GUI and Discord bot integration.

The application acts as a sophisticated wrapper around OpenCode, managing multiple project contexts, AI sessions, and providing seamless integration with Discord for team-based development workflows. It features real-time voice communication, project management, and session persistence, allowing developers to maintain context across conversations and collaborate naturally through voice or text.

Key capabilities include:

- **Desktop Interface**: Native Electron app with React-based UI for managing AI sessions and projects
- **Discord Integration**: Full-featured bot that exposes OpenCode capabilities in Discord servers
- **Voice Communication**: Real-time speech-to-text and text-to-speech for natural voice conversations with AI
- **Project Context Management**: Organize conversations by project with automatic OpenCode server management
- **Session Persistence**: All conversations are preserved and can be resumed at any time
- **MCP (Model Context Protocol) Support**: Extensible tool system for Discord channel management and more

## Architecture

Toji3 follows a **main-process-first architecture** where all business logic resides in the Electron main process, with interfaces (renderer, Discord bot) serving as thin presentation layers:

```
┌─────────────────────────────────────────────────────────────┐
│                         Main Process                        │
│  ┌────────────┐  ┌──────────────┐  ┌────────────────────┐ │
│  │ Toji Core  │  │ OpenCode SDK │  │ Discord Plugin     │ │
│  │  - Sessions│  │  - Servers   │  │  - Voice Module    │ │
│  │  - Projects│  │  - Clients   │  │  - Commands        │ │
│  │  - Config  │  │  - Sessions  │  │  - MCP Services    │ │
│  └────────────┘  └──────────────┘  └────────────────────┘ │
└─────────────────────────────────────────────────────────────┘
           ↑                    ↑                    ↑
           │ IPC                │ HTTP               │ Gateway
           ↓                    ↓                    ↓
  ┌─────────────────┐  ┌─────────────────┐  ┌───────────────┐
  │ Renderer (React)│  │ OpenCode Server │  │ Discord API   │
  │  - Chakra UI v3 │  │  - Port 4096+   │  │  - Voice/Text │
  │  - TypeScript   │  │  - Per-Project  │  │  - Slash Cmds │
  └─────────────────┘  └─────────────────┘  └───────────────┘
```

### Technology Stack

- **Electron 37.2**: Desktop application framework with Node.js integration
- **React 19.1**: Modern UI with hooks and concurrent features
- **TypeScript 5.8**: Strict typing across the entire codebase
- **Chakra UI v3**: Component library for consistent, accessible design
- **OpenCode SDK 0.9.6**: AI session management and conversation handling
- **Discord.js 14**: Full Discord API integration with voice support
- **Docker Services**: Whisper (STT) and Piper (TTS) for voice capabilities

## Installation

### For Users (Pre-built Release)

1. **Download the Installer**
   - Visit the [Releases page](https://github.com/krenuds/toji3/releases)
   - Download `Toji3-Setup-X.X.X.exe` for Windows
   - Download `Toji3-X.X.X.dmg` for macOS
   - Download `Toji3-X.X.X.AppImage` for Linux

2. **Install OpenCode Binary** (Required)

   ```bash
   # The app will prompt you to install on first run, or install manually:
   npm install -g @opencode-ai/cli
   ```

3. **Configure API Keys**
   - Launch Toji3
   - Navigate to Settings (gear icon)
   - Add your OpenAI API key (or other provider)
   - API keys are stored securely in your OS keychain

4. **Optional: Discord Integration**
   - Create a Discord application at [Discord Developer Portal](https://discord.com/developers)
   - Copy the Bot Token
   - Add it in Toji3 Settings → Discord Integration
   - Invite the bot to your server using the generated OAuth2 URL

5. **Optional: Voice Features** (Requires Docker)
   - Install [Docker Desktop](https://www.docker.com/products/docker-desktop)
   - Voice features will auto-initialize on first use
   - First-time setup builds Docker images (5-10 minutes)

### For Developers (Build from Source)

#### Prerequisites

- **Node.js 18+**: [Download](https://nodejs.org/)
- **Git**: [Download](https://git-scm.com/)
- **Visual Studio Build Tools** (Windows only): Required for native modules
- **Docker Desktop** (Optional): For voice features development

#### Setup Steps

1. **Clone the Repository**

   ```bash
   git clone https://github.com/krenuds/toji3.git
   cd toji3
   ```

2. **Install Dependencies**

   ```bash
   npm install
   ```

3. **Install OpenCode CLI**

   ```bash
   npm install -g @opencode-ai/cli
   ```

4. **Configure Development Environment**

   ```bash
   # Create .env file (optional, for custom configs)
   cp .env.example .env

   # Edit .env with your preferences
   ```

5. **Run Development Server**

   ```bash
   npm run dev
   ```

   This starts:
   - Electron main process with hot reload
   - Vite dev server for renderer (React)
   - TypeScript watch mode for type checking

#### Development Workflow

```bash
# Format code (Prettier)
npm run format

# Lint code (ESLint)
npm run lint

# Type check
npm run typecheck        # Check all
npm run typecheck:node   # Check main/preload only
npm run typecheck:web    # Check renderer only

# Generate architecture visualization
npm run graph

# Build for production
npm run build:win        # Windows
npm run build:mac        # macOS
npm run build:linux      # Linux
```

#### Quality Gates (Run Before Committing)

```bash
npm run format && npm run lint && npm run typecheck
```

All three must pass with zero errors before committing.

## Project Structure

```
toji3/
├── src/
│   ├── main/                    # Electron main process
│   │   ├── index.ts            # Entry point, IPC handler registration
│   │   ├── toji/               # Core Toji API (OpenCode integration)
│   │   │   ├── index.ts        # Main Toji class
│   │   │   ├── sessions.ts     # Session management
│   │   │   ├── project.ts      # Project lifecycle
│   │   │   ├── server.ts       # OpenCode server manager
│   │   │   └── mcp/            # Model Context Protocol tools
│   │   ├── handlers/           # IPC handlers (thin wrappers)
│   │   ├── services/           # Supporting services
│   │   │   ├── discord-service.ts
│   │   │   ├── docker-service-manager.ts
│   │   │   ├── whisper-client.ts
│   │   │   └── piper-client.ts
│   │   ├── config/             # Configuration management
│   │   └── utils/              # Utilities (logger, paths, etc.)
│   │
│   ├── preload/                 # Electron preload scripts
│   │   ├── index.ts            # Main preload entry
│   │   └── api/                # Type-safe IPC API definitions
│   │
│   ├── renderer/                # React frontend
│   │   └── src/
│   │       ├── components/     # React components
│   │       │   ├── views/      # Main views (Chat, Integrations)
│   │       │   └── shared/     # Reusable components
│   │       ├── hooks/          # Custom React hooks
│   │       ├── contexts/       # React Context providers
│   │       └── theme.ts        # Chakra UI theme tokens
│   │
│   └── plugins/                 # Interface plugins
│       └── discord/            # Discord bot plugin
│           ├── DiscordPlugin.ts
│           ├── commands/       # Slash commands
│           ├── modules/        # Feature modules
│           └── voice/          # Voice communication
│
├── resources/                   # Static resources
│   └── docker-services/        # Docker configs for STT/TTS
│       ├── whisper-service/    # Speech-to-text (Whisper)
│       └── piper-service/      # Text-to-speech (Piper)
│
├── docs/                        # Project documentation
│   ├── refactoring/            # Refactoring initiative docs
│   ├── guides/                 # Usage guides and best practices
│   └── README.md               # Documentation index
│
├── SPEC/                        # Technical specifications
│   ├── OPENCODE.md             # OpenCode SDK integration
│   ├── DISCORD_VOICE_SYSTEM.md # Voice feature architecture
│   ├── FRONTEND.md             # React/Chakra UI guidelines
│   └── STTTTS.md               # Speech services implementation
│
└── graphs/                      # Architecture visualizations
    └── AGENTS.md               # Development agent guidelines
```

## Key Concepts

### Projects

Projects are the top-level organizational unit in Toji3. Each project:

- Has its own OpenCode server instance (dedicated port)
- Maintains separate session history
- Can have its own `opencode.json` configuration
- Gets a dedicated Discord category and channels (if Discord enabled)

### Sessions

Sessions represent individual conversations with the AI:

- Scoped to a specific project
- Persist across app restarts
- Can be resumed at any time
- Support branching conversations
- Include full message history with tool calls

### MCP Tools

Model Context Protocol tools extend OpenCode's capabilities:

- **Discord Tools**: Message sending, channel management, search
- **Session Tools**: Read/list past sessions
- **Project Tools**: Initialize new projects with Git
- Extensible architecture for custom tools

### Voice Communication

Voice features use Docker-based services:

- **Whisper**: OpenAI's speech recognition (STT)
- **Piper**: High-quality text-to-speech (TTS)
- Real-time processing with VAD (Voice Activity Detection)
- Automatic transcription embeds in Discord channels

## Development Guidelines

### Architecture Principles

1. **Main Process First**: All business logic lives in main process
2. **Thin IPC Handlers**: Maximum 5 lines, just forward to Toji class
3. **Chakra UI Exclusively**: No CSS files, no inline styles
4. **Full TypeScript Typing**: Never use `any` at boundaries
5. **Hooks Abstract window.api**: Components never access window.api directly

### Code Style

- **Formatting**: Prettier with 100 character line length
- **Linting**: ESLint with TypeScript rules
- **Commits**: Conventional commit format (`feat:`, `fix:`, `docs:`, etc.)
- **Type Safety**: Strict TypeScript mode enforced

### Testing

```bash
# Run linting
npm run lint

# Type checking
npm run typecheck

# Architecture validation
npm run graph  # Check for dependency violations
```

### Adding Features

1. **Research**: Check relevant specs in `SPEC/` folder
2. **Plan**: Design with proper separation of concerns
3. **Implement**: Follow this order:
   - API Layer (Toji class method)
   - IPC Handler (thin wrapper)
   - Preload Bridge (type-safe exposure)
   - UI Hook (abstract window.api)
   - View Component (use hook)
4. **Quality Gates**: Format → Lint → Type check
5. **Document**: Update relevant spec files
6. **Commit**: Use conventional commit format

## Configuration

### Application Config

Located at `%APPDATA%/toji3/config.json` (Windows) or `~/Library/Application Support/toji3/config.json` (macOS):

```json
{
  "currentProject": "path/to/project",
  "windowState": { ... },
  "theme": "dark"
}
```

### Project Config (`opencode.json`)

Each project can have its own OpenCode configuration:

```json
{
  "model": "anthropic/claude-3-5-sonnet-20241022",
  "temperature": 0.7,
  "mcpServers": {
    "toji-mcp": {
      "type": "http",
      "url": "http://localhost:3100"
    }
  }
}
```

### Discord Bot Config

Store Discord bot token in Settings:

- Token is encrypted and stored in OS keychain
- Automatically reconnects on app restart
- Supports multiple servers simultaneously

## Troubleshooting

### OpenCode Binary Not Found

```bash
# Install globally
npm install -g @opencode-ai/cli

# Verify installation
opencode --version
```

### Voice Features Not Working

**Development Mode**: Voice works out of the box with `npm run dev`

**Production Mode**: Known limitation - Docker PATH issues in packaged apps

- Voice features currently only work in development
- Production voice support is under development

### Discord Bot Not Connecting

1. Check token is valid in Discord Developer Portal
2. Verify bot has required intents enabled:
   - GUILDS
   - GUILD_MESSAGES
   - GUILD_VOICE_STATES
   - MESSAGE_CONTENT
3. Check logs: `%APPDATA%/toji3/logs/` (Windows)

### Build Errors

```bash
# Clean install
rm -rf node_modules package-lock.json
npm install

# Rebuild native modules
npm run postinstall
```

## Logs

Application logs are stored at:

- **Windows**: `C:\Users\{user}\AppData\Roaming\toji3\logs\`
- **macOS**: `~/Library/Application Support/toji3/logs/`
- **Linux**: `~/.config/toji3/logs/`

Log files are named `toji-YYYY-MM-DD.log` and include:

- Startup sequence
- OpenCode server status
- Discord connection events
- Session operations
- Error stack traces

## Contributing

This is a proof-of-concept project demonstrating architecture patterns. The production version is under development. However, we welcome:

- Bug reports
- Architecture feedback
- Documentation improvements
- Feature suggestions

Please open issues on GitHub for any feedback.

## Roadmap

**Current Status**: Proof of Concept (v0.2.0)

**Planned for Production Version**:

- [ ] Production-ready voice services (no Docker dependency)
- [ ] Multi-user workspace support
- [ ] Cloud sync for sessions and projects
- [ ] Plugin marketplace for custom MCP tools
- [ ] Team collaboration features
- [ ] Advanced prompt engineering tools
- [ ] Session branching and merging UI
- [ ] Export conversations to various formats
- [ ] Web-based interface (alongside desktop)
- [ ] Mobile companion app

## License

See LICENSE file for details.

## Acknowledgments

- **OpenCode SDK**: [github.com/sst/opencode](https://github.com/sst/opencode)
- **Discord.js**: [discord.js.org](https://discord.js.org)
- **Whisper**: [github.com/openai/whisper](https://github.com/openai/whisper)
- **Piper TTS**: [github.com/rhasspy/piper](https://github.com/rhasspy/piper)

## Documentation

### 📚 Complete Documentation Index

See [`docs/README.md`](docs/README.md) for the complete documentation index.

### 🔧 Refactoring Documentation

- **Architecture Assessment**: [`docs/refactoring/ARCHITECTURAL_ASSESSMENT.md`](docs/refactoring/ARCHITECTURAL_ASSESSMENT.md)
- **Bug Inventory**: [`docs/refactoring/BUGS_AND_ISSUES.md`](docs/refactoring/BUGS_AND_ISSUES.md)
- **Refactoring Plan**: [`docs/refactoring/REFACTORING_PLAN.md`](docs/refactoring/REFACTORING_PLAN.md)
- **Complete Summary**: [`docs/refactoring/REFACTORING_COMPLETE_SUMMARY.md`](docs/refactoring/REFACTORING_COMPLETE_SUMMARY.md)

### 📖 Usage Guides

- **Kilo Code Usage**: [`docs/guides/KILO_CODE_USAGE.md`](docs/guides/KILO_CODE_USAGE.md)
- **Context Optimization**: [`docs/guides/KILO_CODE_CONTEXT_OPTIMIZATION.md`](docs/guides/KILO_CODE_CONTEXT_OPTIMIZATION.md)

### 📋 Technical Specifications

See [`SPEC/`](SPEC/) folder for detailed technical specifications.

## Support

- **Documentation**: See [`docs/`](docs/) and [`SPEC/`](SPEC/) folders
- **Issues**: [GitHub Issues](https://github.com/krenuds/toji3/issues)
- **Architecture Diagrams**: Run `npm run graph` to generate

---

**Note**: This proof of concept demonstrates the feasibility of the architecture and integration patterns. The production version will include significant enhancements to reliability, scalability, and user experience.
