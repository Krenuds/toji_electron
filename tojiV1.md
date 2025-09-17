# Toji Voice Assistant

> **Voice-first computer interface via Discord**
> Talk naturally → Claude executes → Results spoken back

## 🚀 Quick Start

Choose your platform:

### 🐧 Linux

```bash
# Download and extract
curl -L https://github.com/Krenuds/Toji/releases/latest/download/toji-bot-linux-x64.tar.gz | tar -xz
cd toji-bot

# Run once to create config
./toji-bot
```

### 🍎 macOS

```bash
# Download and extract
curl -L https://github.com/Krenuds/Toji/releases/latest/download/toji-bot-macos-x64.tar.gz | tar -xz
cd toji-bot

# Run once to create config
./toji-bot
```

### 🪟 Windows

1. **Download**: [toji-bot-windows.zip](https://github.com/Krenuds/Toji/releases/latest)
2. **Extract** the zip file to a folder
3. **Open Command Prompt** in that folder
4. **Run**: `toji-bot.exe` to create config

---

### For All Platforms:

#### Step 2: Get Discord Bot Token

1. Go to https://discord.com/developers/applications
2. Create "New Application" → Add Bot → Reset Token
3. Copy the token (looks like `MTIzNDU2...xyz`)

#### Step 3: Configure

Edit the config file that was created:

**Linux/macOS:**

```bash
nano config/settings.yaml
```

**Windows:**

```cmd
notepad config\settings.yaml
```

Add your token:

```yaml
discord:
  token: 'YOUR_BOT_TOKEN_HERE'
```

#### Step 4: Start

**Linux/macOS:**

```bash
./toji-bot
```

**Windows:**

```cmd
toji-bot.exe
```

**That's it!** Invite your bot to Discord and start talking.

---

## 📋 What You Need

- **Discord bot token** (free - 5 minutes to create)
- **Claude CLI** authenticated (`claude login`)
- **Linux/macOS** (Windows via WSL)

**Optional:** Docker for voice services (otherwise text-only)

---

## 🎯 How It Works

1. **Join voice channel** where your bot has permissions
2. **Talk naturally**: "What's the weather?" or "Debug this Python code"
3. **Get response** in ~500ms via voice

### Commands

- **Voice**: Say "listen" to activate
- **Slash**: `/join` `/leave` `/workspace`

---

## 🔧 Development Setup

<details>
<summary><strong>Click to expand full development guide</strong></summary>

### Prerequisites

**Required Software:**

1. **Python 3.8+** with pip
2. **Claude CLI** - authenticated and working
3. **Docker & Docker Compose** - for voice services if you want them
4. **Discord Account** - for bot creation

**Required Accounts:**

- **Discord Developer Account** (free)
- **Claude AI Account** (for Claude CLI)

### 1. Clone & Install Dependencies

```bash
git clone https://github.com/Krenuds/Toji.git
cd Toji

# Create virtual environment
python3 -m venv toji_venv
source toji_venv/bin/activate  # Linux/Mac
# or: toji_venv\Scripts\activate  # Windows

# Install dependencies
pip install -r requirements.txt
```

### 2. Set Up Voice Services (Optional)

Toji requires external STT/TTS services for voice. Use the pre-built services:

```bash
# Clone the services repository
git clone https://github.com/Krenuds/blindr-services.git
cd blindr-services

# Start both services (requires Docker)
docker-compose up -d

# Verify services are running
curl http://localhost:9000/health  # Whisper STT
curl http://localhost:9001/health  # Piper TTS
```

This gives you:

- **Whisper STT** on port 9000
- **Piper TTS** on port 9001

### 3. Install & Authenticate Claude CLI

```bash
# Install Claude CLI (follow official instructions)
curl -sSL https://claude.ai/install.sh | bash

# Authenticate with your Claude account
claude login

# Verify it works
claude status
```

### 4. Create Discord Bot

#### 4.1. Create Bot Application

1. Go to https://discord.com/developers/applications
2. Click **"New Application"**
3. Name it (e.g., "My Toji Bot")
4. Click **"Create"**

#### 4.2. Create Bot User & Get Token

1. Go to **"Bot"** tab in left sidebar
2. Click **"Add Bot"** → **"Yes, do it!"**
3. Click **"Reset Token"** and copy the token that appears
4. **Save this token securely - you'll use it in step 5**

The token looks like: `MTIzNDU2Nzg5MDEyMzQ1Njc4.GhIjKl.MnOpQrStUvWxYzAbCdEfGhIjKlMnOpQrStUvWxYz`

⚠️ **Never share your bot token publicly or commit it to version control!**

#### 4.3. Configure Bot Settings

In the Bot section:

- ✅ Enable **"Public Bot"** (if you want others to invite it)
- ✅ Enable **"Message Content Intent"**
- ✅ Enable **"Server Members Intent"**
- ✅ Enable **"Presence Intent"**

#### 4.4. Set Bot Permissions

1. Go to **"OAuth2"** → **"URL Generator"**
2. Select **"bot"** under Scopes
3. Select these Bot Permissions:
   - ✅ Send Messages
   - ✅ Use Slash Commands
   - ✅ Connect (voice)
   - ✅ Speak (voice)
   - ✅ Use Voice Activity
   - ✅ Read Message History
   - ✅ View Channels

#### 4.5. Invite Bot to Your Server

1. Copy the generated URL at bottom of OAuth2 page
2. Open URL in browser
3. Select your Discord server
4. Authorize the bot

### 5. Configure Toji

Create your configuration file:

```bash
# Copy template
cp config/settings.template.yaml config/settings.yaml

# Edit with your bot token
nano config/settings.yaml
```

**Configure your Discord bot token:**

Open `config/settings.yaml` and add your bot token from step 4:

```yaml
discord:
  token: 'MTIzNDU2Nzg5MDEyMzQ1Njc4.GhIjKl.MnOpQrStUvWxYzAbCdEfGhIjKlMnOpQrStUvWxYz'

whisper:
  service_url: 'http://localhost:9000'

tts:
  service_url: 'http://localhost:9001'

llm:
  enabled: true
```

⚠️ **Replace the example token above with your actual bot token from Discord Developer Portal!**

**Alternative: Use environment variables**

```bash
export DISCORD_BOT_TOKEN="your_actual_bot_token_here"
export WHISPER_SERVICE_URL="http://localhost:9000"
export PIPER_SERVICE_URL="http://localhost:9001"
```

### 6. Run Toji

```bash
# Activate virtual environment (if not already)
source toji_venv/bin/activate

# Start the bot
./toji start

# Check if running
./toji status

# View logs
./toji logs

# Stop when done
./toji stop
```

### Project Structure

```
toji/
├── main.py              # Entry point
├── src/
│   ├── toji.py          # Main bot class
│   ├── bot/             # Discord bot logic
│   ├── voice/           # Voice processing
│   ├── llm/             # Claude integration
│   └── config/          # Configuration system
├── config/
│   ├── settings.yaml    # Your configuration
│   └── settings.template.yaml
└── toji                 # Control script
```

### Running in Development

```bash
# Direct Python execution
python main.py

# With debug logging
LOG_LEVEL=DEBUG python main.py

# With specific environment
DISCORD_BOT_TOKEN=your_token python main.py
```

### Configuration Options

The `config/settings.template.yaml` file contains full configuration documentation. Key sections:

- **Discord**: Bot behavior, timeouts, colors
- **Audio**: Voice processing parameters
- **Services**: STT/TTS service URLs
- **LLM**: Claude integration settings
- **Workspaces**: Conversation context management

</details>

---

## 🚨 Troubleshooting

### Bot Won't Start

```bash
# Check Claude CLI
claude status

# Check Discord token
echo $DISCORD_BOT_TOKEN

# Check Python environment
which python
pip list | grep -E "(py-cord|aiohttp)"
```

### Voice Not Working

1. **Bot not in voice channel**: Use `/join`
2. **Missing permissions**: Check bot has Connect + Speak permissions
3. **Service issues**: Restart voice services with `docker-compose restart`

### Common Issues

- **"ModuleNotFoundError"**: Activate virtual environment with `source toji_venv/bin/activate`
- **"Permission denied"**: Make sure bot has required Discord permissions
- **"Connection refused"**: Voice services aren't running - start with `docker-compose up -d`
- **"Invalid token"**: Double-check your Discord bot token

---

## 📚 Architecture

```
Discord Voice → Whisper (9000) → Claude CLI → Piper (9001) → Discord Audio
      ↓              ↓                ↓            ↓              ↓
   Bot listens   Speech→Text    AI Processing  Text→Speech   Audio output
```

This is a **personal bot instance**:

- You own the Discord bot
- You control the voice services
- Data stays on your infrastructure
- Only Claude API calls go external

---

**Need help?** Open an issue at https://github.com/Krenuds/Toji/issues
