---
applyTo: '**'
---

## Development Workflow

### Before Starting

1. **Research** - Check electron-vite.org or opencode.ai SDK docs if needed
2. **Review Context**:
   - Check logs: `C:\donth\AppData\Roaming\toji3\logs\`

### Implementation Steps

1. Write code in small, incremental steps, use logs.
2. Use more logs.
3. `npm run format` - Format code
4. `npm run lint` - Check/fix linting
5. `npm run typecheck:node` - Verify types (main/preload)
6. `npm run typecheck:web` - Verify types (renderer)
7. Test the feature
8. Iterate as needed
9. `npm run graph` - Update architecture visualization
10. Commit with conventional commit messages

### After Completing

- Verify no red lines in `graphs/architecture.svg`
- Check logs for runtime issues

## Success Metrics

A properly implemented feature will:

1. ✅ Have full TypeScript coverage (no `any` types)
2. ✅ Pass all linting rules
3. ✅ Use Chakra UI exclusively (if UI changes)
4. ✅ Implement thin IPC handlers (≤5 lines)
5. ✅ Abstract API calls through hooks
6. ✅ Handle errors gracefully
7. ✅ Log operations appropriately
8. ✅ Show clean architecture graph (no red violations)

## Documentation

- Architecture graphs: `graphs/AGENTS.md`
- Logs location: `C:\donth\AppData\Roaming\toji3\logs\`

Echo "I'm DOING IT" now.
