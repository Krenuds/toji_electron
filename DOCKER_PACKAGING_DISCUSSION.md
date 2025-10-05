# 🚨 Critical Discussion: Docker Service Packaging Strategy

## Current Status (Phase 4 Complete)

We have successfully:
- ✅ Built Docker images for Whisper (STT) and Piper (TTS)
- ✅ Started services and verified they're running healthy
- ✅ Confirmed health endpoints responding correctly
- ✅ All service files committed to git

**However**, we need to make critical decisions about how these Docker services will be **packaged and distributed** with the Electron application before proceeding with Phase 5.

---

## The Packaging Problem

### Current State
- Docker images exist **only on your local machine**
- Services run via `docker compose` **manually**
- Images total **~15GB** (Whisper: 13.6GB, Piper: 1.24GB)
- Users would need Docker Desktop installed

### Critical Questions

#### 1. Docker Distribution Strategy

**Option A: Require Docker Desktop**
- Users must install Docker Desktop separately
- App checks for Docker, provides install instructions if missing
- Simplest implementation, but friction for users
- Docker Desktop is free for personal use, paid for commercial

**Option B: Bundle Docker Engine**
- Package lightweight Docker runtime with app
- More complex, larger installer
- Better UX, no external dependencies
- Licensing considerations

**Option C: Pre-built Binaries (Whisper/Piper native)**
- Abandon Docker, use native executables
- Whisper: Package `faster-whisper` Python or use whisper.cpp
- Piper: Package Piper native binary
- Smaller footprint, more platform-specific work

#### 2. Image Distribution Strategy

If using Docker, how do users get the images?

**Option A: Build on First Run**
- Ship Dockerfiles + source code
- Build images on user's machine first time
- ~6 minute build time on first launch
- Requires internet for base images

**Option B: Pull from Registry**
- Push images to Docker Hub or GitHub Container Registry
- App pulls pre-built images on first run
- Faster than building, but ~15GB download
- Requires Docker registry account

**Option C: Bundle Images in Installer**
- Export images to `.tar` files
- Include in Electron app package
- Load images on first run
- Massive installer size (~15GB+)

**Option D: Hybrid Approach**
- Ship minimal base, download models separately
- First run: Pull images, download models
- Reduces initial size, deferred download

#### 3. electron-builder Considerations

Our `electron-builder.yml` currently has:

```yaml
files:
  - "!**/.vscode/*"
  - "!src/*"
  - "!electron.vite.config.{js,ts,mjs,cjs}"
  # ... etc
```

**Questions:**
- Do we include `resources/docker-services/` in the packaged app?
- How do we handle Docker Compose files?
- Where do we store images or Dockerfiles?
- How does `extraResources` work for Docker artifacts?

#### 4. Platform-Specific Issues

**Windows:**
- Docker Desktop uses WSL2 or Hyper-V
- Requires Windows 10/11 Pro or Home with WSL2
- Our target users: Do they have this?

**macOS:**
- Docker Desktop available
- M1/M2 Macs: ARM architecture considerations
- Our images are built for x86_64

**Linux:**
- Docker Engine available natively
- Easier to bundle, but multiple distros

#### 5. Model Storage

**Current Setup:**
- Models cached in Docker volumes
- Whisper small: ~461MB
- Piper voice: ~45MB
- **Total:** ~506MB per installation

**Questions:**
- Where do models live in packaged app?
- Can users share models between installations?
- How do we update models?

---

## Recommended Approach (For Discussion)

### Proposal: "Docker Optional with Graceful Fallback"

**Phase 1: Docker Detection**
```typescript
// DockerServiceManager already has this
enum DockerMode {
  DISABLED = 'disabled',
  NOT_INSTALLED = 'not_installed',
  STARTING = 'starting',
  RUNNING = 'running',
  ERROR = 'error'
}
```

**Phase 2: Smart Packaging**
1. **Ship Dockerfiles + Service Code** (already done)
   - Include `resources/docker-services/` in packaged app
   - ~50KB of code, negligible size

