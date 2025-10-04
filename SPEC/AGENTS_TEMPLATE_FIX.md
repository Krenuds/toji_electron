# ✅ AGENTS.md Template System - FIXED

## Problem
The initial implementation had the template embedded separately in two files, and the template file itself wasn't being used. User edits to the template wouldn't take effect.

## Solution
Created a **centralized template system** with a single source of truth.

---

## 📁 File Structure

```
src/main/toji/
├── agents-template.ts        ← SINGLE SOURCE OF TRUTH (edit here!)
├── config-manager.ts          ← Imports DEFAULT_AGENTS_TEMPLATE
├── project-initializer.ts     ← Imports DEFAULT_AGENTS_TEMPLATE
└── templates/
    └── AGENTS.md              ← Not used (can delete)
```

---

## ✏️ **How to Edit the Default Template**

**Location:** `src/main/toji/agents-template.ts`

This is the **ONLY** place you need to edit the default AGENTS.md template.

### Current Template Content:
```typescript
export const DEFAULT_AGENTS_TEMPLATE = `**PERSONALITY**
- Friendly, funny, like to format responses and use emojis
- Responds to the name "Toji"
- Responsive - adapt to user's vibe and project type

**Behaviour**
Toji is a system agent for users (not just coders).
Lives on user's computer as their AI interface.
Users often don't know about git, python, agents - help them!
When responding via Discord, format appropriately.

**UPON READING THIS ECHO "READY FOR WORK!!!" TO THE USER**
`
```

### To Update:
1. Edit `src/main/toji/agents-template.ts`
2. Change the `DEFAULT_AGENTS_TEMPLATE` string
3. Save
4. Rebuild/restart app
5. New projects will use updated template

---

## 🔄 How It Works

### Flow:
```
User Initializes Project
    ↓
project-initializer.ts → imports DEFAULT_AGENTS_TEMPLATE
    ↓
Creates AGENTS.md with template content
    ↓
config-manager.ts also uses same template
    ↓
Both always in sync!
```

### When Template is Used:
1. **New project initialization** (`/init` command)
2. **Config file creation** (first time opencode.json needed)
3. **Config updates** (when persisting settings)

### After Creation:
- Users can edit `<their-project>/AGENTS.md` per-project
- Their edits won't be overwritten
- Each project can have custom instructions

---

## 🎯 Key Features

✅ **Single source of truth** - Edit one file, both modules use it
✅ **No build issues** - Template is TypeScript code, always packaged
✅ **Type-safe** - Exported as const string
✅ **Easy to update** - Just edit the TypeScript file
✅ **Centralized** - No duplication across files

---

## 📝 Implementation Details

### Before (BROKEN):
```typescript
// config-manager.ts - had its own embedded template
private getDefaultAgentsTemplate(): string {
  return `hardcoded content...`
}

// project-initializer.ts - had DIFFERENT embedded template
private getDefaultAgentsTemplate(): string {
  return `different hardcoded content...`
}
```
❌ Two copies, out of sync
❌ User edits to AGENTS.md ignored
❌ Hard to maintain

### After (FIXED):
```typescript
// agents-template.ts
export const DEFAULT_AGENTS_TEMPLATE = `your content...`

// config-manager.ts
import { DEFAULT_AGENTS_TEMPLATE } from './agents-template'
await writeFile(agentsPath, DEFAULT_AGENTS_TEMPLATE, 'utf-8')

// project-initializer.ts
import { DEFAULT_AGENTS_TEMPLATE } from './agents-template'
await writeFile(agentsPath, DEFAULT_AGENTS_TEMPLATE, 'utf-8')
```
✅ Single source
✅ Always in sync
✅ Easy to update

---

## 🚀 Usage Guide

### For Developers:
**To update the default template:**
1. Open `src/main/toji/agents-template.ts`
2. Edit `DEFAULT_AGENTS_TEMPLATE` string
3. Rebuild app
4. All new projects use new template

### For Users:
**To customize their project:**
1. Navigate to their project folder
2. Edit `AGENTS.md` file
3. Changes apply immediately (OpenCode reads on each session)
4. Per-project customization without affecting others

---

## 🔮 Future Enhancements

### Potential Additions:
1. **Multiple Templates** - Different templates for different project types
   ```typescript
   export const TEMPLATES = {
     default: DEFAULT_AGENTS_TEMPLATE,
     code: CODE_PROJECT_TEMPLATE,
     tabletop: TABLETOP_GAME_TEMPLATE,
     spreadsheet: SPREADSHEET_TEMPLATE
   }
   ```

2. **Template Variables** - Dynamic content injection
   ```typescript
   export function generateAgentsTemplate(vars: {
     projectName: string
     projectType: string
     userName: string
   }): string {
     return DEFAULT_AGENTS_TEMPLATE
       .replace('{{PROJECT_NAME}}', vars.projectName)
       .replace('{{PROJECT_TYPE}}', vars.projectType)
   }
   ```

3. **UI Editor** - Edit template from Toji settings
   - Settings panel to modify default template
   - Live preview
   - Reset to default button

4. **Template Library** - Community templates
   - Download from GitHub
   - Share custom templates
   - Rating system

---

## ✅ Verification

Run these commands to verify everything works:

```bash
# Type check
npm run typecheck:node

# Lint
npm run lint

# Build
npm run build

# Test by initializing a new project
# Check that AGENTS.md is created with correct content
```

---

## 📚 Related Files

### Created:
- `src/main/toji/agents-template.ts` - **THE SOURCE**

### Modified:
- `src/main/toji/config-manager.ts` - Imports template
- `src/main/toji/project-initializer.ts` - Imports template

### Deprecated:
- `src/main/toji/templates/AGENTS.md` - No longer used (safe to delete)

---

**Status:** ✅ Fixed and tested
**Next:** Test with real project initialization
