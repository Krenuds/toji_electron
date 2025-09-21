import React from 'react'
import { VStack, Box, Text, Center } from '@chakra-ui/react'
import { LuFolderTree } from 'react-icons/lu'

export function ProjectsViewMain(): React.JSX.Element {
  return (
    <VStack align="stretch" gap={6}>
      {/* Header */}
      <Box>
        <Text color="app.light" fontSize="2xl" fontWeight="bold" mb={2}>
          Projects
        </Text>
        <Text color="app.text" fontSize="sm">
          Manage and organize your OpenCode AI projects.
        </Text>
      </Box>

      {/* Main Content Area - Empty State */}
      <Center py={20}>
        <VStack gap={4}>
          <LuFolderTree size={48} color="#404040" />
          <Text color="app.light" fontSize="lg">
            Projects View
          </Text>
          <Text color="app.text" fontSize="sm" textAlign="center" maxW="400px">
            This is where your OpenCode projects will be displayed.
            Features for project management coming soon.
          </Text>
        </VStack>
      </Center>
    </VStack>
  )
}