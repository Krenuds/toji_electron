# GitHub Copilot Instructions Setup

## Overview

This project uses GitHub Copilot's custom instructions system with three layers of context:

## Instruction Files

### 1. Repository-Wide Instructions

**File:** `.github/copilot-instructions.md`

**Purpose:** Core development guidelines sent with EVERY Copilot request in this repository

**Used by:**

- GitHub Copilot Chat (in VS Code and GitHub.com)
- GitHub Copilot coding agent
- GitHub Copilot code review

**Content:**

- Project architecture overview
- Development workflow (mandatory 7-step process)
- Quality gates and commands
- File structure guide
- Key technical constraints
- Common mistakes to avoid

### 2. Path-Specific Instructions

**File:** `.github/instructions/WORKFLOW.instructions.md`

**Purpose:** Workflow reminders applied to all files (`applyTo: '**'`)

**Used by:**

- GitHub Copilot coding agent
- GitHub Copilot code review

**Content:**

- Quick workflow checklist
- Success metrics
- Reminder to echo "I'm DOING IT"

### 3. Agent Instructions

**File:** `CLAUDE.md` (root directory)

**Purpose:** Comprehensive architectural manual for AI coding agents

**Used by:**

- GitHub Copilot coding agent
- GitHub Copilot CLI
- AI assistants working on the codebase

**Content:**

- Deep architectural principles
- Technology decisions and rationale
- Complete development patterns
- Migration guides
- Common pitfalls
- Documentation resources

## How They Work Together

### When Copilot Chat is Used:

1. Reads `.github/copilot-instructions.md` (repository-wide context)
2. User can enable/disable in settings

### When Coding Agent Works on Files:

1. Reads `.github/copilot-instructions.md` (repository-wide)
2. Reads `.github/instructions/WORKFLOW.instructions.md` (path-specific, matches all files)
3. Reads `CLAUDE.md` (agent instructions at root)

All three are combined and sent with agent requests.

### When Code Review Runs:

1. Reads `.github/copilot-instructions.md`
2. Reads `.github/instructions/WORKFLOW.instructions.md`
3. Can be toggled in repository settings

## Viewing Active Instructions

In Copilot Chat responses, click the "References" dropdown to see which instruction files were used. You'll see entries like:

- `.github/copilot-instructions.md`
- `.github/instructions/WORKFLOW.instructions.md`
- `CLAUDE.md`

## Disabling Instructions

### For Copilot Chat:

1. Open Copilot Chat panel
2. Click conversation options (⋮)
3. Select "Disable custom instructions"

### For Code Review:

1. Go to repository Settings
2. Navigate to Code & automation → Copilot → Code review
3. Toggle "Use custom instructions when reviewing pull requests"

## Best Practices

### copilot-instructions.md (Repository-Wide)

✅ **DO:**

- Keep under 2 pages
- Include build/test commands
- Document folder structure
- List key dependencies
- Specify coding standards

❌ **DON'T:**

- Make it task-specific
- Request particular response styles
- Reference external resources
- Use language like "always respond in X style"

### WORKFLOW.instructions.md (Path-Specific)

✅ **DO:**

- Use frontmatter with `applyTo` patterns
- Keep focused on specific file types or paths
- Combine with repository-wide instructions

❌ **DON'T:**

- Duplicate repository-wide content
- Forget the frontmatter block

### CLAUDE.md (Agent Instructions)

✅ **DO:**

- Provide comprehensive context
- Explain architectural decisions
- Include code examples
- Document common pitfalls

❌ **DON'T:**

- Worry about length limits
- Duplicate basic project setup

## Priority Order

When instructions conflict (which you should avoid):

1. **Personal instructions** (user's own Copilot settings) - highest priority
2. **Repository instructions** (this project's `.github/copilot-instructions.md`)
3. **Organization instructions** (if set at org level) - lowest priority

However, all relevant instructions are combined and sent together, so make them complementary, not conflicting.

## Maintenance

### When to Update:

**copilot-instructions.md:**

- Major architecture changes
- New build commands
- Updated dependencies
- New coding standards

**WORKFLOW.instructions.md:**

- Workflow process changes
- New quality gates
- Updated validation steps

**CLAUDE.md:**

- Deep architectural changes
- New technology decisions
- Updated design patterns
- Migration guides

## Additional Notes

- Instructions are stored in the repository and versioned with git
- They apply to anyone using Copilot with this repository
- Instructions are plain Markdown files (no special syntax beyond frontmatter)
- Changes take effect immediately (no restart needed)

---

**Reference:** [GitHub Copilot Custom Instructions Documentation](https://docs.github.com/en/copilot/customizing-copilot/adding-custom-instructions-for-github-copilot)
