import React from 'react'
import { useAppView } from './useAppView'
import { ViewType, ViewStateData } from '../types/ViewTypes'
import { DashboardViewSidebar } from '../components/views/dashboard/DashboardViewSidebar'
import { DashboardViewMain } from '../components/views/dashboard/DashboardViewMain'
import { ChatViewSidebar } from '../components/views/chat/ChatViewSidebar'
import { ChatViewMain } from '../components/views/chat/ChatViewMain'
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
      case 'dashboard':
        return <DashboardViewSidebar />
      case 'chat':
        return <ChatViewSidebar />
      default:
        return <PlaceholderSidebar viewName="unknown" />
    }
  }

  const getMainContent = (): React.ReactNode => {
    switch (activeView) {
      case 'dashboard':
        return <DashboardViewMain />
      case 'chat':
        return <ChatViewMain />
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
