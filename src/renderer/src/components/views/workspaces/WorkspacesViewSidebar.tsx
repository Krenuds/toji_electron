import React from 'react'
import { Box, VStack, HStack, Text, Badge, Button, Separator } from '@chakra-ui/react'
import { LuFolderOpen, LuActivity, LuGitBranch, LuSearch } from 'react-icons/lu'
import { SidebarContainer } from '../../SidebarContainer'
import { useWorkspace } from '../../../hooks/useWorkspace'

export function WorkspacesViewSidebar(): React.JSX.Element {
  const { isChangingWorkspace, selectAndChangeWorkspace, workspaceInfo } = useWorkspace()
  return (
    <SidebarContainer>
      <VStack align="stretch" gap={4}>
        {/* Header */}
        <Box>
          <Text color="app.light" fontSize="sm" fontWeight="bold" mb={2}>
            Workspace Management
          </Text>
          <Text color="app.text" fontSize="xs">
            Working directories and Workspaces
          </Text>
        </Box>

        <Separator borderColor="app.border" />

        {/* Quick Actions */}
        <Box>
          <Text color="app.light" fontSize="xs" fontWeight="semibold" mb={3}>
            Quick Actions
          </Text>
          <VStack gap={2} align="stretch">
            <Button
              variant="ghost"
              size="sm"
              justifyContent="flex-start"
              color="app.text"
              _hover={{ color: 'app.light', bg: 'rgba(255,255,255,0.05)' }}
              onClick={selectAndChangeWorkspace}
              disabled={isChangingWorkspace}
            >
              <HStack gap={1}>
                <LuFolderOpen size={14} />
                <Text>{isChangingWorkspace ? 'Opening Workspace...' : 'Open Workspace'}</Text>
              </HStack>
            </Button>
            <Button
              variant="ghost"
              size="sm"
              justifyContent="flex-start"
              color="app.text"
              _hover={{ color: 'app.light', bg: 'rgba(255,255,255,0.05)' }}
            >
              <HStack gap={1}>
                <LuSearch size={14} />
                <Text>Discover Projects</Text>
              </HStack>
            </Button>
          </VStack>
        </Box>

        <Separator borderColor="app.border" />

        {/* Recent Workspaces */}
        <Box>
          <Text color="app.light" fontSize="xs" fontWeight="semibold" mb={3}>
            Recent Workspaces
          </Text>
          <VStack gap={2} align="stretch">
            <Box
              p={2}
              borderRadius="md"
              border="1px solid"
              borderColor="app.border"
              _hover={{ bg: 'rgba(255,255,255,0.02)' }}
              cursor="pointer"
            >
              <HStack justify="space-between" mb={1}>
                <Text color="app.light" fontSize="xs" fontWeight="medium">
                  toji3
                </Text>
                <Badge colorPalette="green" size="xs">
                  {workspaceInfo?.workspacePath?.includes('toji3') ? 'Active' : 'Recent'}
                </Badge>
              </HStack>
              <Text color="app.text" fontSize="xs" lineClamp={1}>
                C:/Users/donth/toji3
              </Text>
              {workspaceInfo?.workspacePath?.includes('toji3') && (
                <HStack mt={1} gap={1}>
                  {workspaceInfo.hasGit && (
                    <Badge size="xs" colorPalette="green" variant="subtle">
                      Git
                    </Badge>
                  )}
                  {workspaceInfo.hasOpenCodeConfig && (
                    <Badge size="xs" colorPalette="blue" variant="subtle">
                      Config
                    </Badge>
                  )}
                </HStack>
              )}
            </Box>

            <Box
              p={2}
              borderRadius="md"
              border="1px solid"
              borderColor="app.border"
              _hover={{ bg: 'rgba(255,255,255,0.02)' }}
              cursor="pointer"
            >
              <HStack justify="space-between" mb={1}>
                <Text color="app.light" fontSize="xs" fontWeight="medium">
                  CNC
                </Text>
                <Badge colorPalette="gray" size="xs">
                  Idle
                </Badge>
              </HStack>
              <Text color="app.text" fontSize="xs" lineClamp={1}>
                C:/Users/donth/Documents/GitHub/CNC
              </Text>
            </Box>
          </VStack>
        </Box>

        <Separator borderColor="app.border" />

        {/* Activity Feed */}
        <Box>
          <Text color="app.light" fontSize="xs" fontWeight="semibold" mb={3}>
            Recent Activity
          </Text>
          <VStack gap={2} align="stretch">
            <HStack gap={2} fontSize="xs">
              <LuActivity size={12} color="#33b42f" />
              <Text color="app.text">Session created in toji3</Text>
            </HStack>
            <HStack gap={2} fontSize="xs">
              <LuGitBranch size={12} color="#808080" />
              <Text color="app.text">Workspace changed to Downloads</Text>
            </HStack>
            <HStack gap={2} fontSize="xs">
              <LuActivity size={12} color="#33b42f" />
              <Text color="app.text">3 projects discovered</Text>
            </HStack>
          </VStack>
        </Box>
      </VStack>
    </SidebarContainer>
  )
}
