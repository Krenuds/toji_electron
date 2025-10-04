# Frontend Development Guide

## Overview

Toji3's frontend is built with React 19.1, TypeScript 5.8, and Chakra UI v3, following strict architectural principles that ensure consistency, type safety, and maintainability.

## Core Principles

### 1. Chakra UI v3 Exclusively

**CRITICAL**: Chakra UI v3 is the ONLY styling solution permitted.

- ❌ **NO** CSS files
- ❌ **NO** inline styles
- ❌ **NO** styled-components
- ❌ **NO** emotion/styled
- ✅ **YES** Chakra components exclusively
- ✅ **YES** Theme tokens for all values
- ✅ **YES** Composition patterns

```tsx
// ❌ WRONG - Inline styles
<Box style={{ backgroundColor: '#1a1a1a', padding: '16px' }}>

// ❌ WRONG - CSS-in-JS
const StyledBox = styled.div`
  background: #1a1a1a;
`

// ✅ CORRECT - Chakra components with theme tokens
<Box bg="app.dark" p={4}>
```

### 2. Theme Token System

All colors, spacing, and values must use theme tokens defined in `src/renderer/src/theme.ts`.

#### Available Color Tokens

```typescript
app: {
  darkest: '#09090b'  // Icon bar background
  dark: '#1a1a1a'     // Sidebar background
  medium: '#242424'   // Main content background
  border: '#404040'   // Borders and dividers
  text: '#808080'     // Secondary text
  light: '#ffffff'    // Primary text and icons
  accent: '#33b42f'   // Accent color (Toji green)
  error: '#ef4444'    // Error indicators only
}

green: {
  400: '#33b42f'
  500: '#2ca02c'
  600: '#248f24'
  // ... full scale
}
```

#### Color Usage Guidelines

- **Gray/Green Schema**: Primary color scheme is gray with green accents
- **Primary text**: Use `app.light` (white) for main content
- **Secondary text**: Use `app.text` (gray) for labels and hints
- **Backgrounds**: Use `app.dark`, `app.medium`, or `app.darkest`
- **Borders**: Use `app.border`
- **Actions/Success**: Use `green.500`, `green.600` for buttons and success states
- **Errors**: Use `app.error` ONLY for error states
- **Avoid**: Purple, blue (except Discord), orange, yellow unless specific integration colors

```tsx
// ✅ CORRECT - Using theme tokens
<Text color="app.light" fontSize="lg">Main Title</Text>
<Text color="app.text" fontSize="sm">Subtitle</Text>
<Box bg="app.dark" border="1px solid" borderColor="app.border">
  <Button colorPalette="green">Save</Button>
</Box>

// ❌ WRONG - Hard-coded colors
<Text color="#ffffff">Title</Text>
<Box style={{ background: '#1a1a1a' }}>
```

### 3. Type Safety Across IPC Boundary

Every component that interacts with the main process must:

1. Use hooks that abstract `window.api`
2. Never call `window.api` directly from components
3. Maintain full TypeScript typing across the boundary

```tsx
// ❌ WRONG - Direct window.api usage in component
function MyComponent() {
  const handleSave = async () => {
    await window.api.discord.setToken(token)
  }
}

// ✅ CORRECT - Use abstraction hook
function MyComponent() {
  const { saveToken } = useDiscord()

  const handleSave = async () => {
    await saveToken(token)
  }
}
```

### 4. Component Architecture

#### Hook Abstraction Pattern

All `window.api` calls must be abstracted through custom hooks:

```typescript
// src/renderer/src/hooks/useFeature.ts
export function useFeature() {
  const [state, setState] = useState<FeatureState>()

  const doAction = async (param: string): Promise<void> => {
    try {
      const result = await window.api.feature.action(param)
      setState(result)
    } catch (err) {
      console.error('Failed to do action:', err)
    }
  }

  return { state, doAction }
}
```

#### Component Structure

```tsx
export function MyViewMain(): React.JSX.Element {
  // 1. Hook usage at top
  const { state, action } = useCustomHook()
  const [localState, setLocalState] = useState('')

  // 2. Event handlers
  const handleAction = async (): Promise<void> => {
    // Logic here
  }

  // 3. Effects
  useEffect(() => {
    // Side effects
  }, [dependencies])

  // 4. Render with Chakra components
  return (
    <VStack align="stretch" gap={4}>
      <Text color="app.light">Content</Text>
    </VStack>
  )
}
```

