# Documentation Cleanup - Action Plan

**Goal:** Organize messy SPEC/ folder into clean docs/ structure

---

## Current Problem

```
SPEC/
├── 15 markdown files
├── 8 files just for STT (redundant!)
├── No clear navigation
└── Hard to find anything
```

**Result:** Documentation is overwhelming and hard to maintain.

---

## Solution

```
docs/
├── README.md (main index)
├── OVERVIEW.md (what is Toji?)
├── quickstart/ (getting started)
├── architecture/ (system design)
├── features/ (user docs)
└── implementation/ (dev guides)
```

**Result:** Clear hierarchy, easy navigation, consolidated information.

---

## Action Items

### ✅ Phase 1: Create Structure (DONE)
- [x] Create `docs/` folder
- [x] Create subdirectories
- [x] Create main README with navigation
- [x] Create OVERVIEW.md
- [x] Create MIGRATION.md guide

### 🚧 Phase 2: Consolidate Documents (NEXT)

**High Priority:**
- [ ] Consolidate 8 STT files → `docs/implementation/PHASE3_STT.md`
- [ ] Consolidate 3 TTS files → `docs/implementation/PHASE2_TTS.md`
- [ ] Consolidate 2 Discord files → `docs/features/DISCORD.md`

**Medium Priority:**
- [ ] Move `FRONTEND.md` → `docs/architecture/FRONTEND.md`
- [ ] Move `OPENCODE.md` → `docs/features/OPENCODE.md`
- [ ] Create `docs/architecture/SYSTEM.md` (overall architecture)
- [ ] Create `docs/implementation/WORKFLOW.md` (from .github/instructions)

**Low Priority:**
- [ ] Create `docs/quickstart/README.md`
- [ ] Create `docs/CONTRIBUTING.md`
- [ ] Create `docs/FAQ.md`

### 📦 Phase 3: Archive Old Files
- [ ] Add archive notice to each SPEC/ file
- [ ] Point to new location
- [ ] Update all code comment links
- [ ] Update README references

### 🧹 Phase 4: Final Cleanup
- [ ] Remove truly obsolete files
- [ ] Update root README.md
- [ ] Test all links work
- [ ] Announce to team

---

## Quick Wins (Do These First)

### 1. Consolidate STT Docs (20 min)

**Combine these 8 files:**
```
SPEC/PHASE3_STT_INDEX.md
SPEC/PHASE3_STT_SUMMARY.md
SPEC/PHASE3_STT_OPTIONS.md
SPEC/PHASE3_STT_PLAN.md
SPEC/PHASE3_STT_ROADMAP.md
SPEC/PHASE3_STT_DECISIONS.md
SPEC/PHASE3_STT_QUICKSTART.md
SPEC/PHASE3_RESEARCH_COMPLETE.md
```

**Into one file:**
```
docs/implementation/PHASE3_STT.md
```

**Structure:**
1. Overview (from SUMMARY)
2. Technology Choice (from OPTIONS + DECISIONS)
3. Quick Start (from QUICKSTART)
4. Implementation Plan (from PLAN + ROADMAP)
5. Integration Guide (from PLAN)

### 2. Move Simple Files (5 min)

```bash
# Architecture docs
mv SPEC/FRONTEND.md docs/architecture/FRONTEND.md

# Feature docs
mv SPEC/OPENCODE.md docs/features/OPENCODE.md
```

### 3. Add Archive Notices (10 min)

Add to top of each old SPEC file:
```markdown
> ⚠️ **ARCHIVED**: This document has moved.
> See [docs/README.md](../docs/README.md) for current documentation.
> New location: [docs/XXX/YYY.md](../docs/XXX/YYY.md)
```

---

## File-by-File Plan

### STT Documentation

| Old File | Action | Priority |
|----------|--------|----------|
| `PHASE3_STT_INDEX.md` | Merge into new doc | High |
| `PHASE3_STT_SUMMARY.md` | Use as overview section | High |
| `PHASE3_STT_OPTIONS.md` | Use as tech choice section | High |
| `PHASE3_STT_PLAN.md` | Use as implementation section | High |
| `PHASE3_STT_ROADMAP.md` | Use as roadmap section | High |
| `PHASE3_STT_DECISIONS.md` | Use as decisions section | High |
| `PHASE3_STT_QUICKSTART.md` | Use as quickstart section | High |
| `PHASE3_RESEARCH_COMPLETE.md` | Delete (temp file) | Low |

**Result:** 1 comprehensive guide instead of 8 scattered files.

### TTS Documentation

| Old File | Action | Priority |
|----------|--------|----------|
| `PHASE2_TTS_PLAN.md` | Use as main section | High |
| `PHASE2_TTS_QUICKSTART.md` | Merge as quickstart section | High |
| `TTS_IMPLEMENTATION_REVIEW.md` | Merge as lessons section | High |

**Result:** 1 complete TTS guide.

### Discord Documentation

| Old File | Action | Priority |
|----------|--------|----------|
| `DISCORD_EMBED_SYSTEM.md` | Merge as embeds section | Med |
| `DISCORD_VOICE_SYSTEM.md` | Merge as voice section | Med |

**Result:** 1 Discord feature guide.

### Architecture Documentation

| Old File | Action | Priority |
|----------|--------|----------|
| `FRONTEND.md` | Move to architecture/ | Med |
| Create new | `SYSTEM.md` overall architecture | Low |
| Create new | `MCP.md` MCP tools | Low |

### Feature Documentation

| Old File | Action | Priority |
|----------|--------|----------|
| `OPENCODE.md` | Move to features/ | Med |
| Create new | `PROJECTS.md` project management | Low |
| Create new | `TTS.md` user guide | Low |
| Create new | `STT.md` user guide | Low |

---

## Success Metrics

### Before Cleanup
- 15 files in SPEC/
- 8 files for one feature (STT)
- No clear entry point
- Duplicate information

### After Cleanup
- ~8-10 well-organized files in docs/
- 1 file per major topic
- Clear README navigation
- No duplication

---

## Timeline

**Today (2 hours):**
- ✅ Create docs/ structure
- ✅ Create README + OVERVIEW
- 🎯 Consolidate STT docs (8 → 1)
- 🎯 Consolidate TTS docs (3 → 1)

**Tomorrow (1 hour):**
- Consolidate Discord docs (2 → 1)
- Move architecture docs
- Create workflow guide

**Day 3 (30 min):**
- Add archive notices
- Update references
- Test all links

---

## Commands

### Create consolidated STT doc
```bash
# Combine key sections from 8 files into 1
cat SPEC/PHASE3_STT_SUMMARY.md > docs/implementation/PHASE3_STT.md
# Then manually organize sections
```

### Move simple files
```bash
mv SPEC/FRONTEND.md docs/architecture/
mv SPEC/OPENCODE.md docs/features/
```

### Add archive notice (example)
```bash
# Add to top of SPEC/PHASE3_STT_PLAN.md
echo '> ⚠️ **ARCHIVED**: See docs/implementation/PHASE3_STT.md' > temp.md
cat SPEC/PHASE3_STT_PLAN.md >> temp.md
mv temp.md SPEC/PHASE3_STT_PLAN.md
```

---

## Next Steps

**Right now:**
1. Read docs/README.md to see new structure
2. Review docs/MIGRATION.md for full plan
3. Start consolidating STT docs (biggest win)

**Want to help?**
- Pick a consolidation task
- Follow the structure
- Test that links work
- Submit a PR

---

**Let's make documentation great again!** 📚✨
