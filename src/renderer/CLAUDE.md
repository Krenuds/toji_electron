# Renderer Process Architecture

## Overview

This document defines the React-based user interface architecture for the Toji3 application. The renderer process operates in a browser environment with modern React patterns, Chakra UI components, and TypeScript for type safety.

## Technology Stack

- **React 19.1**: Modern React with concurrent features and latest hooks
- **TypeScript 5.8**: Full type safety across the application
- **Chakra UI 3.27**: Component library with v3 token system and semantic colors
- **React Icons**: Consistent icon library using Lucide icons (react-icons/lu)
- **Vite 7.0**: Fast development server with Hot Module Replacement

## Multi-Panel Coordination Strategy

The Toji3 application uses a **coordinated multi-panel interface** where the left icon bar controls what content appears in both the sidebar and main content area simultaneously. This creates a cohesive user experience where each icon activates a complete workspace rather than independent panels.

### Design Philosophy

- **Unified Views**: Each icon represents a complete workflow or feature area
- **Coordinated Content**: Sidebar and main area work together to present related information
- **Context Preservation**: Switching between icons maintains state within each workspace
- **Progressive Disclosure**: Complex features are split across panels for better organization

### Layout Structure

```
┌─────────┬─────────────────┬─────────────────────────────┐
│ Icon    │ Sidebar         │ Main Content                │
│ Bar     │ (300px)         │ (flex-1)                    │
│ (45px)  │                 │                             │
│         │                 │                             │
│ [🏠]    │ Context-aware   │ Primary interaction area    │
│ [⚙️]    │ navigation and  │ for selected workspace      │
│         │ controls        │                             │
└─────────┴─────────────────┴─────────────────────────────┘
```

## Chat Interface Design Pattern

The chat functionality exemplifies the coordinated panel approach:

### Sidebar Role: Conversation Management

- **Session List**: Previous conversations with timestamps and titles
- **Session Controls**: New conversation, delete, archive, and search
- **Status Indicators**: OpenCode agent connection and health status
- **Quick Actions**: Common prompts and conversation templates

### Main Content Role: Active Conversation

- **Message Thread**: Live chat messages with user and AI responses
- **Rich Content Display**: Code blocks, file attachments, and formatted responses
- **Message Composition**: Input field with send button and keyboard shortcuts
- **Conversation Tools**: Export, share, and conversation-specific options

### Coordination Behavior

The sidebar selection directly influences what conversation appears in the main area, while main area actions (like starting a new conversation) update the sidebar's session list in real-time.

## State Management Philosophy

The application employs a **hybrid state approach** balancing simplicity with functionality:

### Local Component State

Used for immediate UI interactions that don't need to persist or be shared:

- **Input Values**: Form fields, search queries, temporary text
- **Loading States**: Button loading, component-specific spinners
- **UI Toggles**: Dropdown open/closed, modal visibility
- **Transient Feedback**: Hover states, focus indicators

### React Context

Manages cross-component application state that needs coordination:

- **Active Workspace**: Which icon is currently selected
- **Chat State**: Active session, conversation history, message queue
- **UI Preferences**: Theme settings, panel sizes, user customizations
- **Connection Status**: Backend connectivity and authentication state

### Backend Integration

Persistent data flows through custom hooks that abstract IPC communication:

- **OpenCode Operations**: Agent management, prompt sending, session handling
- **File System**: Project management, file operations, directory browsing
- **Configuration**: Settings persistence, preferences management
- **Real-time Updates**: Status changes, progress notifications

## Component Organization Strategy

Components are organized by **functional responsibility** rather than feature groupings, promoting reusability and clear separation of concerns:

### Components Directory (`/components`)

Houses reusable UI building blocks:

- **Layout Components**: Panels, containers, grid systems, navigation elements
- **Input Components**: Forms, buttons, text inputs, file selectors
- **Display Components**: Message bubbles, status indicators, data tables
- **Utility Components**: Loading spinners, modals, tooltips, overlays

### Hooks Directory (`/hooks`)

Contains custom hooks for specific responsibilities:

- **Backend Communication**: `useOpenCode`, `useProjects`, `useSessions`
- **State Management**: `useChat`, `useAppState`, `useWorkspace`
- **UI Behavior**: `useKeyboardShortcuts`, `useWindowResize`, `useLocalStorage`
- **Data Processing**: `useMessageFormatting`, `useFileProcessing`

### Contexts Directory (`/contexts`)

Provides application-wide state management:

- **ChatContext**: Conversation state, message history, active session
- **AppContext**: Global application state, active workspace, user preferences
- **ThemeContext**: UI customization, color schemes, layout preferences
- **BackendContext**: Connection status, agent availability, error states

## Backend Communication Design

All interaction with the Electron backend follows a **consistent hook-based pattern** that abstracts IPC complexity:

### Abstraction Layer Principles

- **No Direct IPC**: Components never directly access `window.api` methods
- **Hook Encapsulation**: All backend communication wrapped in custom hooks
- **Type Safety**: Full TypeScript interfaces for all IPC interactions
- **Error Handling**: Consistent error boundaries and user-friendly messages

### Data Flow Pattern

1. **User Action**: User interacts with a component (click, type, submit)
2. **Hook Invocation**: Component calls custom hook function
3. **IPC Communication**: Hook sends request to main process via preload bridge
4. **Backend Processing**: Main process handles OpenCode SDK or system operations
5. **Response Handling**: Hook receives response and updates component state
6. **Context Updates**: Changes propagate through React Context to other components

### Error Handling Strategy

Robust error management at the hook level ensures graceful degradation:

- **Network Errors**: Connection issues are caught and display retry options
- **User-Friendly Messages**: Technical IPC errors are translated to actionable feedback
- **Retry Mechanisms**: Automatic retry for transient failures with exponential backoff
- **Fallback States**: Alternative UI when backend services are unavailable

## Development Patterns

### Component Creation Guidelines

1. **Start Small**: Create focused, single-responsibility components
2. **Type Everything**: Use TypeScript interfaces for all props and state
3. **Hook Integration**: Use custom hooks for any backend communication
4. **Chakra Patterns**: Follow Chakra UI v3 conventions and token system

### State Management Decisions

- **Local First**: Start with local state, elevate to context only when needed
- **Context Sparingly**: Only use context for truly global application state
- **Hook Abstraction**: Always wrap backend calls in custom hooks
- **Immutable Updates**: Use proper React state update patterns

### Styling Conventions

- **Custom Tokens**: Use `app.*` color tokens from theme system
- **Semantic Colors**: Prefer Chakra's semantic tokens (bg, fg, border) when appropriate
- **Consistent Icons**: Use react-icons/lu (Lucide) for all interface icons
- **Responsive Design**: Consider mobile/tablet layouts with Chakra breakpoints

## Testing Strategy

### Component Testing

- **Isolated Testing**: Test components independently from backend
- **Mock Hooks**: Use mock implementations of custom hooks
- **User Interactions**: Test actual user workflows and edge cases

### Integration Testing

- **Hook Testing**: Verify IPC communication flows work correctly
- **Context Testing**: Ensure state management behaves as expected
- **End-to-End**: Test complete user workflows from click to result

This architecture creates a scalable foundation that grows naturally as features are added, while maintaining clear separation of concerns and predictable data flow patterns. The focus on custom hooks and React Context provides flexibility without complexity, making the codebase easy to understand and extend.
