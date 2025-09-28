import React from 'react'
import { useChatCoordinator } from '../hooks/useChatCoordinator'
import { ChatCoordinatorContext } from './ChatCoordinatorContextDef'

interface ChatCoordinatorProviderProps {
  children: React.ReactNode
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