### 5. Views System

The app uses a multi-panel view architecture:

```
src/renderer/src/components/views/
├── chat/
│   ├── ChatViewMain.tsx
│   └── ChatViewSidebar.tsx
├── integrations/
│   ├── IntegrationsViewMain.tsx
│   └── IntegrationsViewSidebar.tsx
├── settings/
│   ├── SettingsViewMain.tsx
│   └── SettingsViewSidebar.tsx
└── ...
```

Each view has:

- **Main component**: Primary content area
- **Sidebar component**: Navigation/context panel
- Both are independently composable
- State managed through React Context

## Development Workflow

### 1. Format First

```bash
npm run format
```

### 2. Implement Feature

Order of implementation:

1. **API Layer** (`src/main/toji/`) - Business logic
2. **IPC Handler** (`src/main/handlers/`) - Thin wrapper
3. **Preload Bridge** (`src/preload/api/`) - Type-safe exposure
4. **Custom Hook** (`src/renderer/src/hooks/`) - Abstract window.api
5. **Component** (`src/renderer/src/components/`) - UI using hook

### 3. Lint

```bash
npm run lint
```

### 4. Type Check

```bash
npm run typecheck:node
```

### 5. Test in Dev

```bash
npm run dev
```

## Reusable Component Library

### Overview

The `src/renderer/src/components/shared/` directory contains reusable components that enforce consistency across the application. **Always use these components** instead of creating one-off implementations.

### Available Components

#### ActionButton

Standardized button with predefined variants.

```tsx
import { ActionButton } from '../../shared'

// Primary action (green)
<ActionButton variant="primary" size="sm" onClick={handleSave}>
  Save
</ActionButton>

// Secondary action (gray)
<ActionButton variant="secondary" size="sm" onClick={handleCancel}>
  Cancel
</ActionButton>

// Destructive action (red)
<ActionButton variant="danger" size="sm" onClick={handleDelete}>
  Delete
</ActionButton>

// Ghost/subtle action
<ActionButton variant="ghost" size="xs" onClick={handleAction}>
  Action
</ActionButton>

// With icons
<ActionButton variant="primary" leftIcon={<LuSave size={14} />}>
  Save
</ActionButton>
```

#### ThemedInput

Input field with consistent theming and focus states.

```tsx
import { ThemedInput } from '../../shared'

<ThemedInput
  type="text"
  placeholder="Enter value..."
  value={value}
  onChange={(e) => setValue(e.target.value)}
  size="sm"
/>

// Password input with custom props
<ThemedInput
  type="password"
  placeholder="Enter token..."
  value={token}
  onChange={(e) => setToken(e.target.value)}
  pr={10} // Custom padding for eye icon
/>
```

#### StatusBox

Colored container for status messages and indicators.

```tsx
import { StatusBox } from '../../shared'

// Info (Discord blue)
<StatusBox variant="info" compact>
  <Text>Bot invite link ready</Text>
</StatusBox>

// Success (green)
<StatusBox variant="success" compact>
  <Text>Successfully connected</Text>
</StatusBox>

// Error (red)
<StatusBox variant="error" compact>
  <Text>{errorMessage}</Text>
</StatusBox>

// Warning (orange)
<StatusBox variant="warning">
  <Text>Attention required</Text>
</StatusBox>
```

#### IntegrationCard

Standardized card layout for integration sections.

```tsx
import { IntegrationCard } from '../../shared'
import { FaDiscord } from 'react-icons/fa6'

;<IntegrationCard
  icon={<FaDiscord size={24} color="white" />}
  iconBg="#5865F2"
  title="Discord Bot"
  description="Connect Toji to Discord for AI-powered conversations"
  headerAction={
    <ActionButton variant="primary" size="sm" onClick={handleSync}>
      Sync
    </ActionButton>
  }
>
  {/* Card content */}
  <VStack align="stretch" gap={3}>
    {/* Your content here */}
  </VStack>
</IntegrationCard>
```

#### SectionDivider

Visual separator line using theme border color.

```tsx
import { SectionDivider } from '../../shared'

;<VStack align="stretch" gap={4}>
  <Box>Content section 1</Box>
  <SectionDivider />
  <Box>Content section 2</Box>
</VStack>
```

#### Scroll Containers

Use these for areas that need independent scrolling:

