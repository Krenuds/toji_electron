import React, { useState, useEffect } from 'react'
import { Box, VStack, HStack, Text, Button, Separator, Badge } from '@chakra-ui/react'
import { LuMessageCircle, LuActivity, LuFolder, LuTrash2, LuRefreshCw } from 'react-icons/lu'
import { SidebarContainer } from '../../SidebarContainer'
import { StatusBadge } from '../../StatusBadge'
import { useServerStatus } from '../../../hooks/useServerStatus'
import { useWorkspace } from '../../../hooks/useWorkspace'
import { useCoreStatus } from '../../../hooks/useCoreStatus'
import { useSession } from '../../../hooks/useSession'

export function ChatViewSidebar(): React.JSX.Element {
  const serverStatus = useServerStatus()
  const { isChangingWorkspace, currentWorkspace, selectAndChangeWorkspace, workspaceInfo } =
    useWorkspace()
  const { isRunning, getCurrentDirectory } = useCoreStatus()
  const {
    sessions,
    isLoading: isLoadingSessions,
    currentSessionId,
    fetchSessions,
    deleteSession
  } = useSession()
  const [workingDirectory, setWorkingDirectory] = useState<string | undefined>()
  const [deletingSessionId, setDeletingSessionId] = useState<string | null>(null)

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
          const running = await isRunning()
          if (running) {
            const dir = await getCurrentDirectory()
            if (dir) {
              setWorkingDirectory(dir)
            } else {
              setWorkingDirectory(undefined)
            }
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
  }, [workspaceInfo, currentWorkspace, isRunning, getCurrentDirectory])

  const handleDeleteSession = async (sessionId: string): Promise<void> => {
    setDeletingSessionId(sessionId)
    const success = await deleteSession(sessionId)
    if (success) {
      // Optionally show success feedback
      console.log('Session deleted successfully')
    }
    setDeletingSessionId(null)
  }

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

        {/* Sessions Management */}
        <Box>
          <HStack justify="space-between" mb={3}>
            <Text color="app.light" fontSize="xs" fontWeight="semibold">
              Sessions
            </Text>
            <Button
              size="xs"
              variant="ghost"
              color="app.text"
              _hover={{ color: 'app.light' }}
              onClick={fetchSessions}
              disabled={isLoadingSessions}
            >
              <LuRefreshCw size={12} />
            </Button>
          </HStack>
          <VStack gap={2} align="stretch">
            {isLoadingSessions ? (
              <Text color="app.text" fontSize="2xs" textAlign="center" py={2}>
                Loading sessions...
              </Text>
            ) : sessions.length === 0 ? (
              <Text color="app.text" fontSize="2xs" textAlign="center" py={2}>
                No active sessions
              </Text>
            ) : (
              sessions.map((session) => (
                <Box
                  key={session.id}
                  p={2}
                  borderRadius="md"
                  bg={
                    currentSessionId === session.id
                      ? 'rgba(51, 180, 47, 0.1)'
                      : 'rgba(255,255,255,0.02)'
                  }
                  border="1px solid"
                  borderColor={currentSessionId === session.id ? 'app.accent' : 'app.border'}
                  position="relative"
                >
                  <HStack justify="space-between">
                    <VStack align="start" gap={0} flex={1}>
                      <Text color="app.light" fontSize="xs" fontWeight="medium" lineClamp={1}>
                        {session.title || `Session ${session.id.slice(0, 8)}`}
                      </Text>
                      <Text color="app.text" fontSize="2xs">
                        ID: {session.id.slice(0, 12)}...
                      </Text>
                    </VStack>
                    <Button
                      size="xs"
                      variant="ghost"
                      color="app.text"
                      _hover={{ color: 'red.400', bg: 'rgba(255,0,0,0.1)' }}
                      onClick={() => handleDeleteSession(session.id)}
                      disabled={deletingSessionId === session.id}
                      aria-label="Delete session"
                    >
                      <LuTrash2 size={12} />
                    </Button>
                  </HStack>
                  {currentSessionId === session.id && (
                    <Badge
                      size="xs"
                      colorPalette="green"
                      variant="subtle"
                      position="absolute"
                      top={1}
                      right={1}
                    >
                      Active
                    </Badge>
                  )}
                </Box>
              ))
            )}
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
