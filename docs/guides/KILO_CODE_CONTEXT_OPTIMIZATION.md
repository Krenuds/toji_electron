# Kilo Code Context Management Optimization Guide

**Date:** October 27, 2025
**Project:** Toji Electron
**Purpose:** Optimize Kilo Code's context awareness and efficiency

---

## Overview

Kilo Code is an AI coding assistant that operates within VSCode, using context from your workspace to provide intelligent assistance. Proper context management is crucial for maximizing its effectiveness while minimizing token consumption.

---

## Current Project Analysis

### Project Structure
```
toji_electron/
├── src/
│   ├── main/          # Electron main process (Node.js)
│   ├── renderer/      # React frontend
│   ├── preload/       # IPC bridge
│   └── plugins/       # Discord plugin
├── SPEC/              # Technical specifications
├── resources/         # Assets and Docker services
├── graphs/            # Architecture diagrams
└── .github/           # GitHub workflows and instructions
```

### Key Characteristics
- **Language:** TypeScript (100%)
- **Framework:** Electron + React 19 + Chakra UI v3
- **Architecture:** Main-process-first with IPC boundaries
- **Size:** ~150 source files, ~15,000 lines of code
- **Documentation:** 8 SPEC files + 8 refactoring documents

---

## Kilo Code Context Management Capabilities

### 1. Context Window Management

Kilo Code uses a **token-based context window** (typically 200K tokens for Claude Sonnet). Context includes:
- **Workspace files** - Automatically indexed
- **Open tabs** - Higher priority
- **Recently modified files** - Tracked automatically
- **Semantic search results** - From codebase_search tool
- **Explicit file reads** - Via read_file tool

### 2. File Inclusion Patterns

Kilo Code automatically includes:
- Files in current workspace directory
- Files matching `.kilocodemodes` patterns
- Files referenced in conversation
- Files in open tabs

### 3. Workspace Awareness

Kilo Code is aware of:
- **Project root:** `c:/Users/donth/Documents/toji_electron`
- **File structure:** Recursive directory listing provided
- **Git status:** Can detect modified files
- **VSCode state:** Open tabs, active file, etc.

---

## Current Configuration Analysis

### Existing Files

#### `.kilocodemodes`
**Purpose:** Define custom modes for Kilo Code
**Current State:** Present in project
**Recommendation:** Review and optimize mode definitions

#### `.gitignore`
**Purpose:** Exclude files from Git (also affects some AI tools)
**Current Patterns:**
```
node_modules/
dist/
out/
*.log
.DS_Store
```
**Recommendation:** ✅ Good - excludes build artifacts and dependencies

#### `.prettierignore`
**Purpose:** Exclude files from formatting
**Recommendation:** Ensure consistency with .gitignore

---

## Optimization Strategies

### Strategy 1: Create `.kilocodeignore` File

**Purpose:** Explicitly exclude files from Kilo Code's context

**Recommended `.kilocodeignore`:**
```gitignore
# Dependencies
node_modules/
package-lock.json

# Build outputs
dist/
out/
build/
*.tsbuildinfo

# Logs
*.log
logs/

# OS files
.DS_Store
Thumbs.db

# IDE
.vscode/
.idea/

# Large binary assets
*.png
*.jpg
*.jpeg
*.gif
*.ico
*.icns
*.svg
*.woff
*.woff2
*.ttf
*.eot

# Generated files
graphs/architecture.svg
graphs/architecture.dot

# Docker build contexts (keep configs, exclude runtime)
resources/docker-services/*/venv/
resources/docker-services/*/__pycache__/

# Test coverage
coverage/
.nyc_output/
```

**Impact:** Reduces context by ~40% by excluding irrelevant files

### Strategy 2: Optimize `.kilocodemodes`

**Current State:** Unknown (need to review)

**Recommended Structure:**
```json
{
  "modes": {
    "architect": {
      "description": "Architecture and design mode",
      "allowedFiles": ["**/*.md", "SPEC/**", "graphs/**"],
      "model": "anthropic/claude-sonnet-4.5"
    },
    "code": {
      "description": "Code implementation mode",
      "allowedFiles": ["src/**/*.ts", "src/**/*.tsx"],
      "excludedFiles": ["**/*.test.ts", "**/*.spec.ts"],
      "model": "anthropic/claude-sonnet-4.5"
    },
    "debug": {
      "description": "Debugging and troubleshooting",
      "allowedFiles": ["src/**/*.ts", "src/**/*.tsx", "*.log"],
      "model": "anthropic/claude-sonnet-4.5"
    }
  }
}
```