```tsx
import { MainContentContainer, SidebarContainer } from '../../shared'

// For main content areas
<MainContentContainer>
  {/* Content with independent scroll */}
</MainContentContainer>

// For sidebar panels (from parent directory)
<SidebarContainer>
  {/* Sidebar content with independent scroll */}
</SidebarContainer>
```

### Benefits of Reusable Components

1. **Consistency**: All status boxes, inputs, and buttons look identical
2. **Maintainability**: Update styling in one place, applies everywhere
3. **Type Safety**: Props are strongly typed and validated
4. **Code Reduction**: Dramatically less boilerplate code
5. **Theme Integration**: All components use theme tokens automatically

### When to Create New Shared Components

Create a new shared component when you find yourself:

- Copying the same JSX structure 3+ times
- Using the same styling patterns repeatedly
- Need to ensure consistency across multiple views
- Want a single source of truth for a UI pattern

## Common Patterns

### Manual Button Styling (Avoid - Use ActionButton Instead)

```tsx
// ❌ AVOID - Use ActionButton instead
<Button colorPalette="green" variant="solid" size="sm" onClick={handleSave}>
  <Text color="white">Save</Text>
</Button>

// ✅ CORRECT
<ActionButton variant="primary" size="sm" onClick={handleSave}>
  Save
</ActionButton>
```

### Input Styling

```tsx
<Input
  type="text"
  placeholder="Enter value..."
  value={value}
  onChange={(e) => setValue(e.target.value)}
  bg="rgba(255,255,255,0.02)"
  border="1px solid"
  borderColor="app.border"
  color="app.light"
  _placeholder={{ color: 'app.text' }}
  _focus={{ borderColor: 'green.500', boxShadow: 'none' }}
/>
```

### Card Layout

```tsx
<Card.Root bg="app.dark" border="1px solid" borderColor="app.border">
  <Card.Body p={6}>
    <VStack align="stretch" gap={4}>
      <Text color="app.light" fontSize="lg" fontWeight="semibold">
        Title
      </Text>
      <Text color="app.text" fontSize="sm">
        Description
      </Text>
    </VStack>
  </Card.Body>
</Card.Root>
```

### Status Badges

```tsx
// Success/Connected
<Badge size="sm" colorPalette="green" variant="subtle">
  Connected
</Badge>

// Inactive/Disconnected
<Badge size="sm" colorPalette="gray" variant="subtle">
  Disconnected
</Badge>

// Error
<Badge size="sm" colorPalette="red" variant="subtle">
  Error
</Badge>
```

### Error Display

```tsx
{
  error && (
    <Box
      p={3}
      bg="rgba(239, 68, 68, 0.1)"
      borderRadius="md"
      border="1px solid"
      borderColor="red.500"
    >
      <Text color="red.400" fontSize="sm">
        {error}
      </Text>
    </Box>
  )
}
```

### Success Display

```tsx
{
  success && (
    <Box
      p={3}
      bg="rgba(34, 197, 94, 0.1)"
      borderRadius="md"
      border="1px solid"
      borderColor="green.500"
    >
      <Text color="green.400" fontSize="sm">
        {successMessage}
      </Text>
    </Box>
  )
}
```

### Scroll Containers

Every view must use scroll containers to prevent app-level scrolling:

```tsx
// Sidebar sections
import { SidebarContainer } from '../../SidebarContainer'

export function MyViewSidebar() {
  return (
    <SidebarContainer>
      <VStack align="stretch" gap={4}>
        {/* Content here */}
      </VStack>
    </SidebarContainer>
  )
}

// Main content sections
import { MainContentContainer } from '../../shared/MainContentContainer'

export function MyViewMain() {
  return (
    <MainContentContainer>
      <VStack align="stretch" gap={6}>
        {/* Content here */}
      </VStack>
    </MainContentContainer>
  )
}
```

**Key Points:**

- **Never** add scrolling to the main Electron container
- Each section (sidebar/main) has **independent** scrolling
- Both containers use Chakra UI's `ScrollArea` component
- Custom themed scrollbar: `app.border` background, `app.text` on hover
- Size `xs` for minimal visual footprint
- Transparent background for clean appearance

## Text Readability Rules

### Critical: Always Specify Text Colors

Chakra UI defaults to black text if no color is specified. **ALWAYS** add explicit colors:

```tsx
// ❌ WRONG - Will render as black text
<Text fontSize="sm">This is black and unreadable</Text>

// ✅ CORRECT - Explicit color
<Text color="app.light" fontSize="sm">Readable text</Text>
<Text color="app.text" fontSize="sm">Secondary text</Text>
```

