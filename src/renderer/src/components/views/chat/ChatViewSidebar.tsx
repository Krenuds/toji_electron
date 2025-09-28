import React, { useState } from 'react'
import { Box, VStack, HStack, Text, Button, Separator, Spinner, IconButton } from '@chakra-ui/react'
import { LuTrash2, LuRefreshCw, LuList, LuPlus, LuCheck, LuInfo } from 'react-icons/lu'
import { SidebarContainer } from '../../SidebarContainer'
import { SidebarHeader } from '../../shared/SidebarHeader'
import { SidebarSection } from '../../shared/SidebarSection'
import { StatusBadge } from '../../StatusBadge'
import { SessionsModal } from '../../shared'
import { ProjectSelector } from './ProjectSelector'
import { useChatCoordinatorContext } from '../../../hooks/useChatCoordinatorContext'
import type { Session } from '../../../../preload/index.d'

export function ChatViewSidebar(): React.JSX.Element {
  const {
    currentProject,
    sessions,
    currentSessionId,
    serverStatus,
    isLoadingSessions,
    sessionError,
    createSession,
    deleteSession,
    switchSession,
    refreshAll,
    clearErrors
  } = useChatCoordinatorContext()

  const [isSessionsModalOpen, setIsSessionsModalOpen] = useState(false)
  const [deletingSessionId, setDeletingSessionId] = useState<string | null>(null)
  const [switchingSessionId, setSwitchingSessionId] = useState<string | null>(null)

  const handleDeleteSession = async (sessionId: string): Promise<void> => {
    if (deletingSessionId) return
    setDeletingSessionId(sessionId)
    try {
      await deleteSession(sessionId)
    } finally {
      setDeletingSessionId(null)
    }
  }

  const handleSwitchSession = async (sessionId: string): Promise<void> => {
    if (switchingSessionId || sessionId === currentSessionId) return
    setSwitchingSessionId(sessionId)
    try {
      await switchSession(sessionId)
    } finally {
      setSwitchingSessionId(null)
    }
  }

  const handleCreateSession = async (): Promise<void> => {
    if (!currentProject) return
    const sessionName = `Session ${new Date().toLocaleTimeString()}`
    await createSession(sessionName)
  }

  const renderSessionItem = (session: Session): React.JSX.Element => {
    const isActive = currentSessionId === session.id
    const isDeleting = deletingSessionId === session.id
    const isSwitching = switchingSessionId === session.id

    return (
      <Box
        key={session.id}
        p={2}
        borderRadius="md"
        bg={isActive ? 'green.800' : 'app.dark'}
        border="1px solid"
        borderColor={isActive ? 'app.accent' : 'app.border'}
        position="relative"
        cursor={isDeleting ? 'not-allowed' : 'pointer'}
        opacity={isDeleting || isSwitching ? 0.6 : 1}
        _hover={
          !isDeleting && !isSwitching
            ? {
                bg: isActive ? 'green.800' : 'app.medium',
                borderColor: 'app.accent'
              }
            : {}
        }
        onClick={() => !isDeleting && !isSwitching && handleSwitchSession(session.id)}
        transition="all 0.2s"
      >
        <VStack align="start" gap={0} w="full">
          <HStack justify="space-between" w="full">
            <HStack gap={2} flex={1}>
              <Text color="app.light" fontSize="xs" fontWeight="medium" lineClamp={1} flex={1}>
                {session.title || `Session ${session.id.slice(0, 8)}`}
              </Text>
              {isSwitching && <Spinner size="xs" color="app.accent" />}
            </HStack>

            {/* Actions */}
            <HStack gap={1}>
              {isActive && (
                <Box
                  as="span"
                  px={1.5}
                  py={0.5}
                  bg="app.accent"
                  color="app.dark"
                  borderRadius="sm"
                  fontSize="2xs"
                  fontWeight="bold"
                  textTransform="uppercase"
                >
                  Active
                </Box>
              )}
              <IconButton
                aria-label="Delete session"
                size="xs"
                variant="ghost"
                colorPalette="red"
                onClick={(e) => {
                  e.stopPropagation()
                  handleDeleteSession(session.id)
                }}
                disabled={isDeleting}
              >
                {isDeleting ? <Spinner size="xs" /> : <LuTrash2 size={12} />}
              </IconButton>
            </HStack>
          </HStack>

          {session.projectPath && (
            <Text color="app.text" fontSize="2xs" lineClamp={1}>
              {session.projectPath.split(/[\\/]/).pop() || 'Project'}
            </Text>
          )}
        </VStack>
      </Box>
    )
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
          <Box p={2} borderRadius="md" bg="app.dark" border="1px solid" borderColor="app.border">
            <HStack justify="space-between">
              <Text color="app.light" fontSize="xs" fontWeight="medium">
                Status
              </Text>
              <StatusBadge
                status={
                  serverStatus === 'online'
                    ? 'running'
                    : serverStatus === 'initializing'
                      ? 'starting'
                      : 'stopped'
                }
              />
            </HStack>
          </Box>
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
                onClick={handleCreateSession}
                disabled={!currentProject || isLoadingSessions}
                title={currentProject ? 'New session' : 'Select a project first'}
              >
                <LuPlus size={12} />
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
                onClick={refreshAll}
                disabled={isLoadingSessions}
                title="Refresh"
              >
                <LuRefreshCw size={12} />
              </Button>
              {sessionError && (
                <Button
                  size="xs"
                  variant="ghost"
                  colorPalette="red"
                  onClick={clearErrors}
                  title="Clear error"
                >
                  <LuInfo size={12} />
                </Button>
              )}
            </HStack>
          }
        >
          <VStack gap={2} align="stretch">
            {!currentProject ? (
              <Text color="app.text" fontSize="2xs" textAlign="center" py={2}>
                Select a project to view sessions
              </Text>
            ) : sessionError ? (
              <VStack gap={2} py={2}>
                <Text color="red.400" fontSize="2xs" textAlign="center">
                  {sessionError}
                </Text>
                <Button
                  size="xs"
                  variant="ghost"
                  colorPalette="green"
                  onClick={() => {
                    clearErrors()
                    refreshAll()
                  }}
                >
                  <LuRefreshCw size={12} />
                  Retry
                </Button>
              </VStack>
            ) : isLoadingSessions ? (
              <HStack justify="center" py={3}>
                <Spinner size="sm" color="app.accent" />
                <Text color="app.text" fontSize="2xs">
                  Loading sessions...
                </Text>
              </HStack>
            ) : sessions.length === 0 ? (
              <Text color="app.text" fontSize="2xs" textAlign="center" py={2}>
                No sessions yet. Click + to create one.
              </Text>
            ) : (
              sessions.map(renderSessionItem)
            )}
          </VStack>
        </SidebarSection>

        <Separator borderColor="app.border" />

        {/* Quick Stats */}
        <SidebarSection title="Session Info">
          <VStack gap={2} align="stretch">
            <HStack justify="space-between">
              <Text color="app.text" fontSize="2xs">
                Total Sessions
              </Text>
              <Text color="app.light" fontSize="xs" fontWeight="medium">
                {sessions.length}
              </Text>
            </HStack>
            {currentSessionId && (
              <HStack justify="space-between">
                <Text color="app.text" fontSize="2xs">
                  Current Session
                </Text>
                <Text color="green.400" fontSize="2xs" fontWeight="medium">
                  <LuCheck size={10} style={{ display: 'inline' }} /> Active
                </Text>
              </HStack>
            )}
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
        onRefresh={refreshAll}
        deletingSessionId={deletingSessionId}
      />
    </SidebarContainer>
  )
}
