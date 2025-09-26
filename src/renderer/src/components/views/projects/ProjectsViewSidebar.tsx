import React from 'react'
import { VStack } from '@chakra-ui/react'
import { SidebarContainer } from '../../SidebarContainer'
import { SidebarHeader } from '../../shared'

export function ProjectsViewSidebar(): React.JSX.Element {
  return (
    <SidebarContainer>
      <VStack align="stretch" gap={4}>
        <SidebarHeader title="Projects" subtitle="View your OpenCode projects" />
      </VStack>
    </SidebarContainer>
  )
}
