import { createContext } from 'react'
import type { useChatCoordinator } from '../hooks/useChatCoordinator'

// The return type of useChatCoordinator
export type ChatCoordinatorContextType = ReturnType<typeof useChatCoordinator>

export const ChatCoordinatorContext = createContext<ChatCoordinatorContextType | undefined>(
  undefined
)
