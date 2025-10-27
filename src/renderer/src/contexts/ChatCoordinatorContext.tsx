import { createContext, useContext, type ReactNode } from 'react'
import { useChatCoordinator } from '../hooks/useChatCoordinator'

// ============================================================================
// Type Definitions
// ============================================================================

// The return type of useChatCoordinator
export type ChatCoordinatorContextType = ReturnType<typeof useChatCoordinator>

// ============================================================================
// Context Creation
// ============================================================================

const ChatCoordinatorContext = createContext<ChatCoordinatorContextType | undefined>(undefined)

// ============================================================================
// Provider Component
// ============================================================================

interface ChatCoordinatorProviderProps {
  children: ReactNode
}

export function ChatCoordinatorProvider({
  children
}: ChatCoordinatorProviderProps): React.JSX.Element {
  // Create a single instance of the coordinator
  const coordinator = useChatCoordinator()

  return (
    <ChatCoordinatorContext.Provider value={coordinator}>
      {children}
    </ChatCoordinatorContext.Provider>
  )
}

// ============================================================================
// Custom Hook
// ============================================================================

export function useChatCoordinatorContext(): ChatCoordinatorContextType {
  const context = useContext(ChatCoordinatorContext)
  if (!context) {
    throw new Error('useChatCoordinatorContext must be used within ChatCoordinatorProvider')
  }
  return context
}