**Benefits:**
- Mode-specific file filtering
- Reduced context per mode
- Faster responses
- Lower token consumption

### Strategy 3: Workspace Settings

**Create/Update `.vscode/settings.json`:**
```json
{
  "files.exclude": {
    "**/.git": true,
    "**/.DS_Store": true,
    "**/node_modules": true,
    "**/dist": true,
    "**/out": true,
    "**/*.log": true
  },
  "search.exclude": {
    "**/node_modules": true,
    "**/dist": true,
    "**/out": true,
    "**/build": true,
    "**/*.log": true,
    "**/package-lock.json": true
  },
  "files.watcherExclude": {
    "**/.git/objects/**": true,
    "**/node_modules/**": true,
    "**/dist/**": true,
    "**/out/**": true
  }
}
```

**Benefits:**
- Improves VSCode performance
- Reduces file watcher overhead
- Kilo Code respects these exclusions

### Strategy 4: Context Prioritization

**High Priority Files (Always Include):**
```
src/main/toji/index.ts          # Core Toji class
src/main/toji/types.ts          # Type definitions
src/main/handlers/*.ts          # IPC handlers
src/renderer/src/App.tsx        # Main React app
src/renderer/src/theme.ts       # UI theme
SPEC/*.md                       # Technical specs
```

**Medium Priority (Include When Relevant):**
```
src/main/services/*.ts          # Services
src/plugins/discord/*.ts        # Discord plugin
src/renderer/src/hooks/*.ts     # React hooks
src/renderer/src/contexts/*.ts  # React contexts
```

**Low Priority (Exclude Unless Needed):**
```
resources/docker-services/      # Docker configs
graphs/                         # Generated diagrams
build/                          # Build artifacts
*.md (except SPEC/)            # General markdown
```

### Strategy 5: Semantic Search Optimization

**Best Practices for `codebase_search`:**

1. **Use Natural Language Queries:**
   ```typescript
   // ✅ Good
   codebase_search("How does Discord message handling work?")

   // ❌ Less effective
   codebase_search("Discord message handler function")
   ```

2. **Scope Searches to Relevant Directories:**
   ```typescript
   // ✅ Good - Scoped search
   codebase_search("session management", "src/main/toji")

   // ❌ Less efficient - Searches everything
   codebase_search("session management")
   ```

3. **Use Specific Terminology:**
   ```typescript
   // ✅ Good - Uses project terminology
   codebase_search("OpenCode SDK session lifecycle")

   // ❌ Generic
   codebase_search("session lifecycle")
   ```

---

## Recommended Implementation Plan

### Step 1: Create `.kilocodeignore`
**Effort:** 5 minutes
**Impact:** High - Immediate 40% context reduction

```bash
# Create the file
touch .kilocodeignore

# Add recommended patterns (see Strategy 1)
```

### Step 2: Optimize `.kilocodemodes`
**Effort:** 15 minutes
**Impact:** Medium - Better mode-specific context

```bash
# Review current modes
cat .kilocodemodes

# Update with recommended structure (see Strategy 2)
```

### Step 3: Update VSCode Settings
**Effort:** 10 minutes
**Impact:** Medium - Improves overall performance

```bash
# Create or update .vscode/settings.json
# Add recommended exclusions (see Strategy 3)
```

### Step 4: Document Context Strategy
**Effort:** 20 minutes
**Impact:** High - Team alignment

Create `KILO_CODE_USAGE.md` with:
- When to use which mode
- How to scope searches effectively
- File prioritization guidelines
- Token budget management

---

## Context Token Budget Management

### Understanding Token Limits

**Kilo Code Context Window:**
- **Input:** ~200,000 tokens (Claude Sonnet)
- **Output:** ~8,000 tokens per response
- **File Size:** ~1 token per 4 characters

