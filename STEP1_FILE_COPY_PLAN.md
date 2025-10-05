# Step 1: File Copy Plan from toji-services

## ✅ What We Know

We've examined the complete **toji-services** GitHub repository and identified all files we need to copy.

## 📋 Files to Copy

### Whisper Service (5 files)

| File | Lines | Purpose |
|------|-------|---------|
| `service.py` | 369 | Complete FastAPI service with GPU-accelerated transcription |
| `config.py` | 32 | Pydantic configuration management |
| `logger.py` | 38 | Simplified logging setup |
| `requirements.txt` | 13 | Python dependencies (fastapi, torch, faster-whisper) |
| `Dockerfile` | 101 | Multi-stage build with CUDA support |

### Piper Service (5 files)

| File | Lines | Purpose |
|------|-------|---------|
| `service.py` | 326 | Complete FastAPI service with voice model management |
| `config.py` | 190 | Configuration + extended voice catalog |
| `start.py` | 47 | Startup script with validation |
| `requirements.txt` | 16 | Python dependencies (fastapi, piper-tts) |
| `Dockerfile` | 111 | Multi-stage CPU-optimized build |

### Root Files (1 file - already exists, needs merge)

| File | Lines | Purpose |
|------|-------|---------|
| `docker-compose.yml` | 65 | Service orchestration (we already have one) |

## 🎯 Next Action: Copy Whisper Service Files

Let's start with **Whisper** (simpler - already a service):

```powershell
# We'll fetch each file from GitHub and save it locally
# Files needed:
# 1. resources/docker-services/whisper-service/service.py
# 2. resources/docker-services/whisper-service/config.py
# 3. resources/docker-services/whisper-service/logger.py
# 4. resources/docker-services/whisper-service/requirements.txt
# 5. resources/docker-services/whisper-service/Dockerfile
```

## 📝 Requirements.txt Contents

### Whisper Service
```
# Core web service dependencies
fastapi>=0.104.0
uvicorn[standard]>=0.24.0
pydantic>=2.5.0
python-multipart>=0.0.6

# Speech processing - Whisper with GPU acceleration
torch>=2.1.0
torchaudio>=2.1.0
faster-whisper>=1.0.0

# Environment and configuration
python-dotenv>=1.0.0

# Utilities
typing-extensions>=4.8.0
```

### Piper Service
```
# Core API framework
fastapi==0.104.1
uvicorn[standard]==0.24.0

# Request/response models
pydantic==2.5.0

# Piper TTS core
piper-tts==1.2.0

# Audio processing
# wave is included in Python standard library

# HTTP client for model downloads
urllib3==2.1.0

# Async support
asyncio
```

## ⚠️ Important Notes

1. **Don't copy docker-compose.yml yet** - We already have one that we created. We'll need to compare and merge.
2. **Start with Whisper** - It's simpler (already a FastAPI service)
3. **Test each step** - We want to validate as we go
4. **Check Docker installation** - We'll need Docker to test builds

## 🚀 Success Criteria for Step 1

- [ ] All 5 Whisper service files copied and saved
- [ ] All 5 Piper service files copied and saved
- [ ] Files are in correct directory structure
- [ ] No syntax errors (we can verify with a quick read)

## 📊 Estimated Time

- File copying: **10 minutes**
- Verification: **5 minutes**
- **Total: 15 minutes**

## 🔜 After Step 1

We'll move to **Step 2: Test Docker Build** where we:
1. Run `docker-compose build` to build both services
2. Verify no build errors
3. Check that models download correctly

---

**Ready to proceed?** I'll fetch and create all 10 files from GitHub.
