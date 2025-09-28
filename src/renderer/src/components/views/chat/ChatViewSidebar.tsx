import React, { useState, useEffect } from 'react'
import { Box, VStack, HStack, Text, Button, Separator, Spinner } from '@chakra-ui/react'
import { LuTrash2, LuRefreshCw, LuList, LuMessageCircle, LuActivity, LuPlus } from 'react-icons/lu'
import { SidebarContainer } from '../../SidebarContainer'
import { SidebarHeader } from '../../shared/SidebarHeader'
import { SidebarSection } from '../../shared/SidebarSection'
import { StatusBadge } from '../../StatusBadge'
import { SessionsModal } from '../../shared'
import { ProjectSelector } from './ProjectSelector'
import { useServerStatus } from '../../../hooks/useServerStatus'
import { useSession } from '../../../hooks/useSession'
import { useProjects } from '../../../hooks/useProjects'
export function ChatViewSidebar(): React.JSX.Element {
  const { status: serverStatus } = useServerStatus()
  const { currentProject, switchProject } = useProjects()
  const {
    sessions,
    isLoading: isLoadingSessions,
    getCurrentSessionId,
    fetchSessions,
    deleteSession,
    createSession,
    switchSession
  } = useSession()
  const [deletingSessionId, setDeletingSessionId] = useState<string | null>(null)
  const [isSessionsModalOpen, setIsSessionsModalOpen] = useState(false)
  const [switchingSessionId, setSwitchingSessionId] = useState<string | null>(null)
  const [currentSessionId, setCurrentSessionId] = useState<string | undefined>()
  const [isCreatingSession, setIsCreatingSession] = useState(false)

  // Fetch sessions when project changes
  useEffect(() => {
    if (currentProject) {
      fetchSessions()
    }
  }, [currentProject, fetchSessions])

  // Fetch current session ID when sessions change
  useEffect(() => {
    const fetchCurrentSessionId = async (): Promise<void> => {
      try {
        const sessionId = await getCurrentSessionId()
        setCurrentSessionId(sessionId)
      } catch (error) {
        console.error('Failed to get current session ID:', error)
        setCurrentSessionId(undefined)
      }
    }

    fetchCurrentSessionId()
  }, [sessions, getCurrentSessionId])

  const handleDeleteSession = async (sessionId: string): Promise<void> => {
    setDeletingSessionId(sessionId)
    const success = await deleteSession(sessionId)
    if (success) {
      // Optionally show success feedback
      console.log('Session deleted successfully')
    }
    setDeletingSessionId(null)
  }

  const handleSessionClick = async (session: {
    id: string
    projectPath?: string
  }): Promise<void> => {
    if (session.id === currentSessionId || switchingSessionId) return

    setSwitchingSessionId(session.id)
    try {
      // If session is from a different project, switch project first
      if (session.projectPath && session.projectPath !== currentProject?.path) {
        console.log('Switching to project:', session.projectPath)
        await switchProject(session.projectPath)
        // Small delay to let project switch complete
        await new Promise((resolve) => setTimeout(resolve, 100))
      }

      const success = await switchSession(session.id)
      if (success) {
        // Refresh current session ID from backend
        const newCurrentSessionId = await getCurrentSessionId()
        setCurrentSessionId(newCurrentSessionId)
      } else {
        console.error('Failed to switch session:', session.id)
      }
    } catch (error) {
      console.error('Error switching session:', error)
    } finally {
      setSwitchingSessionId(null)
    }
  }

  return (
    <SidebarContainer>
      <VStack align="stretch" gap={4}>
        <SidebarHeader title="Chat with Toji" subtitle="AI-powered coding assistant" />

        <Separator borderColor="app.border" />

        {/* Project Selection */}
        <ProjectSelector />

        {/* Server Status */}
        <SidebarSection title="Server Status">
          <VStack align="stretch" gap={3}>
            <Box p={2} borderRadius="md" bg="app.dark" border="1px solid" borderColor="app.border">
              <HStack justify="space-between">
                <Text color="app.light" fontSize="xs" fontWeight="medium">
                  Status
                </Text>
                <StatusBadge status={serverStatus.isRunning ? 'running' : 'stopped'} />
              </HStack>
            </Box>
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
                colorPalette="green"
                onClick={async () => {
                  if (!currentProject) {
                    console.warn('No project selected')
                    return
                  }
                  setIsCreatingSession(true)
                  try {
                    const newSession = await createSession(
                      `Session ${new Date().toLocaleTimeString()}`
                    )
                    if (newSession) {
                      await fetchSessions()
                      // Optionally switch to the new session
                      if (newSession.id) {
                        await switchSession(newSession.id)
                        setCurrentSessionId(newSession.id)
                      }
                    }
                  } catch (error) {
                    console.error('Failed to create session:', error)
                  } finally {
                    setIsCreatingSession(false)
                  }
                }}
                disabled={!currentProject || isCreatingSession}
                title={currentProject ? 'New session' : 'Select a project first'}
              >
                {isCreatingSession ? <Spinner size="xs" /> : <LuPlus size={12} />}
              </Button>
              <Button
                size="xs"
                variant="ghost"
                colorPalette="gray"
                onClick={() => setIsSessionsModalOpen(true)}
                title="View all sessions"
              >
                <LuList size={12} />
              </Button>
              <Button
                size="xs"
                variant="ghost"
                colorPalette="gray"
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
            {!currentProject ? (
              <Text color="app.text" fontSize="2xs" textAlign="center" py={2}>
                Select a project to view sessions
              </Text>
            ) : isLoadingSessions ? (
              <Text color="app.text" fontSize="2xs" textAlign="center" py={2}>
                Loading sessions...
              </Text>
            ) : sessions.length === 0 ? (
              <Text color="app.text" fontSize="2xs" textAlign="center" py={2}>
                No sessions yet. Click + to create one.
              </Text>
            ) : (
              sessions.map((session) => (
                <Box
                  key={session.id}
                  p={2}
                  borderRadius="md"
                  bg={currentSessionId === session.id ? 'green.800' : 'app.dark'}
                  border="1px solid"
                  borderColor={currentSessionId === session.id ? 'app.accent' : 'app.border'}
                  position="relative"
                  cursor="pointer"
                  _hover={{
                    bg: currentSessionId === session.id ? 'green.800' : 'app.medium',
                    borderColor: 'app.accent'
                  }}
                  onClick={() => void handleSessionClick(session)}
                  opacity={switchingSessionId === session.id ? 0.7 : 1}
                  transition="all 0.2s"
                >
                  <VStack align="start" gap={0} w="full">
                    <HStack gap={2}>
                      <Text color="app.light" fontSize="xs" fontWeight="medium" lineClamp={1}>
                        {session.title || `Session ${session.id.slice(0, 8)}`}
                      </Text>
                      {switchingSessionId === session.id && (
                        <Spinner size="xs" color="app.accent" />
                      )}
                    </HStack>
                    <Text color="app.text" fontSize="2xs">
                      {session.projectPath
                        ? session.projectPath.split(/[\\/]/).pop() || 'Root'
                        : 'No project'}
                    </Text>
                  </VStack>
                  {/* Trash icon positioned in bottom right */}
                  <Box
                    position="absolute"
                    bottom="2px"
                    right="2px"
                    color="app.dark"
                    cursor={deletingSessionId === session.id ? 'not-allowed' : 'pointer'}
                    opacity={deletingSessionId === session.id ? 0.3 : 0.5}
                    _hover={
                      deletingSessionId === session.id ? {} : { opacity: 1, color: 'red.500' }
                    }
                    onClick={(e) => {
                      e.stopPropagation()
                      if (deletingSessionId !== session.id) {
                        void handleDeleteSession(session.id)
                      }
                    }}
                    aria-label="Delete session"
                  >
                    <LuTrash2 size={12} />
                  </Box>
                  {currentSessionId === session.id && (
                    <Box
                      position="absolute"
                      top={1}
                      right={1}
                      px={2}
                      py={0.5}
                      bg="app.accent"
                      color="app.dark"
                      borderRadius="md"
                      fontSize="2xs"
                      fontWeight="medium"
                      textTransform="uppercase"
                    >
                      Active
                    </Box>
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
        currentSessionId={currentSessionId ?? null}
        onDeleteSession={handleDeleteSession}
        onRefresh={fetchSessions}
        deletingSessionId={deletingSessionId}
      />
    </SidebarContainer>
  )
}
