import React from 'react'
import { Box, Flex, Stack } from '@chakra-ui/react'
import { LuSettings, LuLayoutDashboard } from 'react-icons/lu'
import { IconButton } from './components/IconButton'

function App(): React.JSX.Element {
  return (
    <Flex h="100vh">
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
  )
}

export default App
