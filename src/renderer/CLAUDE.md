# Renderer Process Architecture

## Overview

This document defines the React-based user interface architecture for the Toji3 application. The renderer process implements a sophisticated **coordinated multi-panel interface** with view-based navigation, built on React 19, TypeScript 5.8, and Chakra UI v3.

## Technology Stack

- **React 19.1**: Modern React with concurrent features and latest hooks
- **TypeScript 5.8**: Full type safety across the application
- **Chakra UI 3.27**: Component library with v3 composition patterns and custom theming
- **React Icons**: Consistent icon library using Lucide icons (react-icons/lu)
- **Vite 7.0**: Fast development server with Hot Module Replacement

## Views Architecture

The core innovation in Toji3's interface is the **Views System** - a coordinated multi-panel interface where navigation icons drive synchronized content across sidebar and main areas.

### Core Concept: Views over Workspaces

**IMPORTANT**: We use "Views" terminology to avoid conflicts with OpenCode SDK's "workspace" concept. This ensures clear separation between UI navigation and OpenCode's project management.

### Layout Structure

```
┌─────────┬─────────────────┬─────────────────────────────┐
│ Icon    │ Sidebar         │ Main Content                │
│ Bar     │ (300px)         │ (flex-1)                    │
│ (35px)  │                 │                             │
│         │                 │                             │
│ [📊]    │ View-specific   │ Primary interaction area    │
│ [⚙️]    │ sidebar content │ for selected view           │
│ [💬]    │                 │                             │
└─────────┴─────────────────┴─────────────────────────────┘
```

### View Types

Each view represents a complete feature area with coordinated sidebar and main content:

- **Dashboard**: Project metrics, activity feeds, quick actions
- **Settings**: Configuration categories, preferences, system settings
- **Chat**: OpenCode conversations, session management, AI interactions
- **Projects**: Workspace management, file browsers, project tools

## State Management Architecture

### AppViewContext - Central Coordination

The `AppViewContext` manages the entire view system:

```typescript
interface AppViewContextType {
  activeView: ViewType
  setActiveView: (view: ViewType) => void
  viewState: Record<ViewType, any>
  setViewState: (view: ViewType, state: any) => void
}
```

**Key Features:**

- **Active View Tracking**: Maintains which view is currently displayed
- **State Persistence**: Uses localStorage to preserve view selection across sessions
- **View-Specific State**: Each view maintains its own isolated state
- **Type Safety**: Full TypeScript support with `ViewType` enum

### useViewCoordination Hook

The coordination hook abstracts view management complexity:

```typescript
const { activeView, setActiveView, getSidebarContent, getMainContent, updateViewState } =
  useViewCoordination()
```

**Responsibilities:**

- **Content Switching**: Dynamically renders appropriate sidebar/main components
- **State Management**: Provides view-specific state access
- **Placeholder Handling**: Shows "Coming soon" for unimplemented views

## Component Architecture

### View Components Structure

Views are organized in feature-based directories:

```
src/components/views/
├── dashboard/
│   ├── DashboardViewSidebar.tsx
│   └── DashboardViewMain.tsx
├── settings/
│   ├── SettingsViewSidebar.tsx
│   └── SettingsViewMain.tsx
└── chat/
    ├── ChatViewSidebar.tsx
    └── ChatViewMain.tsx
```

### Enhanced IconButton Component

The navigation system uses an enhanced `IconButton` with view integration:

```typescript
interface IconButtonProps {
  icon: React.ReactNode
  tooltip: string
  viewName?: ViewType
  isActive?: boolean
  onClick?: (viewName?: ViewType) => void
}
```

**Features:**

- **Active State Styling**: Visual feedback with accent colors
- **Tooltip Integration**: Chakra UI v3 compatible tooltips
- **View Selection**: Handles view switching through click events
- **Smooth Transitions**: CSS transitions for hover and active states

### Tooltip System

Custom Tooltip component following Chakra UI v3 composition patterns:

```typescript
<Tooltip content="Dashboard" positioning={{ placement: 'right' }} showArrow>
  <IconButton ... />
</Tooltip>
```

## Dashboard Implementation

### Dashboard Sidebar Features

The `DashboardViewSidebar` provides:

