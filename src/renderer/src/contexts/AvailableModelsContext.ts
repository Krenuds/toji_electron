import { createContext } from 'react'
import type { AvailableModelsContextValue } from './AvailableModelsContextDef'

export const AvailableModelsContext = createContext<AvailableModelsContextValue | undefined>(
  undefined
)
