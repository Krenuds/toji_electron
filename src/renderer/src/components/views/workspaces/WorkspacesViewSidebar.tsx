import React from 'react'
import { Box, VStack, HStack, Text, Badge, Separator, Button } from '@chakra-ui/react'
import { LuFolderOpen, LuFolder, LuList, LuRefreshCw } from 'react-icons/lu'
import { SidebarContainer } from '../../SidebarContainer'
import { SidebarHeader } from '../../shared/SidebarHeader'
import { SidebarSection } from '../../shared/SidebarSection'
import { QuickActionButton } from '../../shared/QuickActionButton'
import { useWorkspace } from '../../../hooks/useWorkspace'
import { useWorkspaces } from '../../../hooks/useWorkspaces'

export function WorkspacesViewSidebar(): React.JSX.Element {
  const { isChangingWorkspace, selectAndChangeWorkspace, currentWorkspace, changeWorkspace } =
    useWorkspace()
  const { workspaces, isLoading, refreshWorkspaces } = useWorkspaces()

  // Stats
  const activeWorkspaces = workspaces.filter((ws) => ws.sessionCount > 0).length
  const totalSessions = workspaces.reduce((sum, ws) => sum + ws.sessionCount, 0)

  const handleWorkspaceClick = async (path: string): Promise<void> => {
    if (path !== currentWorkspace) {
      await changeWorkspace(path)
    }
  }

  const handleOpenSessionsFolder = async (): Promise<void> => {
    try {
      await window.api.toji.openSessionsDirectory()
    } catch (err) {
      console.error('Failed to open sessions directory:', err)
    }
  }

  return (
    <SidebarContainer>
      <VStack align="stretch" gap={4}>
        <SidebarHeader title="Workspaces" subtitle="Your project folders and sessions" />

        <Separator borderColor="app.border" />

        <SidebarSection title="Quick Actions">
          <VStack gap={2} align="stretch">
            <QuickActionButton
              icon={<LuFolderOpen size={14} />}
              label={isChangingWorkspace ? 'Opening...' : 'Open Folder'}
              onClick={selectAndChangeWorkspace}
              isDisabled={isChangingWorkspace}
            />
            <QuickActionButton
              icon={<LuList size={14} />}
              label="Browse Sessions"
              onClick={handleOpenSessionsFolder}
            />
            <QuickActionButton
              icon={<LuRefreshCw size={14} />}
              label="Refresh"
              onClick={refreshWorkspaces}
              isDisabled={isLoading}
            />
          </VStack>
        </SidebarSection>

        <Separator borderColor="app.border" />

        <SidebarSection title="Overview">
          <VStack gap={2} align="stretch">
            <Box p={2} borderRadius="md" bg="rgba(255,255,255,0.02)">
              <HStack justify="space-between">
                <Text color="app.text" fontSize="xs">
                  Active Workspaces
                </Text>
                <Badge colorPalette="green" size="xs">
                  {activeWorkspaces}
                </Badge>
              </HStack>
            </Box>
            <Box p={2} borderRadius="md" bg="rgba(255,255,255,0.02)">
              <HStack justify="space-between">
                <Text color="app.text" fontSize="xs">
                  Total Sessions
                </Text>
                <Badge colorPalette="purple" size="xs">
                  {totalSessions}
                </Badge>
              </HStack>
            </Box>
          </VStack>
        </SidebarSection>

        <Separator borderColor="app.border" />

        <SidebarSection title="Recent Workspaces">
          {isLoading ? (
            <Text color="app.text" fontSize="xs" textAlign="center" py={4}>
              Loading workspaces...
            </Text>
          ) : workspaces.length === 0 ? (
            <VStack gap={2} py={4}>
              <Text color="app.text" fontSize="xs" textAlign="center">
                No workspaces found
              </Text>
              <Button size="xs" variant="subtle" onClick={selectAndChangeWorkspace}>
                Open a folder to start
              </Button>
            </VStack>
          ) : (
            <VStack gap={2} align="stretch">
              {workspaces.slice(0, 5).map((workspace) => {
                const isActive = workspace.path === currentWorkspace
                return (
                  <Box
                    key={workspace.path}
                    p={2}
                    borderRadius="md"
                    bg={isActive ? 'rgba(51,180,47,0.05)' : 'rgba(255,255,255,0.02)'}
                    border="1px solid"
                    borderColor={isActive ? 'app.accent' : 'transparent'}
                    cursor="pointer"
                    _hover={{
                      bg: isActive ? 'rgba(51,180,47,0.08)' : 'rgba(255,255,255,0.04)'
                    }}
                    onClick={() => handleWorkspaceClick(workspace.path)}
                  >
                    <HStack gap={2}>
                      <LuFolder
                        size={14}
                        color={isActive ? '#33b42f' : '#808080'}
                        style={{ flexShrink: 0 }}
                      />
                      <VStack align="start" gap={0} flex={1} minW={0}>
                        <Text
                          color={isActive ? 'app.accent' : 'app.light'}
                          fontSize="xs"
                          fontWeight="medium"
                          lineClamp={1}
                        >
                          {workspace.name}
                        </Text>
                        <Text color="app.text" fontSize="xs">
                          {workspace.sessionCount} session
                          {workspace.sessionCount !== 1 ? 's' : ''}
                        </Text>
                      </VStack>
                    </HStack>
                  </Box>
                )
              })}
            </VStack>
          )}
        </SidebarSection>
      </VStack>
    </SidebarContainer>
  )
}
