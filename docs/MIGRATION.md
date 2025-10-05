# Documentation Reorganization

**Moving from `/SPEC` to `/docs` - October 4, 2025**

---

## What Changed?

The documentation has been reorganized from a flat `/SPEC` folder into a structured `/docs` hierarchy for better organization and discoverability.

---

## New Structure

```
docs/
├── README.md                    # Main documentation index
├── OVERVIEW.md                  # Project overview
├── CONTRIBUTING.md              # How to contribute
├── FAQ.md                       # Frequently asked questions
├── TROUBLESHOOTING.md           # Common issues
│
├── quickstart/                  # Getting started guides
│   ├── README.md
│   ├── INSTALLATION.md
│   └── FIRST_STEPS.md
│
├── architecture/                # System design
│   ├── SYSTEM.md               # Overall architecture
│   ├── FRONTEND.md             # Frontend design (from SPEC/FRONTEND.md)
│   ├── MCP.md                  # MCP tools
│   └── DISCORD.md              # Discord bot
│
├── features/                    # User-facing features
│   ├── DISCORD.md              # Discord features (consolidated)
│   ├── TTS.md                  # Text-to-speech
│   ├── STT.md                  # Speech-to-text (consolidated)
│   ├── PROJECTS.md             # Project management
│   └── OPENCODE.md             # OpenCode AI (from SPEC/OPENCODE.md)
│
└── implementation/              # Development guides
    ├── PHASE2_TTS.md           # TTS implementation
    ├── PHASE3_STT.md           # STT implementation (consolidated)
    ├── WORKFLOW.md             # Development workflow
    └── TESTING.md              # Testing guide
```

---

## Migration Map

### Old SPEC Files → New docs Files

| Old File | New Location | Status | Notes |
|----------|--------------|--------|-------|
| `FRONTEND.md` | `architecture/FRONTEND.md` | ✅ Move | Core architecture doc |
| `OPENCODE.md` | `features/OPENCODE.md` | ✅ Move | Feature documentation |
| `DISCORD_EMBED_SYSTEM.md` | `features/DISCORD.md` | 🔄 Consolidate | Part of Discord features |
| `DISCORD_VOICE_SYSTEM.md` | `features/DISCORD.md` | 🔄 Consolidate | Part of Discord features |
| `PHASE2_TTS_PLAN.md` | `implementation/PHASE2_TTS.md` | 🔄 Consolidate | Main TTS guide |
| `PHASE2_TTS_QUICKSTART.md` | `implementation/PHASE2_TTS.md` | 🔄 Consolidate | Merged into main |
| `TTS_IMPLEMENTATION_REVIEW.md` | `implementation/PHASE2_TTS.md` | 🔄 Consolidate | Merged into main |
| `PHASE3_STT_*.md` (8 files) | `implementation/PHASE3_STT.md` | 🔄 Consolidate | Single comprehensive guide |
| `PHASE3_RESEARCH_COMPLETE.md` | ❌ Archive | Temporary research doc |

---

## What to Do

### For Developers

**Update your bookmarks:**
- Old: `SPEC/FRONTEND.md`
- New: `docs/architecture/FRONTEND.md`

**Update link references in code comments:**
```typescript
// Old:
// See SPEC/DISCORD_VOICE_SYSTEM.md for details

// New:
// See docs/features/DISCORD.md for details
```

**For new documentation:**
- Use `docs/` structure
- Follow naming conventions
- Keep files focused and concise

### For Users

**Finding documentation:**
- Start at `docs/README.md`
- Use the navigation links
- Search by topic or role

---

## Consolidation Strategy

### Phase 2: TTS Documentation

**Old files (3):**
- `PHASE2_TTS_PLAN.md`
- `PHASE2_TTS_QUICKSTART.md`
- `TTS_IMPLEMENTATION_REVIEW.md`

**New file (1):**
- `docs/implementation/PHASE2_TTS.md`

**Structure:**
1. Overview & quickstart
2. Implementation details
3. Testing & review
4. Lessons learned

### Phase 3: STT Documentation

**Old files (8):**
- `PHASE3_STT_INDEX.md`
- `PHASE3_STT_SUMMARY.md`
- `PHASE3_STT_OPTIONS.md`
- `PHASE3_STT_PLAN.md`
- `PHASE3_STT_ROADMAP.md`
- `PHASE3_STT_DECISIONS.md`
- `PHASE3_STT_QUICKSTART.md`
- `PHASE3_RESEARCH_COMPLETE.md`

