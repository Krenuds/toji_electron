# Toji Documentation

This directory contains comprehensive documentation for the Toji project.

## 📁 Directory Structure

```
docs/
├── refactoring/     # Refactoring initiative documentation
├── guides/          # Usage guides and best practices
└── README.md        # This file
```

---

## 🔧 Refactoring Documentation

Located in [`refactoring/`](refactoring/)

### Assessment & Planning

- **[`ARCHITECTURAL_ASSESSMENT.md`](refactoring/ARCHITECTURAL_ASSESSMENT.md)** - Complete architecture review identifying 13 issues
- **[`BUGS_AND_ISSUES.md`](refactoring/BUGS_AND_ISSUES.md)** - Comprehensive bug inventory (18 issues catalogued)
- **[`REFACTORING_PLAN.md`](refactoring/REFACTORING_PLAN.md)** - 8-week, 3-phase roadmap (~280 hours)

### Implementation Reports

- **[`P0_BUGS_FIXED.md`](refactoring/P0_BUGS_FIXED.md)** - Phase 1: Critical bug fixes (3 P0 bugs)
- **[`PHASE_2_PROGRESS.md`](refactoring/PHASE_2_PROGRESS.md)** - Phase 2: Refactoring progress (4 P1 bugs)
- **[`PHASE_3_COMPLETE.md`](refactoring/PHASE_3_COMPLETE.md)** - Phase 3: Polish & documentation

### Architecture Design

- **[`TOJI_REFACTORING_DESIGN.md`](refactoring/TOJI_REFACTORING_DESIGN.md)** - Coordinator architecture for breaking down Toji class
- **[`REFACTORING_COMPLETE_SUMMARY.md`](refactoring/REFACTORING_COMPLETE_SUMMARY.md)** - Overall summary and results

---

## 📖 Usage Guides

Located in [`guides/`](guides/)

- **[`KILO_CODE_USAGE.md`](guides/KILO_CODE_USAGE.md)** - Team guidelines for effective Kilo Code usage
- **[`KILO_CODE_CONTEXT_OPTIMIZATION.md`](guides/KILO_CODE_CONTEXT_OPTIMIZATION.md)** - Context management optimization strategies

---

## 📋 Technical Specifications

Located in [`../SPEC/`](../SPEC/)

- **[`DISCORD_EMBED_SYSTEM.md`](../SPEC/DISCORD_EMBED_SYSTEM.md)** - Discord embed system architecture
- **[`DISCORD_VOICE_SYSTEM.md`](../SPEC/DISCORD_VOICE_SYSTEM.md)** - Voice system specification
- **[`FRONTEND.md`](../SPEC/FRONTEND.md)** - Frontend development guidelines
- **[`IMAGE_SUPPORT.md`](../SPEC/IMAGE_SUPPORT.md)** - Image attachment support
- **[`LOGGER.md`](../SPEC/LOGGER.md)** - Logging system documentation
- **[`OPENCODE.md`](../SPEC/OPENCODE.md)** - OpenCode SDK reference
- **[`STTTTS.md`](../SPEC/STTTTS.md)** - Speech-to-text/text-to-speech implementation
- **[`SUBPROCESS_ELEVATION.md`](../SPEC/SUBPROCESS_ELEVATION.md)** - Windows subprocess elevation handling

---

## 🎯 Quick Links

### For New Developers

1. Start with [`../README.md`](../README.md) - Project overview
2. Read [`REFACTORING_COMPLETE_SUMMARY.md`](refactoring/REFACTORING_COMPLETE_SUMMARY.md) - Current state
3. Review [`../SPEC/FRONTEND.md`](../SPEC/FRONTEND.md) - Frontend guidelines
4. Check [`guides/KILO_CODE_USAGE.md`](guides/KILO_CODE_USAGE.md) - AI tool usage

### For Bug Fixes

1. Check [`BUGS_AND_ISSUES.md`](refactoring/BUGS_AND_ISSUES.md) - Known issues
2. Review relevant SPEC file for architecture
3. Use [`guides/KILO_CODE_USAGE.md`](guides/KILO_CODE_USAGE.md) - Debug mode workflow

### For New Features

1. Review [`ARCHITECTURAL_ASSESSMENT.md`](refactoring/ARCHITECTURAL_ASSESSMENT.md) - Current architecture
2. Check [`TOJI_REFACTORING_DESIGN.md`](refactoring/TOJI_REFACTORING_DESIGN.md) - Planned improvements
3. Follow [`../SPEC/FRONTEND.md`](../SPEC/FRONTEND.md) - Development guidelines

### For Refactoring

1. Read [`REFACTORING_PLAN.md`](refactoring/REFACTORING_PLAN.md) - Complete roadmap
2. Review [`TOJI_REFACTORING_DESIGN.md`](refactoring/TOJI_REFACTORING_DESIGN.md) - Architecture design
3. Check phase reports for current status

---

## 📊 Project Status

**Current Health:** B+ (Stable and well-documented)

**Bugs Fixed:** 8 of 18 (44%)

- ✅ P0 Critical: 3/3 (100%)
- ✅ P1 Major: 4/6 (67%)
- ✅ P2 Minor: 1/6 (17%)

**Code Quality:**

- ✅ 0 TypeScript errors
- ✅ 0 ESLint errors
- ✅ All files formatted
- ✅ Error boundaries added

**Documentation:**

- ✅ 11 comprehensive documents
- ✅ 8 technical specifications
- ✅ Complete refactoring roadmap

---

## 🔄 Maintenance

### Keeping Documentation Updated

**When to Update:**

- After fixing bugs → Update BUGS_AND_ISSUES.md
- After refactoring → Update relevant phase report
- After architecture changes → Update ARCHITECTURAL_ASSESSMENT.md
- After adding features → Update relevant SPEC file

**Review Schedule:**

- Monthly: Review bug list and close fixed issues
- Quarterly: Update architecture assessment
- Per release: Update SPEC files to match implementation

---

**Last Updated:** October 27, 2025
**Maintained By:** Development Team
