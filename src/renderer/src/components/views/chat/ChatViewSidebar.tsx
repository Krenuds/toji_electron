import React, { useState, useEffect } from 'react'
import { Box, VStack, HStack, Text, Button, Separator, Spinner, IconButton } from '@chakra-ui/react'
import { LuTrash2, LuRefreshCw, LuPlus, LuCheck, LuInfo } from 'react-icons/lu'
import { SidebarContainer } from '../../SidebarContainer'
import { SidebarHeader } from '../../shared/SidebarHeader'
import { SidebarSection } from '../../shared/SidebarSection'
import { SidebarCard } from '../../shared/SidebarCard'
import { StatusBadge } from '../../StatusBadge'
import { ProjectList } from './ProjectList'
import { useChatCoordinatorContext } from '../../../hooks/useChatCoordinatorContext'
import type { Session } from '../../../../../preload/index.d'

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

  const [deletingSessionId, setDeletingSessionId] = useState<string | null>(null)
  const [switchingSessionId, setSwitchingSessionId] = useState<string | null>(null)
  const [workingDirectory, setWorkingDirectory] = useState<string | undefined>()

  // Fetch working directory on mount and when project changes
  useEffect(() => {
    const fetchWorkingDirectory = async (): Promise<void> => {
      try {
        const info = await window.api.toji.getCurrentProject()
        setWorkingDirectory(info.workingDirectory)
      } catch (error) {
        console.error('Failed to get working directory:', error)
      }
    }

    fetchWorkingDirectory()
  }, [currentProject])

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
      <SidebarCard
        key={session.id}
        isActive={isActive}
        isDisabled={isDeleting || isSwitching}
        onClick={() => handleSwitchSession(session.id)}
        position="relative"
        minH="3.5rem"
        maxW="100%"
        overflow="hidden"
      >
        {/* Active badge - top right */}
        {isActive && (
          <Box
            position="absolute"
            top={1}
            right={1}
            px={1.5}
            py={0.5}
            bg="app.accent"
            color="app.dark"
            borderRadius="sm"
            fontSize="2xs"
            fontWeight="bold"
            textTransform="uppercase"
            zIndex={1}
          >
            Active
          </Box>
        )}

        <Box w="calc(100% - 3rem)" pr={2}>
          <VStack align="start" gap={1} w="full">
            {/* Session title - WILL TRUNCATE */}
            <Text
              color="app.light"
              fontSize="sm"
              fontWeight="medium"
              noOfLines={1}
              textOverflow="ellipsis"
              overflow="hidden"
              whiteSpace="nowrap"
              display="block"
              w="full"
            >
              {session.title || `Session ${session.id.slice(0, 8)}`}
            </Text>
            {isSwitching && <Spinner size="xs" color="app.accent" position="absolute" right={2} top={2} />}

            {/* Project name */}
            <Text
              color="app.text"
              fontSize="2xs"
              noOfLines={1}
              textOverflow="ellipsis"
              overflow="hidden"
              whiteSpace="nowrap"
              minH="1rem"
              w="full"
            >
              {session.projectPath ? session.projectPath.split(/[\\/]/).pop() || 'Project' : ' '}
            </Text>
          </VStack>
        </Box>

        {/* Delete button - bottom right */}
        <IconButton
          position="absolute"
          bottom={1}
          right={1}
          aria-label="Delete session"
          size="xs"
          variant="ghost"
          color="white"
          _hover={{
            bg: 'red.500',
            color: 'white'
          }}
          onClick={(e) => {
            e.stopPropagation()
            handleDeleteSession(session.id)
          }}
          disabled={isDeleting}
        >
          {isDeleting ? <Spinner size="xs" color="white" /> : <LuTrash2 size={12} />}
        </IconButton>
      </SidebarCard>
    )
  }

  return (
    <SidebarContainer>
      <VStack align="stretch" gap={4}>
        <SidebarHeader title="Chat with Toji" subtitle="AI-powered coding assistant" />

        <Separator borderColor="app.border" />

        {/* Project Selection */}
        <ProjectList />

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
    </SidebarContainer>
  )
}