**New file (1):**
- `docs/implementation/PHASE3_STT.md`

**Structure:**
1. Overview & technology choice
2. Quick start guide
3. Implementation roadmap
4. Technical decisions
5. Integration guide

### Discord Documentation

**Old files (2):**
- `DISCORD_EMBED_SYSTEM.md`
- `DISCORD_VOICE_SYSTEM.md`

**New file (1):**
- `docs/features/DISCORD.md`

**Structure:**
1. Overview
2. Slash commands
3. Voice system
4. Embed system
5. Integration examples

---

## Archiving Old Files

Old `/SPEC` files will be kept for historical reference but marked as **ARCHIVED**.

Add to each old file:
```markdown
> ⚠️ **ARCHIVED**: This document has been consolidated into the new docs structure.
> See [docs/README.md](../docs/README.md) for current documentation.
```

---

## Documentation Standards

### File Organization

**✅ DO:**
- Use descriptive filenames (DISCORD.md not BOT.md)
- Keep files under 500 lines
- Link related documents
- Include code examples

**❌ DON'T:**
- Create duplicate documentation
- Use vague titles (NOTES.md, MISC.md)
- Put everything in one massive file
- Forget to update the main README

### Naming Conventions

**Main documents:** `UPPERCASE.md`
- `README.md`, `OVERVIEW.md`, `CONTRIBUTING.md`

**Feature docs:** `FEATURE.md`
- `DISCORD.md`, `TTS.md`, `STT.md`

**Implementation phases:** `PHASE#_FEATURE.md`
- `PHASE2_TTS.md`, `PHASE3_STT.md`

**Architecture docs:** `SYSTEM.md`, `FRONTEND.md`

### Content Structure

Every doc should have:
1. **Title** - Clear, descriptive
2. **Overview** - What is this about?
3. **Quick links** - TL;DR navigation
4. **Main content** - Organized sections
5. **Code examples** - Real, working code
6. **Links** - Related documentation
7. **Last updated** - Date stamp

---

## Benefits of New Structure

### Before (SPEC/)
```
SPEC/
├── DISCORD_EMBED_SYSTEM.md
├── DISCORD_VOICE_SYSTEM.md
├── FRONTEND.md
├── OPENCODE.md
├── PHASE2_TTS_PLAN.md
├── PHASE2_TTS_QUICKSTART.md
├── PHASE3_STT_DECISIONS.md
├── PHASE3_STT_INDEX.md
├── PHASE3_STT_OPTIONS.md
├── PHASE3_STT_PLAN.md
├── PHASE3_STT_QUICKSTART.md
├── PHASE3_STT_ROADMAP.md
├── PHASE3_STT_SUMMARY.md
├── PHASE3_RESEARCH_COMPLETE.md
└── TTS_IMPLEMENTATION_REVIEW.md
```
**Problems:**
- ❌ 15 files, hard to find things
- ❌ No clear organization
- ❌ Duplicate information (8 STT files!)
- ❌ Unclear what to read first

### After (docs/)
```
docs/
├── README.md (navigation)
├── OVERVIEW.md
├── quickstart/
├── architecture/
├── features/
└── implementation/
```
**Benefits:**
- ✅ Clear hierarchy
- ✅ Easy navigation
- ✅ Consolidated information
- ✅ Role-based organization

---

## Timeline

### Phase 1: Structure ✅
- Create new `/docs` folder
- Set up directory structure
- Create main README

### Phase 2: Migration 🚧
- Consolidate STT docs (8 → 1)
- Consolidate TTS docs (3 → 1)
- Consolidate Discord docs (2 → 1)
- Move architecture docs

### Phase 3: Archive
- Add archive notices to old files
- Update all link references
- Add redirects in old files

### Phase 4: Cleanup
- Remove truly obsolete files
- Update README references
- Announce to team

---

## Need Help?

**Finding a document?**
- Check `docs/README.md` navigation
- Use GitHub search
- Ask in Discord

**Want to contribute docs?**
- See `docs/CONTRIBUTING.md`
- Follow the structure
- Submit a PR

**Old link broken?**
- Check the migration map above
- Search for new location
- Update your references

---

**Let's keep documentation organized and maintainable!** 📚✨
