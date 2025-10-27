import React from 'react'
import { useAppView } from '../contexts/AppViewContext'
import { ViewType, ViewStateData } from '../types/ViewTypes'
import { ChatViewSidebar } from '../components/views/chat/ChatViewSidebar'
import { ChatViewMain } from '../components/views/chat/ChatViewMain'
import { IntegrationsViewSidebar } from '../components/views/integrations/IntegrationsViewSidebar'
import { IntegrationsViewMain } from '../components/views/integrations/IntegrationsViewMain'
import { PlaceholderSidebar, PlaceholderMain } from '../components/PlaceholderViews'

interface UseViewCoordinationReturn {
  activeView: ViewType
  setActiveView: (view: ViewType) => void
  getSidebarContent: () => React.ReactNode
  getMainContent: () => React.ReactNode
  updateViewState: (state: ViewStateData) => void
  getViewState: (view?: ViewType) => ViewStateData
}

export function useViewCoordination(): UseViewCoordinationReturn {
  const { activeView, setActiveView, viewState, setViewState } = useAppView()

  const getSidebarContent = (): React.ReactNode => {
    switch (activeView) {
      case 'chat':
        return <ChatViewSidebar />
      case 'integrations':
        return <IntegrationsViewSidebar />
      default:
        return <PlaceholderSidebar viewName="unknown" />
    }
  }

  const getMainContent = (): React.ReactNode => {
    switch (activeView) {
      case 'chat':
        return <ChatViewMain />
      case 'integrations':
        return <IntegrationsViewMain />
      default:
        return <PlaceholderMain viewName="unknown" />
    }
  }

  const handleViewChange = (view: ViewType): void => {
    setActiveView(view)
  }

  const updateViewState = (state: ViewStateData): void => {
    setViewState(activeView, state)
  }

  const getViewState = (view?: ViewType): ViewStateData => {
    return viewState[view || activeView]
  }

  return {
    activeView,
    setActiveView: handleViewChange,
    getSidebarContent,
    getMainContent,
    updateViewState,
    getViewState
  }
}
