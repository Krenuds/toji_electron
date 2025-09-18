import { useContext } from 'react'
import { AppViewContext, AppViewContextType } from '../contexts/AppViewContextDef'

export function useAppView(): AppViewContextType {
  const context = useContext(AppViewContext)
  if (context === undefined) {
    throw new Error('useAppView must be used within an AppViewProvider')
  }
  return context
}
