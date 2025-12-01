# Kilo Code Usage Guidelines for Toji Project

**Last Updated:** October 27, 2025
**Purpose:** Team guidelines for effective Kilo Code usage

---

## Quick Start

### When to Use Each Mode

#### 🏗️ Architect Mode

**Use for:**

- Planning new features
- Designing system architecture
- Creating technical specifications
- Reviewing existing architecture
- Breaking down complex problems

**Best Practices:**

- Open SPEC files in tabs
- Close source code files
- Use natural language queries
- Focus on high-level design

**Example:**

```
"Design an architecture for adding real-time collaboration features"
```

#### 💻 Code Mode

**Use for:**

- Implementing features
- Fixing bugs
- Refactoring code
- Writing new components
- Making code changes

**Best Practices:**

- Open relevant source files in tabs
- Use codebase_search before reading files
- Read related files together (up to 5 at once)
- Keep documentation closed unless needed

**Example:**

```
"Fix the Discord service race condition in discord-service.ts"
```

#### 🐛 Debug Mode

**Use for:**

- Investigating errors
- Analyzing logs
- Troubleshooting issues
- Performance profiling
- Understanding error flows

**Best Practices:**

- Open log files if available
- Open error-prone source files
- Use search_files for error patterns
- Check recent git changes

**Example:**

```
"Why is the server health check failing intermittently?"
```

#### 🎯 Ask Mode

**Use for:**

- Understanding existing code
- Learning about features
- Getting explanations
- Code reviews
- Documentation questions

**Best Practices:**

- Be specific about what you want to understand
- Reference specific files or features
- Ask follow-up questions
- Request examples

**Example:**

```
"Explain how the Discord embed system works and show me the key files"
```

---

## Search Best Practices

### 1. Use Natural Language Queries

```typescript
// ✅ GOOD - Natural language
codebase_search('How does Discord handle voice connections?')

// ❌ LESS EFFECTIVE - Keywords only
codebase_search('Discord voice handler')
```

### 2. Scope to Relevant Directories

```typescript
// ✅ GOOD - Scoped search
codebase_search('session management', 'src/main/toji')

// ⚠️ OK BUT SLOWER - Searches everything
codebase_search('session management')
```

### 3. Use Project Terminology

```typescript
// ✅ GOOD - Uses project terms
codebase_search('OpenCode SDK session lifecycle and message handling')

// ❌ GENERIC - May miss context
codebase_search('session lifecycle')
```

### 4. Combine Search Types

```typescript
// 1. Start with semantic search
codebase_search('Discord message embed updates')

// 2. Then use regex for specific patterns
search_files('createProgressEmbed', 'src/plugins/discord', '*.ts')

// 3. Finally read the specific files
read_file('src/plugins/discord/utils/messages.ts')
```

---

## File Management

### Keep Relevant Tabs Open

**High Priority (Always Open):**

- File you're currently editing
- Related type definition files
- Interface files for the feature

**Medium Priority (Open When Relevant):**

- Related service files
- Handler files for IPC
- Test files

**Low Priority (Close Unless Needed):**

- Documentation files
- Configuration files
- Unrelated features

### Example Workflow

**Task:** Fix a bug in Discord message handling

```
1. Close all tabs
2. Open: src/plugins/discord/DiscordPlugin.ts
3. Open: src/plugins/discord/utils/messages.ts
4. Open: src/plugins/discord/constants.ts
5. Use codebase_search to find related code
6. Read additional files as needed
7. Make changes
8. Close tabs when done
```

---

## Token Budget Management

### Understanding Token Usage

**Your Project:**

- Source Code: ~50,000 tokens
- SPEC Files: ~15,000 tokens
- Documentation: ~20,000 tokens
- Open Tabs: ~5,000 tokens
- Conversation: ~10,000 tokens
- **Total:** ~100,000 tokens (50% of budget)

**Remaining Budget:** ~100,000 tokens for AI reasoning

### When to Optimize

**Normal Usage (No Action Needed):**

- Working on single feature
- 5-10 open tabs
- Standard conversation length
- Budget: ~100K tokens used

**Heavy Usage (Optimize):**

- Large refactoring across many files
- 20+ open tabs
- Long conversation history
- Budget: >150K tokens used

**Optimization Actions:**

1. Close unnecessary tabs
2. Start new conversation for new topic
3. Use scoped searches instead of reading all files
4. Focus on one area at a time

---

## Mode-Specific Workflows

### Architect Mode Workflow

```
1. Open SPEC files related to feature
2. Close all source code files
3. Use codebase_search to understand current implementation
4. Ask high-level design questions
5. Create architecture documents
6. Switch to Code mode for implementation
```

### Code Mode Workflow

```
1. Use codebase_search to find relevant code
2. Read related files together (up to 5)
3. Open files in tabs as you work on them
4. Make changes incrementally
5. Test after each change
6. Close tabs when feature complete
```

### Debug Mode Workflow

```
1. Reproduce the issue
2. Check logs in AppData/Roaming/toji3/logs/
3. Use search_files to find error patterns
4. Read files where errors occur
5. Use codebase_search to understand context
6. Identify root cause
7. Switch to Code mode to fix
```

