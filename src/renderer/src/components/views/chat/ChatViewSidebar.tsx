import React, { useState, useEffect } from 'react'
import { Box, VStack, HStack, Text, Button, Separator, Badge, Alert } from '@chakra-ui/react'
import {
  LuTrash2,
  LuRefreshCw,
  LuList,
  LuMessageCircle,
  LuActivity,
  LuFolderOpen
} from 'react-icons/lu'
import { SidebarContainer } from '../../SidebarContainer'
import { SidebarHeader } from '../../shared/SidebarHeader'
import { SidebarSection } from '../../shared/SidebarSection'
import { StatusBadge } from '../../StatusBadge'
import { SessionsModal } from '../../shared'
import { useServerStatus } from '../../../hooks/useServerStatus'
import { useCoreStatus } from '../../../hooks/useCoreStatus'
import { useSession } from '../../../hooks/useSession'
import { useOpenProject } from '../../../hooks/useOpenProject'

export function ChatViewSidebar(): React.JSX.Element {
  const { status: serverStatus } = useServerStatus()
  const { isRunning, getCurrentDirectory } = useCoreStatus()
  const {
    sessions,
    isLoading: isLoadingSessions,
    currentSessionId,
    fetchSessions,
    deleteSession
  } = useSession()
  const {
    openProject,
    loading: projectLoading,
    error: projectError,
    currentProject
  } = useOpenProject()
  const [workingDirectory, setWorkingDirectory] = useState<string | undefined>()
  const [deletingSessionId, setDeletingSessionId] = useState<string | null>(null)
  const [isSessionsModalOpen, setIsSessionsModalOpen] = useState(false)

  useEffect(() => {
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
  }, [isRunning, getCurrentDirectory])

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
        <SidebarHeader title="Chat with Toji" subtitle="AI-powered coding assistant" />

        <Separator borderColor="app.border" />

        {/* Server Status */}
        <SidebarSection title="Server Status">
          <VStack align="stretch" gap={3}>
            <Box
              p={2}
              borderRadius="md"
              bg="rgba(255,255,255,0.02)"
              border="1px solid"
              borderColor="app.border"
            >
              <HStack justify="space-between" mb={2}>
                <Text color="app.light" fontSize="xs" fontWeight="medium">
                  Active Project
                </Text>
                <StatusBadge status={serverStatus.isRunning ? 'running' : 'stopped'} />
              </HStack>
              <Text color="app.text" fontSize="2xs" lineClamp={1}>
                {currentProject || workingDirectory
                  ? `${(currentProject || workingDirectory)?.split(/[\\/]/).pop() || currentProject || workingDirectory}`
                  : 'No project open'}
              </Text>
            </Box>

            {/* Project Error Alert */}
            {projectError && (
              <Alert.Root status="error" size="sm">
                <Alert.Indicator />
                <Alert.Content>
                  <Alert.Description fontSize="2xs">{projectError}</Alert.Description>
                </Alert.Content>
              </Alert.Root>
            )}

            {/* Open Project Button */}
            <Button
              size="sm"
              variant="solid"
              colorPalette="green"
              onClick={openProject}
              disabled={projectLoading}
              loading={projectLoading}
              justifyContent="flex-start"
            >
              <LuFolderOpen size={14} />
              Open Project
            </Button>
          </VStack>
        </SidebarSection>

        <Separator borderColor="app.border" />

        {/* Sessions Management */}
        <SidebarSection
          title="Sessions"
          action={
            <HStack gap={1}>
              <Button
                size="xs"
                variant="ghost"
                color="app.text"
                _hover={{ color: 'app.light' }}
                onClick={() => setIsSessionsModalOpen(true)}
                title="View all sessions"
              >
                <LuList size={12} />
              </Button>
              <Button
                size="xs"
                variant="ghost"
                color="app.text"
                _hover={{ color: 'app.light' }}
                onClick={fetchSessions}
                disabled={isLoadingSessions}
                title="Refresh sessions"
              >
                <LuRefreshCw size={12} />
              </Button>
            </HStack>
          }
        >
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
        </SidebarSection>

        <Separator borderColor="app.border" />

        <SidebarSection title="Recent Activity">
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
        </SidebarSection>
      </VStack>

      {/* Sessions Modal */}
      <SessionsModal
        isOpen={isSessionsModalOpen}
        onClose={() => setIsSessionsModalOpen(false)}
        sessions={sessions}
        isLoading={isLoadingSessions}
        currentSessionId={currentSessionId}
        onDeleteSession={handleDeleteSession}
        onRefresh={fetchSessions}
        deletingSessionId={deletingSessionId}
      />
    </SidebarContainer>
  )
}
