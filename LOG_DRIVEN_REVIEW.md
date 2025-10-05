# Log-Driven Architecture Review System

**Date:** October 5, 2025
**Goal:** Combine static analysis (dependency graphs) with runtime analysis (logs) for intelligent code review

---

## 🎯 The Hybrid Approach

### Static Analysis (What the code _is_)

- Dependency graphs show structure
- Call hierarchies show relationships
- Metrics show complexity

### Runtime Analysis (What the code _does_)

- Logs show actual execution paths
- Logs reveal performance bottlenecks
- Logs expose error patterns

### Combined = Powerful Review Strategy 🚀

---

## 📊 Step 1: Generate Focused Dependency Graphs

Let's create targeted graphs for each major subsystem:

### A. Main Process Architecture

```powershell
# Core Toji system
npx depcruise src/main/toji --output-type dot | Out-File -Encoding ASCII graphs/toji-core.dot
& "C:\Program Files (x86)\Graphviz\bin\dot.exe" -Tsvg graphs/toji-core.dot -o graphs/toji-core.svg

# Services layer
npx depcruise src/main/services --output-type dot | Out-File -Encoding ASCII graphs/services.dot
& "C:\Program Files (x86)\Graphviz\bin\dot.exe" -Tsvg graphs/services.dot -o graphs/services.svg

# Handlers (IPC)
npx depcruise src/main/handlers --output-type dot | Out-File -Encoding ASCII graphs/handlers.dot
& "C:\Program Files (x86)\Graphviz\bin\dot.exe" -Tsvg graphs/handlers.dot -o graphs/handlers.svg
```

### B. Discord Plugin Architecture

```powershell
npx depcruise src/plugins/discord --output-type dot | Out-File -Encoding ASCII graphs/discord.dot
& "C:\Program Files (x86)\Graphviz\bin\dot.exe" -Tsvg graphs/discord.dot -o graphs/discord.svg
```

---

## 📋 Step 2: Extract Log Patterns

Create a smart log analyzer that maps logs to architecture:

```powershell
# Run this to analyze your logs
node scripts/analyze-log-patterns.js
```

This will generate:

- `analysis/log-hotspots.json` - Most frequently logged modules
- `analysis/error-clusters.json` - Where errors concentrate
- `analysis/execution-paths.json` - Common code paths from logs
- `analysis/performance-bottlenecks.json` - Slow operations

---

## 🔍 Step 3: Cross-Reference Analysis

### For Each Module, Ask:

1. **Structural Questions (from graphs):**
   - How many dependencies does it have?
   - Is it in a circular dependency?
   - How many modules depend on it?
2. **Behavioral Questions (from logs):**
   - How often is it executed?
   - Does it log errors frequently?
   - Are there performance issues?

3. **Quality Questions (combined):**
   - High complexity + high error rate = URGENT REVIEW
   - High coupling + low test coverage = RISK
   - Many callers + poor error handling = CRITICAL

---

## 🎯 Smart Review Priority System

### Priority 1: High-Risk Modules (Review First)

Modules that are:

- Central to architecture (many dependents)
- Frequently executed (many logs)
- Error-prone (error logs present)

**How to find them:**

1. Open dependency graph
2. Find nodes with many incoming edges (many dependents)
3. Cross-reference with error log frequency
4. **These are your critical paths**

### Priority 2: Performance Bottlenecks

Modules that:

- Have slow operations in logs
- Are in hot paths (frequently called)
- Block other operations

### Priority 3: Complexity Clusters

Modules that:

- Have high coupling (many dependencies)
- Are in circular dependencies
- Have unclear responsibilities

### Priority 4: Everything Else

---

## 🛠️ Practical Review Workflow

### Day 1: Map the Territory

```powershell
# 1. Generate all dependency graphs
.\scripts\generate-all-graphs.ps1

# 2. Analyze recent logs
.\scripts\analyze-log-patterns.js "$env:APPDATA\toji3\logs\toji-2025-10-05.log"

# 3. Generate combined report
.\scripts\generate-review-priorities.js
```

**Output:** `REVIEW_PRIORITIES.md` with ranked list of modules to review

