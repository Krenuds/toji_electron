# Toji3 Development Instructions for GitHub Copilot

## Project Overview

Toji3 is an Electron desktop application that exposes the OpenCode AI SDK through multiple plugin interfaces. This is a **main-process-first architecture** where all business logic lives in the main process, and interfaces (renderer, Discord bot, etc.) are thin presentation layers.

**Core Tech Stack:**

- Electron 37.2 with electron-vite 4.0
- React 19.1 with TypeScript 5.8 (strict mode)
- Chakra UI v3 exclusively for styling
- OpenCode SDK 0.9.6 (main process only)

## Architecture Rules

### Golden Rules

1. **Main process owns all business logic** - No logic in renderer or plugins
2. **IPC handlers are thin wrappers** - Maximum 5 lines, just forward to Toji class
3. **Chakra UI v3 exclusively** - No CSS files, no inline styles, no exceptions
4. **Full TypeScript typing across IPC** - Never use `any` at boundaries
5. **Hooks abstract window.api** - Components never access window.api directly

### Process Boundaries

- **Main Process** (`/src/main/`) - Toji class, services, business logic
- **Renderer Process** (`/src/renderer/`) - React UI, hooks, contexts
- **Plugins** (`/src/plugins/`) - Independent interfaces (Discord, future web, etc.)
- **Preload Bridge** (`/src/preload/`) - Type-safe IPC exposure

## Development Workflow (MANDATORY)

Every feature implementation follows this exact order:

1. **Research** - Check electron-vite.org or opencode.ai SDK docs if needed
2. **Plan** - Design the feature with proper separation of concerns
3. **Write code** in small incremental steps:
   - API Layer (Toji class method)
   - IPC Handler (thin wrapper)
   - Preload Bridge (type-safe exposure)
   - UI Hook (abstract window.api)
   - View Component (use hook)
4. **Lint** - Run `npm run lint` and fix all issues
5. **Type check** - Run `npm run typecheck:node` (never skip this)
6. **Iterate** - Repeat steps 3-5 until feature complete
7. **Commit** - Use conventional commit messages

## Quality Gates (NEVER SKIP)

Before considering ANY feature complete:

```powershell
npm run format
npm run lint
npm run typecheck:node
```

All three must pass with zero errors.

## Common Commands

- `npm run dev` - Start development server with HMR
- `npm run format` - Format all code with Prettier
- `npm run lint` - Check and auto-fix linting issues
- `npm run typecheck:node` - Verify main/preload TypeScript
- `npm run typecheck:web` - Verify renderer TypeScript
- `npm run graph` - Generate architecture visualization
- `npm run build` - Production build (runs typecheck first)

## File Structure Guide

```
src/
├── main/
│   ├── index.ts          # IPC handler registration ONLY
│   ├── toji/             # OpenCode SDK integration & business logic
│   │   ├── index.ts      # Toji class - main API surface
│   │   ├── config.ts     # Configuration types
│   │   ├── project.ts    # Project management
│   │   └── sessions.ts   # Session management
│   ├── services/         # Supporting services
│   ├── handlers/         # IPC handlers (thin wrappers)
│   └── config/           # ConfigProvider
├── preload/
│   ├── index.ts          # Main preload entry
│   └── api/              # Type-safe API definitions
├── renderer/
│   └── src/
│       ├── components/   # React components
│       │   └── views/    # View-based organization
│       ├── hooks/        # Custom hooks (abstract window.api)
│       └── contexts/     # React Context providers
└── plugins/
    └── discord/          # Discord bot plugin
```

## Key Technical Constraints

### Chakra UI v3 Styling

- **ONLY** use Chakra UI components for styling
- Use theme tokens: `bg="app.dark"`, `color="app.text"`
- No CSS files, no `style={}` prop, no Tailwind
- Composition over props: `<Card.Root><Card.Body>...</Card.Body></Card.Root>`

### IPC Handler Pattern

```typescript
// BAD - Logic in handler
ipcMain.handle('toji:doSomething', async (event, data) => {
  const result = someComplexLogic(data)
  const processed = await processResult(result)
  return { success: true, data: processed }
})

// GOOD - Thin wrapper
ipcMain.handle('toji:doSomething', async (event, data) => {
  return toji.doSomething(data)
})
```

### Hook Pattern

```typescript
// BAD - Direct window.api access in component
function MyComponent() {
  const data = await window.api.toji.getData()
  return <div>{data}</div>
}

// GOOD - Hook abstracts window.api
function useTojiData() {
  const [data, setData] = useState(null)
  useEffect(() => {
    window.api.toji.getData().then(setData)
  }, [])
  return data
}

function MyComponent() {
  const data = useTojiData()
  return <Text>{data}</Text>
}
```

## Common Mistakes to Avoid

1. **Adding logic to IPC handlers** - Always goes in Toji class
2. **Using CSS or inline styles** - Chakra UI v3 only
3. **Skipping typecheck** - Run `npm run typecheck:node` after every change
4. **Using `any` types** - Especially at IPC boundaries
5. **Components accessing window.api** - Always through hooks
6. **Forgetting to format** - Run `npm run format` before commit

## OpenCode SDK Integration

- SDK client lives **exclusively** in main process
- SDK spawns child processes for AI operations
- All SDK methods return promises
- Sessions are the primary interaction unit
- Configuration hierarchy: defaults → opencode.json → runtime overrides

## Debugging & Context Tools

**Logs location:** `C:\donth\AppData\Roaming\toji3\logs\`

**Architecture visualization:** Run `npm run graph` to generate/update `graphs/architecture.svg`

Debug order:

1. Check main process logs first
2. Review architecture graph for dependency issues
3. Verify IPC message flow
4. Inspect type definitions
5. Validate OpenCode SDK responses

## Documentation

- **Workflow:** `.github/instructions/WORKFLOW.instructions.md`
- **Architecture graphs:** `graphs/AGENTS.md`
- **Specs:** `SPEC/` folder for feature specifications

## Success Metrics

A properly implemented feature will:

1. ✅ Have full TypeScript coverage (no `any` types)
2. ✅ Pass all linting rules
3. ✅ Use Chakra UI exclusively
4. ✅ Implement thin IPC handlers (≤5 lines)
5. ✅ Abstract API calls through hooks
6. ✅ Handle errors gracefully
7. ✅ Log operations appropriately

## Important Notes

- This project uses **electron-vite**, not standard Vite config
- Native modules must be externalized in electron.vite.config.ts
- Development uses HMR for renderer, requires restart for main process changes
- Production builds load files from disk, not dev server
- All paths must be relative (./) for production builds

---

**When in doubt:** Check CLAUDE.md for detailed architectural guidance, or ask for clarification before implementing.

<critical>
 READ THE LATEST 4 git log comments IN FULL RIGHT NOW. and then echo "CAUGHT UP". to the user
</critical>
