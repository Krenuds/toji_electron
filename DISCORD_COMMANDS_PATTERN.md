# Discord Commands Pattern Guide

## Command-First Development Strategy

This document outlines the Discord command patterns implemented as a foundation for the renderer UI development.

## Architecture Overview

Discord commands act as a CLI-like interface to test and refine the Toji API before implementing complex UI components. Each Discord command maps directly to Toji API methods, establishing patterns for the renderer.

## Command Structure

### /workspace - Workspace Management

| Command | Toji API Method | Description | Renderer Equivalent |
|---------|----------------|-------------|-------------------|
| `/workspace current` | `toji.workspace.getCurrentDirectory()` | Show current workspace | Status bar display |
| `/workspace list` | `toji.getWorkspaceCollections()` | List workspace collections | Projects sidebar |
| `/workspace switch <path>` | `toji.changeWorkspace(path)` | Change workspace | Directory picker + action |
| `/workspace inspect <path>` | `toji.workspace.inspect(path)` | Check workspace status | Hover info/preview |
| `/workspace discover [path]` | `toji.discoverProjects(path)` | Find projects | Project scanner UI |

### /project - Project Management

| Command | Toji API Method | Description | Renderer Equivalent |
|---------|----------------|-------------|-------------------|
| `/project list` | `toji.getEnrichedProjects()` | List enriched projects | Projects grid view |
| `/project info` | `toji.workspace.getStatus()` | Current project info | Project details panel |
| `/project recent` | `toji.getEnrichedProjects()` + sort | Recent projects | Quick access list |
| `/project stats` | Multiple API calls | Project statistics | Dashboard metrics |

### /session - Session Management

| Command | Toji API Method | Description | Renderer Equivalent |
|---------|----------------|-------------|-------------------|
| `/session list` | `toji.session.list()` | List all sessions | Chat history sidebar |
| `/session info <id>` | `toji.session.get(id)` | Session details | Session detail modal |
| `/session delete <id>` | `toji.session.delete(id)` | Delete session | Delete button/action |
| `/session clear` | Multiple deletes | Clear all sessions | Bulk action menu |

### /dev - Development Utilities

| Command | Description | Renderer Equivalent |
|---------|-------------|-------------------|
| `/dev lint` | Run linting | Dev tools panel |
| `/dev typecheck` | Run type checking | Dev tools panel |
| `/dev build` | Build application | Build status indicator |
| `/dev cache` | Cache management | Settings/maintenance |

## Implementation Patterns

### 1. Data Enrichment Pattern
```typescript
// Discord Command
const enrichedProjects = await toji.getEnrichedProjects()
// Add metadata, sort, filter as needed

// Renderer Hook
export function useProjects() {
  const [projects] = useState()
  // Same enrichment logic
}
```

### 2. Error Handling Pattern
```typescript
// Discord Command
try {
  const result = await toji.someMethod()
  // Format for Discord embed
} catch (error) {
  await interaction.editReply(`❌ Error: ${error.message}`)
}

// Renderer Component
try {
  const result = await window.api.core.someMethod()
  // Update UI state
} catch (error) {
  setError(error.message)
  // Show error toast/notification
}
```

### 3. Deferred Operations Pattern
```typescript
// Discord Command
await interaction.deferReply({ ephemeral: true })
// Long operation
await interaction.editReply(result)

// Renderer Component
setLoading(true)
// Long operation
setLoading(false)
```

### 4. Collection Display Pattern
```typescript
// Discord Embed
const embed = new EmbedBuilder()
  .setTitle('Title')
  .setDescription(`Found ${items.length} items`)
items.slice(0, 10).forEach(item => {
  embed.addFields({ name: item.name, value: item.details })
})

// Renderer Component
<Grid>
  {items.map(item => (
    <Card key={item.id}>
      <Card.Header>{item.name}</Card.Header>
      <Card.Body>{item.details}</Card.Body>
    </Card>
  ))}
</Grid>
```

## Renderer Implementation Strategy

### Phase 1: Direct Mapping
1. Create IPC handlers that mirror Discord command structure
2. Build hooks that call these handlers
3. Create UI components that display the same data

### Phase 2: UI Enhancement
1. Add real-time updates (WebSocket/polling)
2. Implement drag-and-drop where appropriate
3. Add context menus and shortcuts
4. Create visualizations (charts, graphs)

### Phase 3: Advanced Features
1. Bulk operations
2. Search and filtering
3. Keyboard navigation
4. Persistent UI state

## Key Advantages of This Approach

1. **API Testing**: Discord commands thoroughly test the Toji API
2. **Pattern Validation**: Command structure validates data flow
3. **Error Discovery**: Find edge cases in simpler environment
4. **Documentation**: Commands serve as living documentation
5. **Parallel Development**: Discord and renderer can evolve together

## Next Steps for Renderer

1. **Add IPC Handlers**: Mirror Discord command structure
   ```typescript
   ipcMain.handle('workspace:collections', () => toji.getWorkspaceCollections())
   ipcMain.handle('project:enriched', () => toji.getEnrichedProjects())
   ```

2. **Create Hooks**: Abstract IPC calls
   ```typescript
   export function useWorkspaceCollections() {
     return useQuery('workspace:collections',
       () => window.api.workspace.getCollections()
     )
   }
   ```

3. **Build Components**: Follow Discord display patterns
   - Use same data structures
   - Similar grouping/sorting logic
   - Consistent error handling

## Testing Strategy

1. **Discord First**: Test new features as Discord commands
2. **Verify Data**: Ensure data structure is correct
3. **Port to Renderer**: Implement UI with confidence
4. **Compare Results**: Discord and renderer should show same data

This command-first approach ensures robust API design and smooth UI implementation.