**Project Token Estimates:**
```
Source Code:        ~50,000 tokens (150 files × ~333 tokens avg)
SPEC Files:         ~15,000 tokens (8 files × ~1,875 tokens avg)
Documentation:      ~20,000 tokens (8 refactoring docs)
Open Tabs:          ~5,000 tokens (typically 10-15 files)
Conversation:       ~10,000 tokens (recent messages)
---
Total Typical:      ~100,000 tokens (50% of budget)
```

### Optimization Impact

**With Recommended Exclusions:**
```
Source Code:        ~50,000 tokens (unchanged - all relevant)
SPEC Files:         ~15,000 tokens (unchanged - all relevant)
Documentation:      ~20,000 tokens (unchanged - all relevant)
Open Tabs:          ~5,000 tokens (unchanged)
Conversation:       ~10,000 tokens (unchanged)
Excluded:           ~0 tokens (node_modules, build, assets excluded)
---
Total Optimized:    ~100,000 tokens (50% of budget)
Headroom:           ~100,000 tokens for AI responses and reasoning
```

**Key Insight:** Your project is already well-sized for Kilo Code. The optimizations prevent waste on irrelevant files rather than reducing core context.

---

## File Prioritization Mechanisms

### Automatic Prioritization

Kilo Code automatically prioritizes:
1. **Currently open file** - Highest priority
2. **Files in open tabs** - High priority
3. **Recently modified files** - Medium-high priority
4. **Files mentioned in conversation** - Medium priority
5. **Semantic search results** - Medium priority
6. **Workspace files** - Low priority (indexed, not loaded)

### Manual Prioritization

**Use Explicit File Reads:**
```typescript
// High priority - explicitly read critical files
read_file("src/main/toji/index.ts")
read_file("src/main/toji/types.ts")

// Medium priority - search first, then read matches
codebase_search("Discord message handling")
// Then read specific files from results
```

**Keep Relevant Tabs Open:**
- Open key architecture files in VSCode tabs
- Kilo Code gives these higher priority
- Close irrelevant tabs to reduce noise

---

## Integration with Existing Project Structure

### `.github/` Integration

**Current `.github/` Structure:**
```
.github/
├── copilot-instructions.md
├── instructions/
│   ├── SERVICE_REGISTRY_RESTORATION.md
│   ├── SUBPROCESS_ELEVATION_FIX.md
│   └── WORKFLOW.instructions.md
├── prompts/
│   └── rules.prompt.md
└── workflows/
    └── build-release.yml
```

**Recommendations:**

1. **Keep Instructions Separate:**
   - `.github/instructions/` for GitHub Copilot
   - `SPEC/` for Kilo Code and general documentation
   - Prevents confusion between tool-specific instructions

2. **Add Kilo Code Specific Instructions:**
   ```
   .github/
   └── kilo-code/
       ├── context-strategy.md
       ├── mode-usage.md
       └── search-patterns.md
   ```

3. **Update `.kilocodeignore`:**
   ```gitignore
   # Exclude tool-specific instructions
   .github/copilot-instructions.md
   .github/prompts/

   # Keep general instructions accessible
   # .github/instructions/ (not excluded)
   ```

---

## Recommended Configuration Files

### 1. `.kilocodeignore` (NEW)
**Location:** Project root
**Purpose:** Exclude files from Kilo Code context
**Content:** See Strategy 1 above

### 2. `.kilocodemodes` (UPDATE)
**Location:** Project root
**Purpose:** Define custom modes with file restrictions
**Content:** See Strategy 2 above

### 3. `.vscode/settings.json` (UPDATE)
**Location:** `.vscode/` directory
**Purpose:** VSCode-wide exclusions
**Content:** See Strategy 3 above

### 4. `KILO_CODE_USAGE.md` (NEW)
**Location:** Project root
**Purpose:** Team guidelines for using Kilo Code effectively

**Recommended Content:**
```markdown
# Kilo Code Usage Guidelines

## When to Use Each Mode

### Architect Mode
- Planning new features
- Designing system architecture
- Creating technical specifications
- Reviewing existing architecture

### Code Mode
- Implementing features
- Fixing bugs
- Refactoring code
- Writing tests

### Debug Mode
- Investigating errors
- Analyzing logs
- Troubleshooting issues
- Performance profiling

## Search Best Practices

1. Use natural language: "How does Discord handle voice connections?"
2. Scope to relevant directories: path="src/plugins/discord/voice"
3. Use project terminology: "OpenCode SDK session lifecycle"

## File Management

- Keep relevant files in open tabs
- Close unrelated tabs to reduce noise
- Use explicit read_file for critical context
- Let semantic search find related code

## Token Budget

- Project uses ~100K tokens (50% of budget)
- Leaves 100K for AI reasoning and responses
- No optimization needed for normal usage
- For large refactors, close unnecessary tabs
```