---

## Project-Specific Tips

### For Toji Development

1. **Main Process Work:**
   - Focus on `src/main/` directory
   - Keep type files open (`types.ts`, `interfaces.ts`)
   - Reference SPEC files for architecture

2. **React/UI Work:**
   - Focus on `src/renderer/` directory
   - Keep `theme.ts` open for styling
   - Reference `SPEC/FRONTEND.md` for guidelines

3. **Discord Plugin Work:**
   - Focus on `src/plugins/discord/` directory
   - Keep `constants.ts` and `interfaces.ts` open
   - Reference `SPEC/DISCORD_EMBED_SYSTEM.md`

4. **Refactoring Work:**
   - Reference `TOJI_REFACTORING_DESIGN.md`
   - Work on one coordinator at a time
   - Keep related test files open

### Common Patterns

**Pattern 1: Adding New Feature**

```
1. Architect mode: Design the feature
2. Code mode: Implement in main process
3. Code mode: Add IPC handler
4. Code mode: Add preload API
5. Code mode: Create React hook
6. Code mode: Add UI component
7. Debug mode: Test and fix issues
```

**Pattern 2: Fixing Bug**

```
1. Debug mode: Identify root cause
2. Code mode: Implement fix
3. Code mode: Add tests
4. Debug mode: Verify fix works
```

**Pattern 3: Refactoring**

```
1. Architect mode: Design new structure
2. Code mode: Create new files
3. Code mode: Migrate code incrementally
4. Code mode: Update references
5. Debug mode: Test thoroughly
6. Code mode: Remove old code
```

---

## Team Best Practices

### Do's ✅

- ✅ Use codebase_search before reading files
- ✅ Read related files together (batch reads)
- ✅ Keep tabs focused on current task
- ✅ Use appropriate mode for the task
- ✅ Reference SPEC files for architecture
- ✅ Close tabs when switching contexts
- ✅ Use natural language in searches

### Don'ts ❌

- ❌ Don't open 20+ tabs at once
- ❌ Don't read files one by one (batch them)
- ❌ Don't use Code mode for design questions
- ❌ Don't ignore mode restrictions
- ❌ Don't skip codebase_search for new areas
- ❌ Don't keep irrelevant tabs open
- ❌ Don't use generic search terms

---

## Troubleshooting

### "Kilo Code seems slow"

**Causes:**

- Too many open tabs
- Large files in context
- Long conversation history

**Solutions:**

1. Close unnecessary tabs
2. Start new conversation
3. Use scoped searches
4. Check `.kilocodeignore` is working

### "Kilo Code can't find relevant code"

**Causes:**

- Not using codebase_search
- Search query too generic
- Relevant files excluded

**Solutions:**

1. Use codebase_search with natural language
2. Be more specific in queries
3. Check `.kilocodeignore` isn't excluding needed files
4. Use project-specific terminology

### "Kilo Code suggests wrong files"

**Causes:**

- Irrelevant files in open tabs
- Poor search scoping
- Missing context

**Solutions:**

1. Close irrelevant tabs
2. Scope searches to specific directories
3. Read related files together
4. Provide more context in queries

---

## Quick Reference

### File Locations

**Core Logic:**

- `src/main/toji/` - Main Toji orchestrator
- `src/main/handlers/` - IPC handlers
- `src/main/services/` - Service layer

**UI:**

- `src/renderer/src/components/` - React components
- `src/renderer/src/hooks/` - Custom hooks
- `src/renderer/src/contexts/` - React contexts

**Discord:**

- `src/plugins/discord/` - Discord bot plugin
- `src/plugins/discord/voice/` - Voice features

**Documentation:**

- `SPEC/` - Technical specifications
- `*REFACTORING*.md` - Refactoring docs
- `ARCHITECTURAL_ASSESSMENT.md` - Architecture review

### Common Commands

```bash
# Type checking
npm run typecheck

# Linting
npm run lint

# Formatting
npm run format

# Development
npm run dev

# Build
npm run build
```

---

## Success Indicators

**Good Kilo Code Usage:**

- ✅ Fast, relevant responses
- ✅ Correct file references
- ✅ Minimal unnecessary reads
- ✅ Appropriate mode selection
- ✅ Efficient token usage

**Needs Improvement:**

- ❌ Slow responses
- ❌ Irrelevant suggestions
- ❌ Many "need more context" messages
- ❌ Wrong mode for task
- ❌ High token consumption

---

## Resources

- **Context Optimization:** [`KILO_CODE_CONTEXT_OPTIMIZATION.md`](KILO_CODE_CONTEXT_OPTIMIZATION.md)
- **Architecture:** [`ARCHITECTURAL_ASSESSMENT.md`](ARCHITECTURAL_ASSESSMENT.md)
- **Refactoring Plan:** [`REFACTORING_PLAN.md`](REFACTORING_PLAN.md)
- **Frontend Guidelines:** [`SPEC/FRONTEND.md`](SPEC/FRONTEND.md)

---

**Remember:** Kilo Code is most effective when given focused, relevant context. Keep your workspace clean, use appropriate modes, and leverage semantic search!
