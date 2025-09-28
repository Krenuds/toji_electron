import React, { useState, useEffect, ReactNode } from 'react'
import { ViewType, ViewStateData } from '../types/ViewTypes'
import { AppViewContext, AppViewContextType } from '../contexts/AppViewContextDef'

interface AppViewProviderProps {
  children: ReactNode
}

export function AppViewProvider({ children }: AppViewProviderProps): React.JSX.Element {
  const [activeView, setActiveViewState] = useState<ViewType>('chat')
  const [viewState, setViewStateData] = useState<Record<ViewType, ViewStateData>>({
    chat: {}
  })

  // Load persisted view from localStorage on mount
  useEffect(() => {
    const savedView = localStorage.getItem('toji-active-view')
    if (savedView && savedView === 'chat') {
      setActiveViewState(savedView as ViewType)
    }

    const savedViewState = localStorage.getItem('toji-view-state')
    if (savedViewState) {
      try {
        const parsedState = JSON.parse(savedViewState)
        setViewStateData(parsedState)
      } catch (error) {
        console.error('Failed to parse saved view state:', error)
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
