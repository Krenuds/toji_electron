import React from 'react'
import { Box, Flex, Stack } from '@chakra-ui/react'
import { LuLayoutDashboard, LuMessageCircle, LuFolderTree } from 'react-icons/lu'
import { IconButton } from './components/IconButton'
import { TitleBar } from './components/TitleBar'
import { AppViewProvider } from './contexts/AppViewContext'
import { ViewType } from './types/ViewTypes'
import { useViewCoordination } from './hooks/useViewCoordination'
import { useWindowControls } from './hooks/useWindowControls'

function AppContent(): React.JSX.Element {
  const { activeView, setActiveView, getSidebarContent, getMainContent } = useViewCoordination()
  const { minimize, maximize, close } = useWindowControls()

  const handleMinimize = (): void => {
    minimize()
  }

  const handleMaximize = (): void => {
    maximize()
  }

  const handleClose = (): void => {
    close()
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
              icon={<LuFolderTree />}
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
          </Stack>
        </Box>

        {/* Sidebar - Middle Panel */}
        <Box w="300px" h="100%" bg="app.dark" borderRight="3px" borderColor="app.border">
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
