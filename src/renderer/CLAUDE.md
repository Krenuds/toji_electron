# Frontend Architecture - Renderer Process

## Overview

The renderer process implements a **plugin interface** for the Toji3 application using React 19, TypeScript, and Chakra UI v3. This document defines the UI architecture, component patterns, and integration strategies.

## Core Philosophy

**"UI as a Plugin"** - The renderer is treated as one of many possible interfaces to the Toji API. It has no special privileges and communicates entirely through the IPC bridge.

## Technology Foundation

### React 19.1
- Latest concurrent features
- Automatic batching
- Suspense for data fetching
- Server Components ready

### TypeScript 5.8 - STRICT MODE
- **NO `any` TYPES EVER**
- **EXPLICIT RETURN TYPES REQUIRED**
- **NO UNUSED VARIABLES**
- **FULL TYPE COVERAGE MANDATORY**

### Chakra UI v3 - EXCLUSIVE STYLING SOLUTION

**CRITICAL**: Chakra UI v3 is the ONLY styling solution allowed in this project.

#### What This Means:
- **NO INLINE STYLES**: Never use `style={{}}`
- **NO CSS FILES**: No `.css` or `.scss` files
- **NO TAILWIND**: Chakra UI only
- **NO STYLED-COMPONENTS**: Use Chakra components
- **NO EMOTION DIRECTLY**: Only through Chakra
- **NO MATERIAL-UI**: Chakra UI exclusively

#### Required Reading:
- **Setup Guide**: https://chakra-ui.com/docs/get-started/frameworks/vite
- **Component Docs**: https://chakra-ui.com/docs/components
- **Styling Guide**: https://chakra-ui.com/docs/styling/style-props

#### Use Chakra MCP Tools:
```typescript
// ALWAYS verify component syntax with MCP tools
mcp__chakra-ui__get_component_props
mcp__chakra-ui__get_component_example
mcp__chakra-ui__v2_to_v3_code_review
```

## Views Architecture

### Concept: Coordinated Multi-Panel Interface

```
┌────────┬──────────────────┬───────────────────────────┐
│ Icons  │ Sidebar (300px)  │ Main Content (flex-1)     │
│ (35px) │                  │                           │
├────────┼──────────────────┼───────────────────────────┤
│ [📊]   │ Dashboard        │ Metrics & Activity        │
│ [💬]   │ Sidebar          │ Feed                      │
│ [📁]   │                  │                           │
│ [⚙️]   │ View-specific    │ Primary interaction       │
│        │ controls         │ area                      │
└────────┴──────────────────┴───────────────────────────┘
```

### Why "Views" not "Workspaces"?

**CRITICAL**: We use "Views" to avoid naming conflicts with OpenCode SDK's workspace concept. This ensures clear separation between UI navigation and project management.

## Component Architecture

### Directory Structure

```
src/renderer/src/
├── components/
│   ├── views/              # View-specific components
│   │   ├── dashboard/
│   │   │   ├── DashboardViewSidebar.tsx
│   │   │   └── DashboardViewMain.tsx
│   │   ├── chat/
│   │   ├── projects/
│   │   └── settings/
│   ├── shared/            # Reusable components
│   └── layout/            # Layout components
├── hooks/                 # Custom React hooks
├── contexts/              # React Context providers
├── types/                 # TypeScript definitions
└── App.tsx               # Main application component
```

### Component Patterns

#### View Components

Each view has two components:

```typescript
// ViewSidebar.tsx
export function DashboardViewSidebar(): React.JSX.Element {
  // Contextual controls and navigation
  return (
    <VStack align="stretch" gap={4}>
      {/* Quick actions, filters, lists */}
    </VStack>
  )
}

// ViewMain.tsx
export function DashboardViewMain(): React.JSX.Element {
  // Primary content area
  return (
    <Box flex="1" p={4}>
      {/* Main interaction area */}
    </Box>
  )
}
```

#### Shared Components

Reusable across views:

```typescript
// WorkspaceCard.tsx
interface WorkspaceCardProps {
  workspace: WorkspaceInfo
  onSelect: (path: string) => void
}

export function WorkspaceCard({
  workspace,
  onSelect
}: WorkspaceCardProps): React.JSX.Element {
  // Reusable workspace display component
}
```

## State Management

### AppViewContext - Central Coordination

```typescript
interface AppViewContextType {
  activeView: ViewType
  setActiveView: (view: ViewType) => void
  viewState: Record<ViewType, ViewStateData>
  setViewState: (view: ViewType, state: ViewStateData) => void
}
```

**Features:**
- Tracks active view
- Persists to localStorage
- Isolated view states
- Type-safe operations

### Hook-Based State Access

```typescript
// useViewCoordination.tsx
export function useViewCoordination() {
  const context = useContext(AppViewContext)

  const getSidebarContent = (): React.ReactNode => {
    switch (context.activeView) {
      case 'dashboard':
        return <DashboardViewSidebar />
      // ... other views
    }
  }

  const getMainContent = (): React.ReactNode => {
    switch (context.activeView) {
      case 'dashboard':
        return <DashboardViewMain />
      // ... other views
    }
  }

  return {
    activeView: context.activeView,
    setActiveView: context.setActiveView,
    getSidebarContent,
    getMainContent
  }
}
```

