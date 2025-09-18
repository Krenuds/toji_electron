import { createContext } from 'react'
import { ViewType, ViewStateData } from '../types/ViewTypes'

export interface AppViewContextType {
  activeView: ViewType
  setActiveView: (view: ViewType) => void
  viewState: Record<ViewType, ViewStateData>
  setViewState: (view: ViewType, state: ViewStateData) => void
}

export const AppViewContext = createContext<AppViewContextType | undefined>(undefined)
