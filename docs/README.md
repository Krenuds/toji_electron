# Toji Documentation

**Modern AI Development Assistant with Discord Integration**

---

## 📚 Documentation Structure

### Getting Started
- [Quick Start Guide](./quickstart/README.md) - Get up and running in 5 minutes
- [Project Overview](./OVERVIEW.md) - What is Toji?
- [Installation](./quickstart/INSTALLATION.md) - Setup instructions

### Architecture
- [System Architecture](./architecture/SYSTEM.md) - High-level design
- [Frontend Architecture](./architecture/FRONTEND.md) - React + Chakra UI
- [MCP Tools](./architecture/MCP.md) - Model Context Protocol integration
- [Discord Integration](./architecture/DISCORD.md) - Bot architecture

### Features
- [Discord Bot](./features/DISCORD.md) - Commands, voice, embeds
- [Text-to-Speech (TTS)](./features/TTS.md) - OpenAI TTS integration
- [Speech-to-Text (STT)](./features/STT.md) - Local Whisper implementation
- [Project Management](./features/PROJECTS.md) - Multi-project support
- [OpenCode Integration](./features/OPENCODE.md) - AI coding assistant

### Implementation Guides
- [Phase 2: TTS Implementation](./implementation/PHASE2_TTS.md) - Complete TTS guide
- [Phase 3: STT Implementation](./implementation/PHASE3_STT.md) - Complete STT guide
- [Development Workflow](./implementation/WORKFLOW.md) - Best practices

---

## 🎯 Quick Links by Role

### For Developers
1. [Quick Start](./quickstart/README.md)
2. [System Architecture](./architecture/SYSTEM.md)
3. [Development Workflow](./implementation/WORKFLOW.md)

### For Users
1. [What is Toji?](./OVERVIEW.md)
2. [Discord Bot Guide](./features/DISCORD.md)
3. [Voice Features](./features/TTS.md)

### For Contributors
1. [Contributing Guide](./CONTRIBUTING.md)
2. [Code Standards](./implementation/WORKFLOW.md)
3. [Testing Guide](./implementation/TESTING.md)

---

## 📖 Complete Documentation Map

```
docs/
├── README.md (this file)
├── OVERVIEW.md - Project overview
├── CONTRIBUTING.md - How to contribute
│
├── quickstart/
│   ├── README.md - Quick start guide
│   ├── INSTALLATION.md - Installation steps
│   └── FIRST_STEPS.md - Your first project
│
├── architecture/
│   ├── SYSTEM.md - System architecture
│   ├── FRONTEND.md - Frontend design
│   ├── MCP.md - MCP tools
│   └── DISCORD.md - Discord bot
│
├── features/
│   ├── DISCORD.md - Discord features
│   ├── TTS.md - Text-to-speech
│   ├── STT.md - Speech-to-text
│   ├── PROJECTS.md - Project management
│   └── OPENCODE.md - OpenCode AI
│
└── implementation/
    ├── PHASE2_TTS.md - TTS implementation
    ├── PHASE3_STT.md - STT implementation
    ├── WORKFLOW.md - Development workflow
    └── TESTING.md - Testing guide
```

---

## 🚀 Current Status

### Completed (Phase 1-2)
- ✅ Core Toji MCP server
- ✅ Discord bot with slash commands
- ✅ Discord voice integration
- ✅ Text-to-Speech (OpenAI TTS)
- ✅ Project management
- ✅ Frontend UI (React + Chakra)

### In Progress (Phase 3)
- 🚧 Speech-to-Text (Whisper)
- 🚧 Voice command system

### Planned (Phase 4+)
- ⏳ Speaker diarization
- ⏳ Multi-language support
- ⏳ Advanced voice commands

---

## 🔍 Finding What You Need

### I want to...

**...understand what Toji does**
→ [Project Overview](./OVERVIEW.md)

**...set up the project locally**
→ [Quick Start Guide](./quickstart/README.md)

**...understand the architecture**
→ [System Architecture](./architecture/SYSTEM.md)

**...implement a new feature**
→ [Development Workflow](./implementation/WORKFLOW.md)

**...work with Discord voice**
→ [Discord Bot Guide](./features/DISCORD.md)

**...add TTS functionality**
→ [TTS Feature Guide](./features/TTS.md)

**...implement STT**
→ [STT Implementation](./implementation/PHASE3_STT.md)

**...understand MCP tools**
→ [MCP Architecture](./architecture/MCP.md)

---

## 📝 Documentation Standards

### File Organization
- **quickstart/** - For getting started quickly
- **architecture/** - System design and structure
- **features/** - User-facing features
- **implementation/** - Development guides

### Naming Conventions
- Use `UPPERCASE.md` for main documents
- Use descriptive names (DISCORD.md not BOT.md)
- Phase docs: `PHASE#_FEATURE.md`

### Content Standards
- Start with TL;DR or overview
- Include code examples
- Link related documents
- Keep under 500 lines per file

---

## 🤝 Contributing to Docs

See [CONTRIBUTING.md](./CONTRIBUTING.md) for:
- Documentation style guide
- How to propose changes
- Review process
- Building documentation locally

---

## 📜 Legacy Documentation

Old SPEC files are archived in `/SPEC` folder for reference:
- Historical implementation plans
- Research notes
- Deprecated features

**Use the new `/docs` structure for current documentation.**

---

## 🆘 Need Help?

- Check the [FAQ](./FAQ.md)
- Review [Troubleshooting](./TROUBLESHOOTING.md)
- Ask in Discord server
- Open a GitHub issue

---

**Last Updated:** October 4, 2025
**Version:** 3.0 (Post-Phase 3 Reorganization)