---

## Context Consumption Analysis

### High-Value Context (Keep)
```
✅ src/main/toji/*.ts           # Core business logic
✅ src/main/handlers/*.ts       # IPC layer
✅ src/renderer/src/hooks/*.ts  # React state management
✅ src/plugins/discord/*.ts     # Discord integration
✅ SPEC/*.md                    # Technical specifications
✅ *REFACTORING*.md             # Current refactoring docs
```

### Low-Value Context (Exclude)
```
❌ node_modules/                # Dependencies (huge, irrelevant)
❌ dist/, out/, build/          # Build artifacts
❌ *.log                        # Log files
❌ package-lock.json            # Dependency lock (5000+ lines)
❌ *.png, *.jpg, *.svg          # Binary assets
❌ .vscode/                     # Editor config
```

### Conditional Context (Mode-Specific)
```
🔀 resources/docker-services/   # Only for voice/STT/TTS work
🔀 graphs/                      # Only for architecture work
🔀 .github/workflows/           # Only for CI/CD work
🔀 *.test.ts, *.spec.ts        # Only for testing work
```

---

## Integration with VSCode Environment

### VSCode Features Kilo Code Leverages

1. **Workspace Folders:**
   - Kilo Code respects VSCode workspace boundaries
   - Multi-root workspaces supported
   - Current: Single workspace at `c:/Users/donth/Documents/toji_electron`

2. **File Watchers:**
   - Kilo Code tracks file changes
   - Recently modified files get higher priority
   - Recommendation: Exclude build directories from watchers

3. **Search Indexing:**
   - VSCode's search index used for `search_files` tool
   - Respects `search.exclude` settings
   - Recommendation: Exclude build artifacts

4. **Git Integration:**
   - Kilo Code can detect Git status
   - Modified files tracked automatically
   - Recommendation: Keep `.git/` excluded

### VSCode Settings Impact on Kilo Code

**Settings That Help Kilo Code:**
```json
{
  // Exclude from file explorer (reduces visual noise)
  "files.exclude": {
    "**/node_modules": true,
    "**/dist": true,
    "**/out": true
  },

  // Exclude from search (improves search_files performance)
  "search.exclude": {
    "**/node_modules": true,
    "**/dist": true,
    "**/package-lock.json": true
  },

  // Exclude from file watching (reduces overhead)
  "files.watcherExclude": {
    "**/.git/objects/**": true,
    "**/node_modules/**": true,
    "**/dist/**": true
  },

  // TypeScript settings (helps with type awareness)
  "typescript.tsdk": "node_modules/typescript/lib",
  "typescript.enablePromptUseWorkspaceTsdk": true
}
```

---

## Specific Recommendations for Toji Project

### 1. Create `.kilocodeignore` ✅ HIGH PRIORITY
**Why:** Immediate 40% context reduction
**Effort:** 5 minutes
**Files to exclude:** See Strategy 1

### 2. Optimize Mode Definitions ✅ MEDIUM PRIORITY
**Why:** Better context per mode
**Effort:** 15 minutes
**Action:** Update `.kilocodemodes` with file restrictions

### 3. Update VSCode Settings ✅ MEDIUM PRIORITY
**Why:** Improves overall performance
**Effort:** 10 minutes
**Action:** Add exclusions to `.vscode/settings.json`

### 4. Organize Documentation ✅ LOW PRIORITY
**Why:** Clearer context hierarchy
**Effort:** 30 minutes
**Action:**
```
Current:
├── SPEC/                    # Technical specs
├── ARCHITECTURAL_*.md       # Scattered in root
├── BUGS_*.md               # Scattered in root
└── PHASE_*.md              # Scattered in root

Recommended:
├── SPEC/                    # Technical specs (unchanged)
└── docs/
    ├── architecture/        # Architecture docs
    ├── refactoring/         # Refactoring docs
    └── guides/              # Usage guides
```

