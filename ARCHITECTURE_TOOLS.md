# Toji3 Architecture Analysis - Tool-Based Approach

**Date:** October 5, 2025
**Status:** Automated analysis complete

---

## 🎯 The Smart Way: Using Existing Tools

Instead of building custom log analysis scripts, we're using **industry-standard tools** that already solve this problem:

## 📊 Tools Installed & Configured

### 1. **Dependency Cruiser** ✅ Installed

The gold standard for JavaScript/TypeScript dependency analysis.

**What it does:**

- Maps all module dependencies
- Detects circular dependencies
- Visualizes architecture
- Validates architectural rules

**Files generated:**

- `architecture.svg` - Visual dependency graph
- `dependency-analysis.json` - Machine-readable analysis
- `.dependency-cruiser.js` - Configuration

### 2. **Call Graphs** (VS Code Built-in)

**How to use:**

1. Right-click any function → **"Show Call Hierarchy"**
2. See who calls this function (incoming)
3. See what this function calls (outgoing)
4. Navigate the entire call chain visually

### 3. **VS Code Extensions** (Recommended)

```bash
code --install-extension juanallo.vscode-dependency-cruiser
code --install-extension luozhihao.call-graph
code --install-extension oleg-shilo.codemap
```

---

## 🗺️ Understanding Your Architecture

### What is a "Call Graph"?

A **call graph** is a directed graph where:

- **Nodes** = Functions/methods
- **Edges** = Function calls

Example:

```
main()
  ├─> initialize()
  │     ├─> loadConfig()
  │     └─> startServer()
  └─> run()
        ├─> processRequest()
        └─> handleResponse()
```

### What is a "Dependency Graph"?

A **dependency graph** shows module/file relationships:

- **Nodes** = Files/modules
- **Edges** = Import statements

Example:

```
src/main/index.ts
  ├─> src/main/toji/index.ts
  │     ├─> src/main/toji/sessions.ts
  │     └─> src/main/toji/config.ts
  └─> src/main/handlers/index.ts
```

---

## 🔍 Your Toji3 Architecture (High-Level)

Based on dependency analysis:

```
┌─────────────────────────────────────────────────────────┐
│                    Electron Main Process                 │
│  ┌───────────────────────────────────────────────────┐  │
│  │            src/main/index.ts (Entry)              │  │
│  └────────────────────┬──────────────────────────────┘  │
│                       │                                  │
│         ┌─────────────┼─────────────┬──────────────┐    │
│         ▼             ▼             ▼              ▼    │
│    ┌────────┐   ┌─────────┐   ┌─────────┐   ┌────────┐ │
│    │ Toji   │   │Handlers │   │Services │   │Config  │ │
│    │ Core   │   │  (IPC)  │   │         │   │Provider│ │
│    └───┬────┘   └────┬────┘   └────┬────┘   └────────┘ │
│        │             │             │                     │
│        │   ┌─────────┴─────────┐   │                    │
│        │   ▼                   ▼   ▼                    │
│        │ ┌──────────────┐  ┌──────────────┐            │
│        └─► OpenCode SDK │  │  Voice Svc   │            │
│          └──────────────┘  └──────────────┘            │
└─────────────────────────────────────────────────────────┘

┌─────────────────────────────────────────────────────────┐
│                     Discord Plugin                       │
│  ┌───────────────────────────────────────────────────┐  │
│  │         src/plugins/discord/DiscordPlugin.ts      │  │
│  └────────────────────┬──────────────────────────────┘  │
│                       │                                  │
│         ┌─────────────┼─────────────┬──────────────┐    │
│         ▼             ▼             ▼              ▼    │
│    ┌────────┐   ┌─────────┐   ┌─────────┐   ┌────────┐ │
│    │Commands│   │ Modules │   │  Voice  │   │  Utils │ │
│    └────────┘   └─────────┘   └─────────┘   └────────┘ │
└─────────────────────────────────────────────────────────┘

┌─────────────────────────────────────────────────────────┐
│                   Renderer Process (UI)                  │
│  ┌───────────────────────────────────────────────────┐  │
│  │              src/renderer/src/App.tsx             │  │
│  └────────────────────┬──────────────────────────────┘  │
│                       │                                  │
│         ┌─────────────┼─────────────┬──────────────┐    │
│         ▼             ▼             ▼              ▼    │
│    ┌────────┐   ┌─────────┐   ┌─────────┐   ┌────────┐ │
│    │ Views  │   │  Hooks  │   │Contexts │   │  Utils │ │
│    └────────┘   └─────────┘   └─────────┘   └────────┘ │
└─────────────────────────────────────────────────────────┘

        Communication via IPC (src/preload/api)
```

