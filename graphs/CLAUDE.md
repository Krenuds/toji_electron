# Architecture Graph Generation Guide

## How It Works

The architecture graph is generated through a two-step pipeline:

### Step 1: Dependency Analysis (dependency-cruiser)

1. **Scans your source code** (`src/` folder)
2. **Parses imports/requires** - Tracks every `import` and `require()` statement
3. **Resolves dependencies** - Maps imports to actual files on disk
4. **Validates against rules** - Checks for circular deps, missing packages, etc.
5. **Outputs .dot file** - Generates a Graphviz DOT format text file

Example `.dot` structure:

```dot
"src/main/index.ts" -> "src/main/handlers/index.ts"
"src/main/handlers/index.ts" -> "src/main/toji/index.ts"
```

### Step 2: Visualization (Graphviz)

1. **Reads .dot file** - Parses the dependency graph structure
2. **Applies layout algorithm** - Positions nodes based on `rankdir` setting
3. **Renders to SVG** - Creates visual representation with colors/shapes
4. **Outputs .svg file** - Final interactive graph you can view in browsers

### The Commands

```powershell
# npm run graph does this:
depcruise src --output-type dot --config .dependency-cruiser.js > architecture.dot
dot -Tsvg architecture.dot -o architecture.svg

# npm run graph:full runs:
powershell -ExecutionPolicy Bypass -File ./scripts/setup-review-workspace.ps1
# (Generates multiple graphs for different parts of the codebase)
```

## Quick Reference

### Generate Graphs

```powershell
npm run graph       # Single architecture graph (fast)
npm run graph:full  # All graph variants (comprehensive)
```

### Output Files

All graph files are in the `graphs/` folder:

- `architecture.dot` - Source graph definition (text format)
- `architecture.svg` - Visual dependency graph (open in browser)
- `full.dot` / `full.svg` - Full architecture view
- `toji-core.dot` / `toji-core.svg` - Core Toji system only
- `services.dot` / `services.svg` - Service layer only
- `handlers.dot` / `handlers.svg` - IPC handlers only
- `discord.dot` / `discord.svg` - Discord plugin only
- `renderer.dot` / `renderer.svg` - UI layer only

## Configuration

### Layout Orientation

Edit `.dependency-cruiser.js` → `reporterOptions.dot.theme.graph`:

**Orientation (`rankdir`):**

- `LR` = Left-to-Right (portrait, narrower) ✅ Current
- `TB` = Top-to-Bottom (landscape, wider)
- `BT` = Bottom-to-Top
- `RL` = Right-to-Left

**Spacing (make more compact):**

```javascript
ranksep: '0.4',  // Vertical spacing (default: 0.5)
nodesep: '0.35'  // Horizontal spacing (default: 0.5)
```

**Line Style (`splines`):**

- `ortho` = Straight orthogonal lines (cleaner, slower) ✅ Current
- `true` = Bezier curves (faster, more organic)
- `line` = Straight diagonal lines

### Suppressing False Positives

For Electron/React apps, certain devDependencies get bundled into production. Add exceptions to the `not-to-dev-dep` rule → `to.pathNot` array:

```javascript
pathNot: [
  'node_modules/@types/',
  'node_modules/electron', // Bundled into production
  'node_modules/react', // Bundled into production
  'node_modules/vite' // Type definitions only
]
```

## Graph Elements

### Colors

- **Black lines** - Normal dependencies
- **Red lines** - Rule violations (dependency issues)
- **Gray nodes** - External modules (node_modules)
- **Colored nodes** - Your source files

### Line Types

- **Solid arrow (→)** - Direct import/require dependency
- **Dashed line (⇢)** - Node.js core module dependency (fs, path, etc.)
- **Open arrow (⊳)** - Type-only import (`import type`)
- **Inverted arrow (◁)** - Re-export (`export * from './module'`)

### Violations

Red lines indicate:

- `not-to-dev-dep` - Production code depending on devDependencies
- `no-non-package-json` - Missing dependency in package.json
- `no-circular` - Circular dependency detected
- `not-to-unresolvable` - Cannot find module

## Tools Used

- **dependency-cruiser** (Node.js package)
  - Installed via: `npm install -D dependency-cruiser`
  - Config file: `.dependency-cruiser.js` at project root
  - Analyzes JavaScript/TypeScript imports and validates against rules
- **Graphviz** (System binary)
  - Location: `C:\Program Files (x86)\Graphviz\bin\dot.exe`
  - Command: `dot -Tsvg input.dot -o output.svg`
  - Renders DOT files into visual formats (SVG, PNG, PDF, etc.)

## How Rules Work

The `.dependency-cruiser.js` config contains "forbidden" rules that flag violations:

- **Red lines** = Rule violation detected
- **Black lines** = Clean dependency

When you see red lines, check the rule name (e.g., `not-to-dev-dep`) and either:

1. Fix the actual issue (add missing package to `package.json`)
2. Add an exception (if it's a false positive like Electron/React)

## Maintenance

When adding new dependencies that are build-time only (bundled into production), add them to the `pathNot` exceptions to prevent false positive violations.
