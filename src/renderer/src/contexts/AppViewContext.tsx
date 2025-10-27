import { createContext, useContext, useState, useEffect, type ReactNode } from 'react'
import { ViewType, ViewStateData } from '../types/ViewTypes'

// ============================================================================
// Type Definitions
// ============================================================================

export interface AppViewContextType {
  activeView: ViewType
  setActiveView: (view: ViewType) => void
  viewState: Record<ViewType, ViewStateData>
  setViewState: (view: ViewType, state: ViewStateData) => void
}

// ============================================================================
// Context Creation
// ============================================================================

const AppViewContext = createContext<AppViewContextType | undefined>(undefined)

// ============================================================================
// Provider Component
// ============================================================================

interface AppViewProviderProps {
  children: ReactNode
}

export function AppViewProvider({ children }: AppViewProviderProps): React.JSX.Element {
  const [activeView, setActiveViewState] = useState<ViewType>('chat')
  const [viewState, setViewStateData] = useState<Record<ViewType, ViewStateData>>({
    chat: {},
    integrations: {}
  })

  // Load persisted view from localStorage on mount
  useEffect(() => {
    const savedView = localStorage.getItem('toji-active-view')
    if (savedView && (savedView === 'chat' || savedView === 'integrations')) {
      setActiveViewState(savedView as ViewType)
    }

    const savedViewState = localStorage.getItem('toji-view-state')
    if (savedViewState) {
      try {
        const parsedState = JSON.parse(savedViewState)
        setViewStateData(parsedState)
      } catch {
        // Backend handles error logging - continue with default state
      }
    }
  }, [])

  // Persist view changes to localStorage
  const setActiveView = (view: ViewType): void => {
    setActiveViewState(view)
    localStorage.setItem('toji-active-view', view)
  }

  // Update view-specific state
  const setViewState = (view: ViewType, state: ViewStateData): void => {
    const newViewState = {
      ...viewState,
      [view]: { ...viewState[view], ...state }
    }
    setViewStateData(newViewState)
    localStorage.setItem('toji-view-state', JSON.stringify(newViewState))
  }

  const value: AppViewContextType = {
    activeView,
    setActiveView,
    viewState,
    setViewState
  }

  return <AppViewContext.Provider value={value}>{children}</AppViewContext.Provider>
}

// ============================================================================
// Custom Hook
// ============================================================================

export function useAppView(): AppViewContextType {
  const context = useContext(AppViewContext)
  if (context === undefined) {
    throw new Error('useAppView must be used within an AppViewProvider')
  }
  return context
}
