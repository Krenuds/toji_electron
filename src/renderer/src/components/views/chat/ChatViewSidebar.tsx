import React, { useState, useEffect } from 'react'
import { Box, VStack, HStack, Text, Button, Separator, Badge, Spinner } from '@chakra-ui/react'
import { LuTrash2, LuRefreshCw, LuList, LuMessageCircle, LuActivity } from 'react-icons/lu'
import { SidebarContainer } from '../../SidebarContainer'
import { SidebarHeader } from '../../shared/SidebarHeader'
import { SidebarSection } from '../../shared/SidebarSection'
import { StatusBadge } from '../../StatusBadge'
import { SessionsModal } from '../../shared'
import { ProjectSelector } from './ProjectSelector'
import { useServerStatus } from '../../../hooks/useServerStatus'
import { useSession } from '../../../hooks/useSession'
export function ChatViewSidebar(): React.JSX.Element {
  const { status: serverStatus } = useServerStatus()
  const {
    sessions,
    isLoading: isLoadingSessions,
    getCurrentSessionId,
    fetchSessions,
    deleteSession,
    switchSession
  } = useSession()
  const [deletingSessionId, setDeletingSessionId] = useState<string | null>(null)
  const [isSessionsModalOpen, setIsSessionsModalOpen] = useState(false)
  const [switchingSessionId, setSwitchingSessionId] = useState<string | null>(null)
  const [currentSessionId, setCurrentSessionId] = useState<string | undefined>()

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

  const handleSessionClick = async (sessionId: string): Promise<void> => {
    if (sessionId === currentSessionId || switchingSessionId) return

    setSwitchingSessionId(sessionId)
    try {
      const success = await switchSession(sessionId)
      if (success) {
        // Refresh current session ID from backend
        const newCurrentSessionId = await getCurrentSessionId()
        setCurrentSessionId(newCurrentSessionId)
      } else {
        console.error('Failed to switch session:', sessionId)
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
            <Box
              p={2}
              borderRadius="md"
              bg="rgba(255,255,255,0.02)"
              border="1px solid"
              borderColor="app.border"
            >
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
                  cursor="pointer"
                  _hover={{
                    bg:
                      currentSessionId === session.id
                        ? 'rgba(51, 180, 47, 0.15)'
                        : 'rgba(255,255,255,0.05)',
                    borderColor: 'app.accent'
                  }}
                  onClick={() => handleSessionClick(session.id)}
                  opacity={switchingSessionId === session.id ? 0.7 : 1}
                  transition="all 0.2s"
                >
                  <HStack justify="space-between">
                    <VStack align="start" gap={0} flex={1}>
                      <HStack gap={2}>
                        <Text color="app.light" fontSize="xs" fontWeight="medium" lineClamp={1}>
                          {session.title || `Session ${session.id.slice(0, 8)}`}
                        </Text>
                        {switchingSessionId === session.id && (
                          <Spinner size="xs" color="app.accent" />
                        )}
                      </HStack>
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
        currentSessionId={currentSessionId ?? null}
        onDeleteSession={handleDeleteSession}
        onRefresh={fetchSessions}
        deletingSessionId={deletingSessionId}
      />
    </SidebarContainer>
  )
}
