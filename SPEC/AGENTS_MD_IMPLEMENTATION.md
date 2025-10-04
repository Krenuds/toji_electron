# AGENTS.md Implementation - Toji Custom Prompts

## Overview

Implemented automatic creation of `AGENTS.md` file for all Toji projects. This file serves as a custom prompt/instruction guide for OpenCode AI when working with the project.

## What Was Implemented

### 1. Template File
**Location:** `src/main/toji/templates/AGENTS.md`

Contains:
- Toji-specific development guidelines
- Architecture overview
- Code quality standards
- Tool preferences
- Permission settings
- Project-specific customization section

### 2. Project Initialization Integration
**File:** `src/main/toji/project-initializer.ts`

**Added:**
- `ensureAgentsFile()` method - Creates AGENTS.md from template if it doesn't exist
- Integrated into `initializeProject()` flow
- Updates `opencode.json` to include `instructions: ['AGENTS.md']`

**When it runs:**
- During new project initialization (`/init` command)
- Only creates if AGENTS.md doesn't already exist
- Non-blocking - won't fail project init if template is missing

### 3. Config Management Integration
**File:** `src/main/toji/config-manager.ts`

**Added:**
- Private `ensureAgentsFile()` method
- Calls from `ensureConfigFile()` whenever opencode.json is touched

**When it runs:**
- First time opencode.json is created for a project
- When config updates require file persistence
- When switching to projects without opencode.json

## How It Works

### Flow Diagram

```
User Action → Config Check → AGENTS.md Check → Create if Missing
    ↓              ↓              ↓                    ↓
/init cmd      Does opencode    Does AGENTS.md    Read template
Project switch  .json exist?    exist?            Write to project
Config update   Create if not   Skip if exists    Add to config
```

### File Structure

```
your-project/
├── .git/
├── .gitignore
├── opencode.json         ← References AGENTS.md
├── AGENTS.md             ← Created automatically
└── README.md
```

### OpenCode Integration

The `opencode.json` file is updated to include:

```json
{
  "model": "opencode/grok-code",
  "instructions": ["AGENTS.md"]
}
```

OpenCode automatically reads `AGENTS.md` and uses it as context/system prompt for all AI interactions in that project.

## Key Features

✅ **Automatic Creation** - No user action required
✅ **Non-Destructive** - Never overwrites existing AGENTS.md
✅ **Template-Based** - Easy to update default content
✅ **Project-Specific** - Each project can have custom instructions
✅ **OpenCode Native** - Uses OpenCode's `instructions` config field
✅ **Error Tolerant** - Missing template won't break functionality

## User Experience

### New Project
1. User runs `/init` or initializes project
2. Toji creates: git, .gitignore, opencode.json, **AGENTS.md**
3. OpenCode immediately starts using AGENTS.md guidance
4. User can edit AGENTS.md to customize behavior

### Existing Project
1. User switches to project without opencode.json
2. Toji creates opencode.json for persistence
3. Toji also creates AGENTS.md if missing
4. Project now has AI guidance

### Customization
Users can:
- Edit AGENTS.md directly in their project
- Add project-specific instructions
- Override defaults
- Delete sections they don't need

## Technical Details

### Template Location
- Compiled path: `dist/main/toji/templates/AGENTS.md`
- Source path: `src/main/toji/templates/AGENTS.md`
- Accessed via: `join(__dirname, 'templates', 'AGENTS.md')`

### Error Handling
- Missing template → Log warning, continue
- File write error → Log warning, continue
- Never throws exceptions

### Performance
- Synchronous template read (small file)
- Asynchronous file write
- Only runs once per project
- Minimal overhead

## Future Enhancements

### Potential Improvements
1. **Multiple Templates** - Different templates for different project types
2. **Template Variables** - Inject project name, date, user preferences
3. **UI Editor** - Edit AGENTS.md through Toji UI
4. **Template Library** - Share/download community templates
5. **Per-Agent Prompts** - Different prompts for build/plan/general agents
6. **Version Control** - Track changes to AGENTS.md
7. **AI Generation** - Let AI analyze project and generate custom AGENTS.md

### Configuration Options
Future config in opencode.json:
```json
{
  "instructions": [
    "AGENTS.md",
    ".github/instructions/*.md",
    "docs/ai-guidelines.md"
  ],
  "agent": {
    "general": {
      "prompt": "Additional inline prompt..."
    }
  }
}
```

## Testing

### Manual Test Steps
1. Initialize a new project
2. Verify AGENTS.md is created
3. Verify opencode.json includes `instructions: ["AGENTS.md"]`
4. Edit AGENTS.md, switch projects, switch back
5. Verify AGENTS.md is not overwritten
6. Delete AGENTS.md, update config
7. Verify AGENTS.md is recreated

### Expected Behavior
- ✅ AGENTS.md created on first init
- ✅ Not created if already exists
- ✅ OpenCode reads and uses instructions
- ✅ User can customize content
- ✅ No errors if template missing

## Rollout

### Deployment Steps
1. ✅ Create template file
2. ✅ Implement creation logic
3. ✅ Integrate into init flow
4. ✅ Integrate into config flow
5. ✅ Test TypeScript compilation
6. ✅ Test ESLint compliance
7. 🔲 Test runtime behavior
8. 🔲 Document in user guide
9. 🔲 Create example customizations

### User Communication
- Update README with AGENTS.md info
- Add to Discord bot help text
- Create example AGENTS.md files
- Document customization guide

## Related Files

### Modified
- `src/main/toji/project-initializer.ts`
- `src/main/toji/config-manager.ts`

### Created
- `src/main/toji/templates/AGENTS.md`
- `SPEC/AGENTS_MD_IMPLEMENTATION.md` (this file)

### To Update
- README.md - Mention AGENTS.md
- User documentation
- Help commands

---

**Status:** ✅ Implemented and type-checked
**Next:** Runtime testing and user documentation