### Day 2-10: Systematic Review

For each high-priority module:

```powershell
# 1. Open the module file
code src/main/toji/sessions.ts

# 2. View its dependencies
npx depcruise src/main/toji/sessions.ts --output-type dot | Out-File -Encoding ASCII temp.dot
& "C:\Program Files (x86)\Graphviz\bin\dot.exe" -Tsvg temp.dot -o temp.svg
code temp.svg

# 3. See who calls it
# (Right-click function → "Show Call Hierarchy")

# 4. Review its logs
Get-Content "$env:APPDATA\toji3\logs\toji-2025-10-05.log" | Select-String "sessions"

# 5. Complete the review checklist
```

### Review Checklist (Per Module)

```markdown
## Module: [name]

### Architecture (from graph)

- [ ] Dependencies: \_\_ (should be <5 for most modules)
- [ ] Dependents: \_\_ (if >10, consider splitting)
- [ ] Circular deps: Yes/No (if yes, MUST FIX)
- [ ] Layer violation: Yes/No (handlers shouldn't import services directly)

### Behavior (from logs)

- [ ] Execution frequency: Low/Medium/High
- [ ] Error rate: \_\_% (if >1%, investigate)
- [ ] Avg operation time: \_\_ms (if >100ms for non-I/O, optimize)
- [ ] Log quality: Clear/Unclear (messages make sense?)

### Code Quality

- [ ] Error handling: Complete/Incomplete
- [ ] Type safety: Full/Partial (no `any` types?)
- [ ] Resource cleanup: Proper/Missing
- [ ] Tests: Yes/No
- [ ] Documentation: Yes/No

### Action Items

- [ ] Refactor to reduce coupling
- [ ] Add error handling for \_\_
- [ ] Optimize \_\_ operation
- [ ] Add tests for \_\_
- [ ] Document \_\_ behavior
```

---

## 🚀 Quick Start Scripts

I'll create these helper scripts:

### 1. `scripts/generate-all-graphs.ps1`

Generates all dependency graphs in one command

### 2. `scripts/analyze-log-patterns.js`

Extracts patterns from log files

### 3. `scripts/generate-review-priorities.js`

Combines static + runtime analysis to prioritize reviews

### 4. `scripts/review-module.ps1`

Interactive module review helper

---

## 📈 Example: Reviewing `toji/sessions.ts`

### Static Analysis (Dependency Graph)

```
sessions.ts depends on:
  - config.ts
  - types.ts
  - logger.ts
  - opencode SDK

sessions.ts is used by:
  - index.ts (Toji class)
  - session.handlers.ts
  - discord/DiscordPlugin.ts (via Toji)
```

**Assessment:** Central module, moderate coupling ✅

### Runtime Analysis (Logs)

```
[1759696356] DEBUG toji:sessions: Creating session for project...
[1759696356] DEBUG toji:sessions: Session created: ses_abc123
[1759696356] DEBUG toji:chat: Session idle - response complete
```

**Assessment:** Frequently used, no errors ✅

### Combined Review Decision

- **Priority:** Medium (central but stable)
- **Review Focus:**
  - Verify error handling for edge cases
  - Check resource cleanup on session end
  - Ensure proper typing
- **Estimated Time:** 30 minutes

---

## 🎯 Success Metrics

### Before Review

- Unknown architectural hotspots
- Unclear error patterns
- Reactive debugging

### After Review

- Top 10 critical modules documented
- Error handling standardized
- Proactive monitoring in place
- Confident in architecture

---

## 📚 Tools We're Using

1. **dependency-cruiser** - Module dependency analysis
2. **Graphviz** - Graph visualization
3. **VS Code Call Hierarchy** - Function call chains
4. **Custom scripts** - Log pattern analysis
5. **This guide** - Systematic review process

---

## 🔥 Next Steps

1. Run `.\scripts\setup-review-workspace.ps1` to create all necessary directories
2. Generate initial graphs and reports
3. Review the top 3 priority modules today
4. Track progress in `REVIEW_PROGRESS.md`

**Let's turn your MVP into production-grade software!** 🚀
