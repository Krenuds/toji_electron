import React from 'react'
import { Box, VStack, HStack, Text, Badge, Separator } from '@chakra-ui/react'
import { LuFolderOpen, LuMessageSquare, LuPlus, LuClock, LuZap } from 'react-icons/lu'
import { SidebarContainer } from '../../SidebarContainer'
import { SidebarHeader } from '../../shared/SidebarHeader'
import { SidebarSection } from '../../shared/SidebarSection'
import { QuickActionButton } from '../../shared/QuickActionButton'
import { useWorkspace } from '../../../hooks/useWorkspace'
import { useSession } from '../../../hooks/useSession'

export function WorkspacesViewSidebar(): React.JSX.Element {
  const { isChangingWorkspace, selectAndChangeWorkspace, currentWorkspace } = useWorkspace()
  const { sessions, currentSessionId } = useSession()

  // Calculate session statistics
  const activeSessions = sessions.filter((s) => {
    const lastUpdated = s.time?.updated || s.time?.created || 0
    const hourAgo = Date.now() - 60 * 60 * 1000
    return lastUpdated > hourAgo
  }).length

  const uniqueWorkspaces = new Set(sessions.map((s) => s.directory)).size
  return (
    <SidebarContainer>
      <VStack align="stretch" gap={4}>
        <SidebarHeader title="Session Management" subtitle="AI conversations and workspaces" />

        <Separator borderColor="app.border" />

        <SidebarSection title="Quick Actions">
          <VStack gap={2} align="stretch">
            <QuickActionButton
              icon={<LuFolderOpen size={14} />}
              label={isChangingWorkspace ? 'Opening...' : 'Open Folder'}
              onClick={selectAndChangeWorkspace}
              isDisabled={isChangingWorkspace}
            />
            <QuickActionButton icon={<LuPlus size={14} />} label="New Session" onClick={() => {}} />
          </VStack>
        </SidebarSection>

        <Separator borderColor="app.border" />

        <SidebarSection title="Session Overview">
          <VStack gap={2} align="stretch">
            <Box p={2} borderRadius="md" bg="rgba(255,255,255,0.02)">
              <HStack justify="space-between">
                <Text color="app.text" fontSize="xs">
                  Total Sessions
                </Text>
                <Badge colorPalette="purple" size="xs">
                  {sessions.length}
                </Badge>
              </HStack>
            </Box>
            <Box p={2} borderRadius="md" bg="rgba(255,255,255,0.02)">
              <HStack justify="space-between">
                <Text color="app.text" fontSize="xs">
                  Active (last hour)
                </Text>
                <Badge colorPalette={activeSessions > 0 ? 'green' : 'gray'} size="xs">
                  {activeSessions}
                </Badge>
              </HStack>
            </Box>
            <Box p={2} borderRadius="md" bg="rgba(255,255,255,0.02)">
              <HStack justify="space-between">
                <Text color="app.text" fontSize="xs">
                  Unique Folders
                </Text>
                <Badge colorPalette="blue" size="xs">
                  {uniqueWorkspaces}
                </Badge>
              </HStack>
            </Box>
          </VStack>
        </SidebarSection>

        <Separator borderColor="app.border" />

        <SidebarSection title="Current Workspace">
          {currentWorkspace ? (
            <Box
              p={2}
              borderRadius="md"
              border="1px solid"
              borderColor="app.accent"
              bg="rgba(51,180,47,0.05)"
            >
              <Text color="app.light" fontSize="xs" fontWeight="medium" mb={1}>
                {currentWorkspace.split(/[\\/]/).pop() || 'Unknown'}
              </Text>
              <Text color="app.text" fontSize="xs" lineClamp={2}>
                {currentWorkspace}
              </Text>
              {currentSessionId && (
                <Badge size="xs" colorPalette="green" variant="subtle" mt={2}>
                  <LuMessageSquare size={8} style={{ marginRight: 2 }} />
                  Session Active
                </Badge>
              )}
            </Box>
          ) : (
            <Text color="app.text" fontSize="xs" textAlign="center" py={4}>
              No workspace open
            </Text>
          )}
        </SidebarSection>

        <Separator borderColor="app.border" />

        <SidebarSection title="Recent Activity">
          <VStack gap={2} align="stretch">
            {sessions.slice(0, 3).map((session) => {
              const folderName = session.directory?.split(/[\\/]/).pop() || 'Unknown'
              const time = session.time?.updated || session.time?.created || 0
              const timeAgo = Date.now() - time
              const minutes = Math.floor(timeAgo / 60000)
              const hours = Math.floor(minutes / 60)
              const timeStr = hours > 0 ? `${hours}h ago` : `${minutes}m ago`

              return (
                <HStack key={session.id} gap={2} fontSize="xs">
                  {session.id === currentSessionId ? (
                    <LuZap size={12} color="#33b42f" />
                  ) : (
                    <LuClock size={12} color="#808080" />
                  )}
                  <Text color="app.text" lineClamp={1}>
                    {folderName} • {timeStr}
                  </Text>
                </HStack>
              )
            })}
          </VStack>
        </SidebarSection>
      </VStack>
    </SidebarContainer>
  )
}
