import React from 'react'
import { Box, Flex, Stack } from '@chakra-ui/react'
import { LuSettings, LuLayoutDashboard, LuFolderGit2, LuMessageCircle } from 'react-icons/lu'
import { IconButton } from './components/IconButton'
import { TitleBar } from './components/TitleBar'
import { AppViewProvider } from './contexts/AppViewContext'
import { ViewType } from './types/ViewTypes'
import { useViewCoordination } from './hooks/useViewCoordination'

function AppContent(): React.JSX.Element {
  const { activeView, setActiveView, getSidebarContent, getMainContent } = useViewCoordination()

  const handleMinimize = (): void => {
    window.api.window.minimize()
  }

  const handleMaximize = (): void => {
    window.api.window.maximize()
  }

  const handleClose = (): void => {
    window.api.window.close()
  }

  const handleIconClick = (viewName?: ViewType): void => {
    if (viewName) {
      setActiveView(viewName)
    }
  }

  return (
    <Box h="100vh">
      {/* Custom Titlebar - Full Width */}
      <TitleBar onMinimize={handleMinimize} onMaximize={handleMaximize} onClose={handleClose} />

      {/* Main Application Content */}
      <Flex h="calc(100vh - 32px)" w="100%">
        {/* Icon Bar - Left Panel */}
        <Box w="35px" bg="app.medium" borderRight="1px" borderColor="app.border">
          <Stack direction="column" gap={1} p={1}>
            <IconButton
              icon={<LuLayoutDashboard />}
              tooltip="Dashboard"
              viewName="dashboard"
              isActive={activeView === 'dashboard'}
              onClick={handleIconClick}
            />
            <IconButton
              icon={<LuFolderGit2 />}
              tooltip="Projects"
              viewName="projects"
              isActive={activeView === 'projects'}
              onClick={handleIconClick}
            />
            <IconButton
              icon={<LuMessageCircle />}
              tooltip="Chat"
              viewName="chat"
              isActive={activeView === 'chat'}
              onClick={handleIconClick}
            />
            <IconButton
              icon={<LuSettings />}
              tooltip="Settings"
              viewName="settings"
              isActive={activeView === 'settings'}
              onClick={handleIconClick}
            />
          </Stack>
        </Box>

        {/* Sidebar - Middle Panel */}
        <Box w="300px" bg="app.dark" borderRight="3px" borderColor="app.border">
          {getSidebarContent()}
        </Box>

        {/* Main Content - Right Panel */}
        <Box flex="1" bg="app.medium" p={6}>
          {getMainContent()}
        </Box>
      </Flex>
    </Box>
  )
}

function App(): React.JSX.Element {
  return (
    <AppViewProvider>
      <AppContent />
    </AppViewProvider>
  )
}

export default App
