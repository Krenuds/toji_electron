import { useContext } from 'react'
import { ChatCoordinatorContext } from '../contexts/ChatCoordinatorContextDef'
import type { ChatCoordinatorContextType } from '../contexts/ChatCoordinatorContextDef'

export function useChatCoordinatorContext(): ChatCoordinatorContextType {
  const context = useContext(ChatCoordinatorContext)
  if (!context) {
    throw new Error('useChatCoordinatorContext must be used within ChatCoordinatorProvider')
  }
  return context
}
