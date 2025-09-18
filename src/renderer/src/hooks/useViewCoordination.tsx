import React from 'react'
import { useAppView } from './useAppView'
import { ViewType, ViewStateData } from '../types/ViewTypes'
import { DashboardViewSidebar } from '../components/views/dashboard/DashboardViewSidebar'
import { DashboardViewMain } from '../components/views/dashboard/DashboardViewMain'
import { ProjectsViewSidebar } from '../components/views/projects/ProjectsViewSidebar'
import { ProjectsViewMain } from '../components/views/projects/ProjectsViewMain'
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
      case 'projects':
        return <ProjectsViewSidebar />
      case 'settings':
        return <PlaceholderSidebar viewName="settings" />
      case 'chat':
        return <PlaceholderSidebar viewName="chat" />
      default:
        return <PlaceholderSidebar viewName="unknown" />
    }
  }

  const getMainContent = (): React.ReactNode => {
    switch (activeView) {
      case 'dashboard':
        return <DashboardViewMain />
      case 'projects':
        return <ProjectsViewMain />
      case 'settings':
        return <PlaceholderMain viewName="settings" />
      case 'chat':
        return <PlaceholderMain viewName="chat" />
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