- **Quick Actions**: New Project, Open Project buttons
- **Recent Projects**: List with status badges and descriptions
- **Activity Feed**: Recent commits, sessions, and file operations
- **Status Indicators**: Connection status and project health

### Dashboard Main Content

The `DashboardViewMain` displays:

- **Metrics Cards**: Active projects, sessions, commits, hours coded
- **Project Status**: Progress bars, completion percentages, team info
- **Activity Timeline**: Real-time feed with timestamps and activity types
- **Rich Data Visualization**: Charts, progress indicators, status badges

## Backend Integration Strategy

### IPC Abstraction Pattern

All backend communication follows a consistent pattern:

1. **Component Level**: Never directly access `window.api`
2. **Hook Encapsulation**: Custom hooks wrap all IPC calls
3. **Type Safety**: Full TypeScript interfaces for all communications
4. **Error Boundaries**: Graceful degradation with user-friendly messages

### Window Controls Integration

Seamless integration with custom titlebar:

```typescript
const handleMinimize = () => window.api.window.minimize()
const handleMaximize = () => window.api.window.maximize()
const handleClose = () => window.api.window.close()
```

## Chakra UI v3 Implementation

### Composition Patterns

Following Chakra UI v3's composition approach:

```tsx
// Progress bars
<Progress.Root value={75} colorPalette="green">
  <Progress.Track>
    <Progress.Range />
  </Progress.Track>
</Progress.Root>

// Cards
<Card.Root bg="app.dark" border="1px solid" borderColor="app.border">
  <Card.Header>...</Card.Header>
  <Card.Body>...</Card.Body>
</Card.Root>
```

### Custom Theme Integration

Leverages the `app.*` color token system:

```typescript
const theme = {
  tokens: {
    colors: {
      app: {
        darkest: '#09090b', // Icon bar background
        dark: '#1a1a1a', // Sidebar background
        medium: '#242424', // Main content background
        border: '#404040', // Borders and dividers
        text: '#808080', // Secondary text
        light: '#ffffff', // Primary text and icons
        accent: '#33b42f' // Accent color for highlights
      }
    }
  }
}
```

## Development Workflow

### Component Creation Pattern

1. **Plan the View**: Define sidebar and main content responsibilities
2. **Create Components**: Build ViewSidebar and ViewMain components
3. **Update Hook**: Add view cases to `useViewCoordination`
4. **Add Navigation**: Include view in icon bar with proper `viewName`
5. **Test Integration**: Verify state persistence and view switching

### State Management Guidelines

- **Local State First**: Use component state for UI-only interactions
- **Context for Coordination**: Use `AppViewContext` for cross-panel state
- **View-Specific State**: Store view data in `viewState` object
- **Persistence**: Leverage localStorage for session preservation

### Styling Best Practices

- **Consistent Spacing**: Use Chakra's `gap` prop instead of `spacing`
- **Color Tokens**: Prefer `app.*` tokens over hardcoded colors
- **Responsive Design**: Consider mobile layouts with Chakra breakpoints
- **Composition**: Use Chakra v3 composition patterns for complex components

## Performance Optimizations

### Lazy View Loading

Views are loaded on-demand to reduce initial bundle size:

```typescript
const getSidebarContent = (): React.ReactNode => {
  switch (activeView) {
    case 'dashboard':
      return <DashboardViewSidebar />
    // Other views loaded as needed
  }
}
```

### State Persistence Strategy

Efficient localStorage integration:

- **Active View**: Persisted on every view change
- **View State**: Debounced updates to prevent excessive writes
- **Recovery**: Graceful fallback to default view on invalid data

## Future Extensibility

### Adding New Views

The architecture scales naturally for new views:

1. Create `ViewSidebar` and `ViewMain` components
2. Add view type to `ViewType` union
3. Update `useViewCoordination` switch statements
4. Add icon to navigation bar
5. Implement view-specific state management

### Integration Points

Ready for future enhancements:

- **Chat Integration**: OpenCode SDK conversations
- **Project Management**: File browsers and workspace tools
- **Settings System**: Configuration and preferences
- **Plugin Architecture**: Third-party view extensions

This architecture provides a robust foundation for Toji3's interface evolution while maintaining clean separation of concerns, type safety, and excellent developer experience.
