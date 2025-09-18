import React from 'react'
import { Box, Flex, Stack } from '@chakra-ui/react'
import { LuSettings, LuLayoutDashboard } from 'react-icons/lu'
import { IconButton } from './components/IconButton'
import { CustomTitlebar } from './components/CustomTitlebar'

function App(): React.JSX.Element {
  const handleMinimize = (): void => {
    window.api.window.minimize()
  }

  const handleMaximize = (): void => {
    window.api.window.maximize()
  }

  const handleClose = (): void => {
    window.api.window.close()
  }

  return (
    <Box h="100vh">
      {/* Custom Titlebar - Full Width */}
      <CustomTitlebar
        onMinimize={handleMinimize}
        onMaximize={handleMaximize}
        onClose={handleClose}
      />

      {/* Main Application Content */}
      <Flex h="calc(100vh - 32px)" w="100%">
        {/* Icon Bar - Left Panel */}
        <Box w="45px" bg="app.darkest" borderRight="1px" borderColor="app.border">
          <Stack direction="column" gap={2} p={2}>
            <IconButton icon={<LuLayoutDashboard />} />
            <IconButton icon={<LuSettings />} />
          </Stack>
        </Box>

        {/* Sidebar - Middle Panel */}
        <Box w="300px" bg="app.dark" borderRight="1px" borderColor="app.border" p={4}>
          <Box color="app.light" fontSize="sm" fontWeight="bold" mb={4}>
            Chat Settings
          </Box>
          <Box color="app.text" fontSize="xs">
            Sidebar content goes here...
          </Box>
        </Box>

        {/* Main Content - Right Panel */}
        <Box flex="1" bg="app.medium" p={6}>
          <Box color="app.light" fontSize="lg" fontWeight="bold" mb={4}>
            Main Content Area
          </Box>
          <Box color="app.text">This is where your primary content will be displayed.</Box>
        </Box>
      </Flex>
    </Box>
  )
}

export default App
