import React from 'react'
import { VStack, Text, Box } from '@chakra-ui/react'
import { SidebarContainer } from '../../SidebarContainer'
import { SidebarHeader } from '../../shared/SidebarHeader'

export function ProjectsViewSidebar(): React.JSX.Element {
  return (
    <SidebarContainer>
      <VStack align="stretch" gap={4}>
        <SidebarHeader
          title="Projects"
          subtitle="Manage your OpenCode projects"
        />

        {/* Placeholder content */}
        <Box borderTop="1px solid" borderColor="app.border" pt={4}>
          <Text color="app.text" fontSize="sm">
            Project sidebar coming soon...
          </Text>
        </Box>
      </VStack>
    </SidebarContainer>
  )
}