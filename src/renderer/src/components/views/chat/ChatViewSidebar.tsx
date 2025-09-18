import React, { useState, useEffect } from 'react'
import { Box, VStack, HStack, Text, Button, Separator, Badge } from '@chakra-ui/react'
import { LuMessageCircle, LuActivity, LuFolder } from 'react-icons/lu'
import { SidebarContainer } from '../../SidebarContainer'
import { StatusBadge } from '../../StatusBadge'
import { useServerStatus } from '../../../hooks/useServerStatus'
import { useWorkspace } from '../../../hooks/useWorkspace'

export function ChatViewSidebar(): React.JSX.Element {
  const serverStatus = useServerStatus()
  const { isChangingWorkspace, currentWorkspace, selectAndChangeWorkspace, workspaceInfo } =
    useWorkspace()
  const [workingDirectory, setWorkingDirectory] = useState<string | undefined>()

  useEffect(() => {
    // Update working directory from workspace info
    if (workspaceInfo?.workspacePath) {
      setWorkingDirectory(workspaceInfo.workspacePath)
    } else if (currentWorkspace) {
      setWorkingDirectory(currentWorkspace)
    } else {
      // Check working directory when server is running
      const checkWorkingDirectory = async (): Promise<void> => {
        try {
          const isRunning = await window.api.core.isRunning()
          if (isRunning) {
            const dir = await window.api.core.getCurrentDirectory()
            setWorkingDirectory(dir)
          } else {
            setWorkingDirectory(undefined)
          }
        } catch (error) {
          console.error('Failed to get working directory:', error)
          setWorkingDirectory(undefined)
        }
      }

      checkWorkingDirectory()
    }
  }, [workspaceInfo, currentWorkspace])
  return (
    <SidebarContainer>
      <VStack align="stretch" gap={4}>
        {/* Header */}
        <Box>
          <Text color="app.light" fontSize="sm" fontWeight="bold" mb={2}>
            Chat with Toji
          </Text>
          <Text color="app.text" fontSize="xs">
            AI-powered coding assistant
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
                <LuFolder size={14} />
                <Text>
                  {isChangingWorkspace ? 'Changing Workspace...' : 'New Chat (Select Folder)'}
                </Text>
              </HStack>
            </Button>
          </VStack>
        </Box>

        <Separator borderColor="app.border" />

        {/* Server Status */}
        <Box>
          <Text color="app.light" fontSize="xs" fontWeight="semibold" mb={3}>
            Server Status
          </Text>
          <Box
            p={2}
            borderRadius="md"
            bg="rgba(255,255,255,0.02)"
            border="1px solid"
            borderColor="app.border"
          >
            <HStack justify="space-between" mb={2}>
              <Text color="app.light" fontSize="xs" fontWeight="medium">
                OpenCode Server
              </Text>
              <StatusBadge status={isChangingWorkspace ? 'starting' : serverStatus} />
            </HStack>
            <Text color="app.text" fontSize="2xs" lineClamp={1}>
              {isChangingWorkspace
                ? 'Switching workspace...'
                : workingDirectory
                  ? `Directory: ${workingDirectory.split(/[\\/]/).pop() || workingDirectory}`
                  : 'No directory selected'}
            </Text>
            {workspaceInfo && (
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
                {workspaceInfo.isNew && (
                  <Badge size="xs" colorPalette="yellow" variant="subtle">
                    New
                  </Badge>
                )}
              </HStack>
            )}
          </Box>
        </Box>

        <Separator borderColor="app.border" />

        {/* Recent Sessions */}
        <Box>
          <Text color="app.light" fontSize="xs" fontWeight="semibold" mb={3}>
            Recent Sessions
          </Text>
          <VStack gap={2} align="stretch">
            <Box
              p={2}
              borderRadius="md"
              bg="rgba(255,255,255,0.02)"
              border="1px solid"
              borderColor="app.border"
              cursor="pointer"
              _hover={{ bg: 'rgba(255,255,255,0.05)' }}
            >
              <HStack justify="space-between">
                <Text color="app.light" fontSize="xs" fontWeight="medium">
                  General Chat
                </Text>
                <StatusBadge status="running" />
              </HStack>
              <Text color="app.text" fontSize="2xs" mt={1}>
                Started 2 minutes ago
              </Text>
            </Box>

            <Text color="app.text" fontSize="2xs" textAlign="center" py={2}>
              No other sessions yet
            </Text>
          </VStack>
        </Box>

        <Separator borderColor="app.border" />

        {/* Activity */}
        <Box>
          <Text color="app.light" fontSize="xs" fontWeight="semibold" mb={3}>
            Recent Activity
          </Text>
          <VStack gap={2} align="stretch">
            <HStack gap={2}>
              <LuMessageCircle size={12} color="#808080" />
              <Text color="app.text" fontSize="2xs">
                Chat session created
              </Text>
            </HStack>
            <HStack gap={2}>
              <LuActivity size={12} color="#808080" />
              <Text color="app.text" fontSize="2xs">
                Server initialization ready
              </Text>
            </HStack>
          </VStack>
        </Box>
      </VStack>
    </SidebarContainer>
  )
}
