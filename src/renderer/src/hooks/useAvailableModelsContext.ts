import { useContext } from 'react'
import { AvailableModelsContext } from '../contexts/AvailableModelsContext'
import type { AvailableModelsContextValue } from '../contexts/AvailableModelsContextDef'

export function useAvailableModelsContext(): AvailableModelsContextValue {
  const context = useContext(AvailableModelsContext)
  if (!context) {
    throw new Error('useAvailableModelsContext must be used within AvailableModelsProvider')
  }
  return context
}