## IPC Integration Pattern

### Never Direct Access

**WRONG:**
```typescript
// ❌ Never do this in components
const handleClick = async () => {
  const result = await window.api.core.chat(message)
}
```

**RIGHT:**
```typescript
// ✅ Always use hooks
const { chat } = useChat()

const handleClick = async () => {
  const result = await chat(message)
}
```

### Custom Hooks for IPC

```typescript
// hooks/useWorkspaces.ts
export function useWorkspaces() {
  const [workspaces, setWorkspaces] = useState<WorkspaceInfo[]>([])
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const loadWorkspaces = async () => {
    setLoading(true)
    setError(null)
    try {
      const data = await window.api.core.getAllWorkspaces()
      setWorkspaces(data)
    } catch (err) {
      setError(err.message)
    } finally {
      setLoading(false)
    }
  }

  return { workspaces, loading, error, loadWorkspaces }
}
```

## Chakra UI v3 Implementation

### Composition Patterns

**Progress Components:**
```tsx
<Progress.Root value={progress} colorPalette="green">
  <Progress.Track>
    <Progress.Range />
  </Progress.Track>
</Progress.Root>
```

**Card Components:**
```tsx
<Card.Root bg="app.dark" borderColor="app.border">
  <Card.Header>
    <Card.Title>Title</Card.Title>
  </Card.Header>
  <Card.Body>Content</Card.Body>
</Card.Root>
```

**Dialog Components:**
```tsx
<Dialog.Root open={open} onOpenChange={setOpen}>
  <Dialog.Trigger asChild>
    <Button>Open</Button>
  </Dialog.Trigger>
  <Dialog.Content>
    <Dialog.Header>
      <Dialog.Title>Title</Dialog.Title>
    </Dialog.Header>
    <Dialog.Body>Content</Dialog.Body>
    <Dialog.Footer>
      <Dialog.CloseTrigger>Close</Dialog.CloseTrigger>
    </Dialog.Footer>
  </Dialog.Content>
</Dialog.Root>
```

### Custom Theme System

```typescript
// theme.ts
export const theme = {
  tokens: {
    colors: {
      app: {
        darkest: { value: '#09090b' },   // Icon bar
        dark: { value: '#1a1a1a' },      // Sidebar
        medium: { value: '#242424' },    // Main content
        border: { value: '#404040' },    // Borders
        text: { value: '#808080' },      // Secondary text
        light: { value: '#ffffff' },     // Primary text
        accent: { value: '#33b42f' }     // Highlights
      }
    }
  }
}
```

**Usage:**
```tsx
<Box bg="app.dark" borderColor="app.border" color="app.light">
  {/* Never hardcode colors! */}
</Box>
```

## Icon System

### Lucide Icons via React-Icons

```typescript
import {
  LuHome,
  LuSettings,
  LuMessageSquare,
  LuFolder
} from 'react-icons/lu'

// Consistent 20px icons
<LuHome size={20} />
```

## Navigation System

### IconButton with View Integration

```typescript
interface IconButtonProps {
  icon: React.ReactNode
  tooltip: string
  viewName?: ViewType
  isActive?: boolean
  onClick?: (viewName?: ViewType) => void
}

export function IconButton({
  icon,
  tooltip,
  viewName,
  isActive,
  onClick
}: IconButtonProps): React.JSX.Element {
  const handleClick = () => {
    if (onClick) {
      onClick(viewName)
    }
  }

  return (
    <Tooltip content={tooltip}>
      <Button
        size="sm"
        variant={isActive ? 'solid' : 'ghost'}
        colorPalette={isActive ? 'green' : undefined}
        onClick={handleClick}
      >
        {icon}
      </Button>
    </Tooltip>
  )
}
```

## Performance Optimization

### Lazy Loading Views

```typescript
const DashboardView = lazy(() => import('./views/dashboard'))

// In component
<Suspense fallback={<Spinner />}>
  <DashboardView />
</Suspense>
```

### Memoization

```typescript
const MemoizedList = memo(({ items }: { items: Item[] }) => {
  return items.map(item => <ItemCard key={item.id} item={item} />)
})
```

### Virtual Scrolling

```typescript
// For large lists
import { FixedSizeList } from 'react-window'

<FixedSizeList
  height={600}
  itemCount={items.length}
  itemSize={50}
  width="100%"
>
  {Row}
</FixedSizeList>
```

## Error Handling

### Error Boundaries

```typescript
class ViewErrorBoundary extends Component {
  componentDidCatch(error: Error) {
    console.error('View error:', error)
    // Report to error tracking service
  }

  render() {
    if (this.state.hasError) {
      return (
        <Alert status="error">
          <Alert.Icon />
          <Alert.Title>Something went wrong</Alert.Title>
        </Alert>
      )
    }
    return this.props.children
  }
}
```

### User Feedback

```typescript
const showError = (message: string) => {
  return (
    <Alert status="error" variant="subtle">
      <Alert.Icon />
      <Alert.Title>{message}</Alert.Title>
    </Alert>
  )
}
```