### Button Text

Always add color to text inside buttons:

```tsx
// ❌ WRONG
<Button>
  <Text>Save</Text>
</Button>

// ✅ CORRECT
<Button colorPalette="green">
  <Text color="white">Save</Text>
</Button>

// OR use currentColor for ghost buttons
<Button variant="ghost">
  <Text color="currentColor">Cancel</Text>
</Button>
```

### Available Text Colors

- `app.light` - White text for primary content
- `app.text` - Gray text for secondary content
- `green.400` - Green text for success messages
- `red.400` - Red text for error messages
- `white` - Explicit white (for buttons, etc.)
- `currentColor` - Inherit from parent

## Common Pitfalls

### 1. Missing Color Tokens

```tsx
// ❌ WRONG - Non-existent token
<Text color="app.textSecondary">  // This doesn't exist!

// ✅ CORRECT - Use existing token
<Text color="app.text">
```

### 2. Inconsistent Color Usage

```tsx
// ❌ WRONG - Using purple in gray/green app
<Button colorPalette="purple">

// ✅ CORRECT - Use green for actions
<Button colorPalette="green">
```

### 3. Direct window.api Calls

```tsx
// ❌ WRONG
const result = await window.api.feature.action()

// ✅ CORRECT
const { doAction } = useFeature()
const result = await doAction()
```

### 4. Inline Styles

```tsx
// ❌ WRONG
<Box style={{ padding: '16px' }}>

// ✅ CORRECT
<Box p={4}>
```

### 5. Missing Type Safety

```tsx
// ❌ WRONG - Using 'any'
const [data, setData] = useState<any>()

// ✅ CORRECT - Explicit types
const [data, setData] = useState<FeatureData>()
```

## Component Checklist

Before committing a component, verify:

- [ ] Uses Chakra UI exclusively (no CSS, no inline styles)
- [ ] All colors use theme tokens
- [ ] All text has explicit color properties
- [ ] No `window.api` calls in component (uses hooks)
- [ ] Full TypeScript typing (no `any`)
- [ ] Follows gray/green color scheme
- [ ] Button text has explicit white color
- [ ] Input fields have focus states with green.500
- [ ] Error states use red.400 text and red.500 borders
- [ ] Success states use green.400 text and green.500 borders
- [ ] Passes `npm run lint`
- [ ] Passes `npm run typecheck:node`

## File Organization

```
src/renderer/src/
├── components/
│   ├── views/           # View-based UI organization
│   │   ├── chat/
│   │   ├── integrations/
│   │   └── settings/
│   ├── shared/          # Reusable components
│   └── ...
├── hooks/               # Custom hooks (abstract window.api)
│   ├── useDiscord.ts
│   ├── useOpencodeApiKeys.ts
│   └── ...
├── contexts/            # React Context for state
│   ├── AppViewContext.tsx
│   └── ...
├── providers/           # Context providers
├── types/               # TypeScript type definitions
└── theme.ts             # Chakra UI theme configuration
```

## Additional Resources

- [Chakra UI v3 Documentation](https://www.chakra-ui.com/docs)
- [React 19 Documentation](https://react.dev)
- [TypeScript Handbook](https://www.typescriptlang.org/docs/)
- Project Root: `CLAUDE.md` - Overall project architecture
- Main Process: `src/main/CLAUDE.md` - Backend implementation

## Quick Reference

### Spacing Scale

- `1` = 0.25rem (4px)
- `2` = 0.5rem (8px)
- `3` = 0.75rem (12px)
- `4` = 1rem (16px)
- `6` = 1.5rem (24px)
- `8` = 2rem (32px)

### Font Sizes

- `xs` = 0.75rem (12px)
- `sm` = 0.875rem (14px)
- `md` = 1rem (16px)
- `lg` = 1.125rem (18px)
- `xl` = 1.25rem (20px)
- `2xl` = 1.5rem (24px)

### Common Layouts

- `VStack` - Vertical stack with consistent gaps
- `HStack` - Horizontal stack with consistent gaps
- `Box` - Generic container
- `Card.Root` / `Card.Body` - Card layout
- `Grid` - CSS Grid layout
- `Flex` - Flexbox layout

---

**Remember**: When in doubt, check existing components in `src/renderer/src/components/views/integrations/` for reference patterns that follow these guidelines.