2. **First Run Behavior:**
   ```
   User launches app
     ↓
   Check Docker installed?
     ├─ YES → Build images (6 min, one-time)
     │        Download models during build
     │        Store in Docker volumes
     │        Ready to use
     │
     └─ NO  → Show friendly UI:
              "TTS/STT requires Docker Desktop"
              [Download Docker] [Learn More] [Skip]
              
              App continues without voice features
              Can enable later from settings
   ```

3. **electron-builder.yml Updates:**
   ```yaml
   extraResources:
     - from: "resources/docker-services"
       to: "docker-services"
       filter: 
         - "**/*"
         - "!**/logs"
         - "!**/tmp"
   ```

4. **Update DockerServiceManager:**
   - Detect if packaged (use `app.isPackaged`)
   - Use correct paths for production
   - Handle build vs pull decision
   - Show progress during image build
   - Cache build status to avoid rebuilds

**Benefits:**
- ✅ No massive installer (still ~200MB base Electron app)
- ✅ Users without Docker can use other features
- ✅ First-time setup is clear and guided
- ✅ Easy to update (just ship new service code)
- ✅ Respects user's choice (optional feature)

**Drawbacks:**
- ⚠️ Requires Docker Desktop (external dependency)
- ⚠️ 6-minute build on first voice feature use
- ⚠️ ~15GB disk space for images
- ⚠️ Internet required for initial setup

---

## Alternative: Native Binaries (More Work, Better UX)

### If we abandon Docker:

**Whisper STT:**
- Use `whisper.cpp` (C++ implementation, much smaller)
- OR package Python + faster-whisper as executable
- Bundle small model (~461MB) in installer
- Platform-specific binaries

**Piper TTS:**
- Piper has native executables available
- Bundle `piper` binary + voice models (~45MB)
- Platform-specific builds

**Benefits:**
- ✅ No Docker dependency
- ✅ Smaller footprint (~500MB total)
- ✅ Faster startup
- ✅ Easier for users

**Drawbacks:**
- ⚠️ More implementation work
- ⚠️ Platform-specific builds (Windows/Mac/Linux)
- ⚠️ We lose the production-tested toji-services code
- ⚠️ Need to reimplement API layer

---

## What We Need to Decide

### Before proceeding with Phase 5, answer:

1. **Docker Dependency: Yes or No?**
   - If YES: Optional or required?
   - If NO: Switch to native binaries?

2. **If Docker: How do users get images?**
   - Build on first run? (our recommendation)
   - Pull from registry? (need to publish images)
   - Bundle in installer? (massive size)

3. **Target User Technical Level:**
   - Are our users comfortable installing Docker Desktop?
   - Can we provide good enough instructions?
   - Is the 6-minute first-run build acceptable?

4. **Packaging Strategy:**
   - What goes in `extraResources`?
   - How do we handle paths in production?
   - Do we need separate installers per platform?

5. **Fallback Plan:**
   - What happens if Docker isn't available?
   - Can app run without voice features?
   - Do we show helpful error messages?

---

## Next Steps (After Decision)

### If Keeping Docker:
1. Update `electron-builder.yml` with `extraResources`
2. Modify `DockerServiceManager` for packaged app paths
3. Add UI for Docker setup flow
4. Test build process in production
5. **Then** proceed to Phase 5 (HTTP clients)

### If Going Native:
1. Research `whisper.cpp` integration
2. Research Piper native binary packaging
3. Design new service architecture
4. Update plan document
5. Start fresh implementation

---

## Immediate Action Required

**Please review this document and decide:**

1. Docker-based or Native binaries?
2. If Docker: Optional feature or required?
3. If Docker: Build-on-first-run or pre-built registry?

Once decided, I'll update the implementation plan and proceed accordingly.

---

## Current Branch Status

- **Branch:** `feature/docker-tts-integration`
- **Last Commit:** `c296f6e` - Phase 2-4 complete
- **Services Running:** Yes (locally)
- **Ready for Phase 5:** **NO** - Need packaging decision first

**Do not proceed until packaging strategy is confirmed.**
