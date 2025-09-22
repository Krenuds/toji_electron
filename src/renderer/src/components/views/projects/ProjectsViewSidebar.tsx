import React from 'react'
import { VStack, Box } from '@chakra-ui/react'
import { LuFolderOpen } from 'react-icons/lu'
import { SidebarContainer } from '../../SidebarContainer'
import { SidebarHeader, QuickActionButton } from '../../shared'
import { useProjects } from '../../../hooks/useProjects'

export function ProjectsViewSidebar(): React.JSX.Element {
  const { openProjectsFolder } = useProjects()

  return (
    <SidebarContainer>
      <VStack align="stretch" gap={4}>
        <SidebarHeader title="Projects" subtitle="Manage your OpenCode projects" />

        {/* Quick Actions */}
        <Box borderTop="1px solid" borderColor="app.border" pt={4}>
          <VStack align="stretch" gap={2}>
            <QuickActionButton
              icon={<LuFolderOpen size={16} />}
              label="Open Projects Folder"
              onClick={openProjectsFolder}
            />
          </VStack>
        </Box>
      </VStack>
    </SidebarContainer>
  )
}