---

## 🎬 Recommended Review Process

Instead of manually reviewing logs, use these tools to guide code review:

### Phase 1: Architecture Understanding (1 day)

1. **Open `architecture.svg`** - See the full dependency graph
2. **Identify clusters** - Find tightly coupled modules
3. **Find cycles** - Circular dependencies are code smells
4. **Map critical paths** - From entry point to key features

### Phase 2: Component-by-Component Review (1-2 weeks)

For each major component:

1. **Use Call Hierarchy** - Right-click → "Show Call Hierarchy"
2. **Review high-fan-out functions** - Functions called by many places
3. **Review high-fan-in functions** - Functions that call many things
4. **Check for violations** - IPC handlers should be thin, etc.

### Phase 3: Metrics-Driven Improvements (1-2 weeks)

Use `dependency-analysis.json` to find:

- **Instability** - Modules that change frequently
- **Complexity** - Modules with many dependencies
- **Coupling** - Modules tightly connected to others

---

## 📋 Quick Commands Reference

### Generate Updated Architecture Diagram

```powershell
# Generate graph
npx depcruise src --include-only "^src" --output-type dot | Out-File -Encoding ASCII architecture.dot

# Convert to SVG
& "C:\Program Files (x86)\Graphviz\bin\dot.exe" -Tsvg architecture.dot -o architecture.svg

# View in VS Code
code architecture.svg
```

### Analyze Specific Module

```powershell
# Focus on main process
npx depcruise src/main --output-type dot | Out-File -Encoding ASCII main-architecture.dot
& "C:\Program Files (x86)\Graphviz\bin\dot.exe" -Tsvg main-architecture.dot -o main-architecture.svg

# Focus on Discord plugin
npx depcruise src/plugins/discord --output-type dot | Out-File -Encoding ASCII discord-architecture.dot
& "C:\Program Files (x86)\Graphviz\bin\dot.exe" -Tsvg discord-architecture.dot -o discord-architecture.svg
```

### Find Circular Dependencies

```powershell
npx depcruise src --validate
```

### Generate Detailed Report

```powershell
npx depcruise src --output-type json > full-analysis.json
npx depcruise src --output-type err-html > analysis-report.html
code analysis-report.html
```

---

## 🎯 Simplified Production Readiness Plan

### Week 1: Understand

- [ ] Review `architecture.svg`
- [ ] Identify top 10 most critical modules (by dependency count)
- [ ] Map main data flows (user input → processing → output)
- [ ] Document architectural decisions

### Week 2-3: Review & Fix

For each critical module:

- [ ] Use Call Hierarchy to understand usage
- [ ] Check error handling
- [ ] Verify resource cleanup
- [ ] Add missing type safety
- [ ] Fix circular dependencies
- [ ] Update documentation

### Week 4: Harden

- [ ] Add validation at boundaries (IPC, external APIs)
- [ ] Implement proper error propagation
- [ ] Add health checks
- [ ] Setup monitoring/alerting
- [ ] Create deployment checklist

---

## 💡 Key Insights

**Your logs are valuable** - but they're better used for:

1. **Runtime debugging** - "What happened when it failed?"
2. **Performance profiling** - "Where is time spent?"
3. **Audit trails** - "Who did what when?"

**For code review, use:**

1. **Static analysis** - Dependency graphs, call graphs
2. **Type checking** - TypeScript compiler
3. **Linting** - ESLint rules
4. **Code metrics** - Complexity, coupling, coverage

---

## 🚀 Next Steps

1. **Open `architecture.svg`** in VS Code
2. **Install recommended extensions** (see above)
3. **Start exploring** using Call Hierarchy on key functions
4. **Review the plan** in `PRODUCTION_READINESS_PLAN.md`

**The tools do the heavy lifting - you focus on the design decisions!**

---

## 📚 Resources

- [Dependency Cruiser Docs](https://github.com/sverweij/dependency-cruiser)
- [VS Code Call Hierarchy](https://code.visualstudio.com/docs/editor/editingevolved#_call-hierarchy)
- [TypeScript Project References](https://www.typescriptlang.org/docs/handbook/project-references.html)
- [Visualizing Software Architecture](https://c4model.com/)