## Testing Strategies

### Component Testing

```typescript
import { render, screen } from '@testing-library/react'

test('renders dashboard view', () => {
  render(<DashboardViewMain />)
  expect(screen.getByText(/Active Projects/i)).toBeInTheDocument()
})
```

### Hook Testing

```typescript
import { renderHook, act } from '@testing-library/react-hooks'

test('loads workspaces', async () => {
  const { result } = renderHook(() => useWorkspaces())

  await act(async () => {
    await result.current.loadWorkspaces()
  })

  expect(result.current.workspaces).toHaveLength(3)
})
```

## Development Workflow

### Adding New Views

1. **Create View Components**:
   ```
   src/components/views/newview/
   ├── NewViewSidebar.tsx
   └── NewViewMain.tsx
   ```

2. **Add to ViewType**:
   ```typescript
   type ViewType = 'dashboard' | 'chat' | 'newview'
   ```

3. **Update useViewCoordination**:
   ```typescript
   case 'newview':
     return <NewViewSidebar />
   ```

4. **Add Navigation Icon**:
   ```tsx
   <IconButton
     icon={<LuNewIcon size={20} />}
     tooltip="New View"
     viewName="newview"
   />
   ```

5. **Create IPC Hook**:
   ```typescript
   export function useNewView() {
     // Hook implementation
   }
   ```

### Style Guidelines - MANDATORY

#### Chakra UI v3 Rules:
- **TOKENS ONLY**: Use `app.*` color tokens, NEVER hardcode colors
- **COMPOSITION PATTERN**: Use v3 syntax (Card.Root, Dialog.Body, etc.)
- **SPACING VIA PROPS**: Use `gap`, `p`, `m` props only
- **RESPONSIVE PROPS**: Use array/object syntax for breakpoints
- **NO CUSTOM CSS**: Everything through Chakra

#### Code Quality Requirements:
```bash
# Before EVERY component edit:
npm run format
npm run typecheck

# After EVERY component edit:
npm run format
npm run lint:fix
npm run lint        # Must show 0 errors
npm run typecheck   # Must pass
```

#### TypeScript Requirements:
- **NO `any` TYPES**: Use proper interfaces
- **EXPLICIT RETURNS**: Every function needs return type
- **PROP INTERFACES**: Define for every component
- **EVENT HANDLERS**: Properly typed events

## Common Patterns

### Loading States

```typescript
if (loading) {
  return (
    <Center h="100%">
      <Spinner size="xl" color="app.accent" />
    </Center>
  )
}
```

### Empty States

```typescript
if (items.length === 0) {
  return (
    <Center h="100%" color="app.text">
      <VStack gap={2}>
        <LuInbox size={48} />
        <Text>No items found</Text>
      </VStack>
    </Center>
  )
}
```

### Data Fetching

```typescript
useEffect(() => {
  let mounted = true

  const fetchData = async () => {
    const data = await loadData()
    if (mounted) {
      setData(data)
    }
  }

  fetchData()

  return () => {
    mounted = false
  }
}, [])
```

## Best Practices - ENFORCED

### Code Quality Workflow (MANDATORY)
```bash
# The Sacred Sequence - NEVER SKIP STEPS
1. npm run format      # Format first
2. npm run lint:fix    # Fix issues
3. npm run lint        # Verify clean
4. npm run typecheck   # Validate types
5. npm run dev         # Test changes
```

### Development Rules
1. **CHAKRA UI ONLY**: No other styling methods allowed
2. **STRICT TYPESCRIPT**: No `any`, explicit returns required
3. **COMPONENT SEPARATION**: One component per file
4. **HOOK ABSTRACTION**: All IPC through hooks
5. **FORMAT CONSTANTLY**: Run `npm run format` after every change
6. **LINT ALWAYS**: Zero tolerance for lint errors
7. **TYPE EVERYTHING**: Full TypeScript coverage required
8. **TEST THOROUGHLY**: Manual and automated tests

### Styling Rules (Chakra UI v3)
- **Read Vite Guide**: https://chakra-ui.com/docs/get-started/frameworks/vite
- **Use MCP Tools**: Verify all component syntax
- **Token System**: Use `app.*` tokens exclusively
- **Composition Pattern**: Follow v3 patterns exactly
- **No Inline Styles**: Everything through Chakra props
- **No CSS Files**: Chakra handles all styling

## Debugging Tips

### React DevTools

```typescript
// Name components for debugging
DashboardViewMain.displayName = 'DashboardViewMain'
```

### Console Helpers

```typescript
// Development only logging
if (process.env.NODE_ENV === 'development') {
  console.log('View state:', viewState)
}
```

### Network Tab

Monitor IPC calls in DevTools Network tab for debugging communication issues.

## Security Considerations

- **No eval()**: Never use dynamic code execution
- **Sanitize inputs**: Clean user input before display
- **Content Security Policy**: Restrict external resources
- **IPC validation**: Validate all IPC responses

This architecture ensures a maintainable, performant, and secure UI while treating the renderer as a proper plugin interface to the Toji system.