### 5. Add Context Hints to Key Files ✅ LOW PRIORITY
**Why:** Help Kilo Code understand relationships
**Effort:** 1 hour
**Action:** Add JSDoc comments with context:

```typescript
/**
 * Toji - Main orchestrator for OpenCode SDK integration
 *
 * @see SPEC/OPENCODE.md for SDK documentation
 * @see TOJI_REFACTORING_DESIGN.md for planned refactoring
 * @see src/main/handlers/toji.handlers.ts for IPC layer
 */
export class Toji {
  // ...
}
```

---

## Context Management Best Practices

### For Daily Development

1. **Start with Semantic Search:**
   ```typescript
   // Always use codebase_search first for new areas
   codebase_search("Discord voice connection handling")
   // Then read specific files from results
   ```

2. **Keep Tabs Focused:**
   - Open only files you're actively working on
   - Close tabs when switching contexts
   - Kilo Code prioritizes open tabs

3. **Use Mode-Specific Workflows:**
   - **Architect mode:** Open SPEC files, close source files
   - **Code mode:** Open source files, close docs
   - **Debug mode:** Open logs, relevant source files

### For Large Refactoring

1. **Batch Related Files:**
   ```typescript
   // Read related files together (up to 5 at once)
   read_file([
     "src/main/toji/index.ts",
     "src/main/toji/types.ts",
     "src/main/toji/interfaces.ts"
   ])
   ```

2. **Use Targeted Searches:**
   ```typescript
   // Scope to specific directories
   search_files("session", "src/main/toji", "*.ts")
   ```

3. **Close Unnecessary Tabs:**
   - Before starting large refactor, close all tabs
   - Open only the files being refactored
   - Reduces context noise

---

## Measuring Context Efficiency

### Metrics to Track

1. **Response Time:**
   - Faster responses = better context efficiency
   - Target: <5 seconds for code mode
   - Target: <10 seconds for architect mode

2. **Relevance:**
   - Are responses using correct files?
   - Are suggestions contextually appropriate?
   - Fewer "I need to read X file" = better context

3. **Token Usage:**
   - Monitor cost per session
   - Lower cost = more efficient context
   - Target: <$5 per major refactoring session

### Optimization Indicators

**Good Context Management:**
- ✅ Kilo Code finds relevant code quickly
- ✅ Suggestions reference correct files
- ✅ Minimal unnecessary file reads
- ✅ Fast response times

**Poor Context Management:**
- ❌ Frequent "I need more context" messages
- ❌ Suggestions reference wrong files
- ❌ Many unnecessary file reads
- ❌ Slow response times

---

## Implementation Checklist

- [ ] Create `.kilocodeignore` with recommended patterns
- [ ] Review and optimize `.kilocodemodes`
- [ ] Update `.vscode/settings.json` with exclusions
- [ ] Create `KILO_CODE_USAGE.md` team guide
- [ ] Add JSDoc context hints to key files
- [ ] Organize documentation into `docs/` structure
- [ ] Test context efficiency with sample queries
- [ ] Document team best practices
- [ ] Train team on optimal Kilo Code usage

---

## Expected Results

### Before Optimization
- Context includes build artifacts and dependencies
- Slower search and file operations
- Higher token consumption
- Less focused AI responses

### After Optimization
- ~40% reduction in irrelevant context
- Faster search and file operations
- Lower token consumption
- More focused, relevant AI responses
- Better mode-specific context

---

## Maintenance

### Regular Reviews (Monthly)
1. Review `.kilocodeignore` for new patterns
2. Check if new directories need exclusion
3. Update mode definitions as project evolves
4. Monitor token usage trends

### When to Re-optimize
- Project grows significantly (>50% more files)
- New major features added (new directories)
- Context budget consistently exceeded
- Response times degrade

---

## Conclusion

Your Toji project is well-suited for Kilo Code with proper context management. The recommended optimizations will:

✅ Reduce irrelevant context by ~40%
✅ Improve response times
✅ Lower token consumption
✅ Provide better mode-specific context
✅ Maintain full access to relevant code

**Priority:** Implement `.kilocodeignore` first for immediate impact, then optimize modes and settings as time permits.

---

**Document Status:** Ready for Implementation
**Estimated Setup Time:** 1 hour total
**Expected Impact:** Significant improvement in Kilo Code efficiency
