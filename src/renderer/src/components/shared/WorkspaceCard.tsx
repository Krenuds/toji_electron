import React, { useState, useCallback } from 'react'
import {
  Card,
  HStack,
  VStack,
  Text,
  Badge,
  Button,
  Box,
  Collapsible,
  IconButton
} from '@chakra-ui/react'
import {
  LuFolder,
  LuMessageSquare,
  LuClock,
  LuExternalLink,
  LuFolderOpen,
  LuChevronDown,
  LuChevronRight,
  LuSettings,
  LuHash
} from 'react-icons/lu'
import { useAppView } from '../../hooks/useAppView'
import { useWorkspace } from '../../hooks/useWorkspace'
import { useWorkspaceSettings } from '../../hooks/useWorkspaceSettings'
import type { Session } from '../../../../main/api'

interface WorkspaceCardProps {
  path: string
  name: string
  sessionCount: number
  lastActivity: Date | null
  isCurrent?: boolean
  onOpenDirectory: (path: string) => Promise<void>
}

export function WorkspaceCard({
  path,
  name,
  sessionCount,
  lastActivity,
  isCurrent = false,
  onOpenDirectory
}: WorkspaceCardProps): React.JSX.Element {
  const { setActiveView } = useAppView()
  const { changeWorkspace } = useWorkspace()
  const { refreshSettings } = useWorkspaceSettings(path)
  const [isExpanded, setIsExpanded] = useState(false)
  const [sessions, setSessions] = useState<Session[]>([])
  const [isLoadingSessions, setIsLoadingSessions] = useState(false)

  const handleOpenWorkspace = async (): Promise<void> => {
    await changeWorkspace(path)
    setActiveView('chat')
  }

  const handleToggleExpanded = useCallback(async () => {
    if (!isExpanded && sessionCount > 0 && sessions.length === 0) {
      // Fetch sessions when expanding for the first time
      setIsLoadingSessions(true)
      try {
        const workspaceSessions = await window.api.core.getSessionsForWorkspace(path)
        setSessions(workspaceSessions)
      } catch (error) {
        console.error('Failed to fetch sessions:', error)
      } finally {
        setIsLoadingSessions(false)
      }
    }
    setIsExpanded(!isExpanded)
  }, [isExpanded, sessionCount, sessions.length, path])

  const handleOpenSession = async (sessionId: string): Promise<void> => {
    // First change to this workspace
    await changeWorkspace(path)
    // TODO: In the future, also switch to the specific session
    console.log(`Opening session ${sessionId} in workspace ${path}`)
    setActiveView('chat')
  }

  const handleSettingsClick = (): void => {
    // Stub for now - will open settings UI in the future
    console.log(`[WorkspaceCard] Settings clicked for workspace: ${path}`)
    refreshSettings() // This will also log (it's a stub)
  }

  const formatLastActivity = (date: Date | null): string => {
    if (!date) return 'Never'
    const now = new Date()
    const diffMs = now.getTime() - date.getTime()
    const diffHours = Math.floor(diffMs / (1000 * 60 * 60))
    const diffDays = Math.floor(diffMs / (1000 * 60 * 60 * 24))

    if (diffHours < 1) return 'Just now'
    if (diffHours < 24) return `${diffHours} hour${diffHours > 1 ? 's' : ''} ago`
    if (diffDays < 7) return `${diffDays} day${diffDays > 1 ? 's' : ''} ago`
    return date.toLocaleDateString()
  }

  const formatSessionDate = (session: Session): string => {
    const date = session.time?.created ? new Date(session.time.created) : null
    if (!date) return 'Unknown'
    return (
      date.toLocaleDateString() +
      ' ' +
      date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
    )
  }

  return (
    <Card.Root
      bg={isCurrent ? 'rgba(51,180,47,0.05)' : 'app.dark'}
      border="1px solid"
      borderColor={isCurrent ? 'app.accent' : 'app.border'}
      _hover={{ borderColor: isCurrent ? 'app.accent' : 'rgba(255,255,255,0.2)' }}
      transition="border-color 0.2s"
    >
      <Card.Body>
        <VStack align="stretch" gap={3}>
          {/* Header */}
          <HStack justify="space-between">
            <HStack gap={2}>
              <LuFolder size={18} color={isCurrent ? '#33b42f' : '#808080'} />
              <Text color="app.light" fontSize="md" fontWeight="semibold" lineClamp={1}>
                {name}
              </Text>
            </HStack>
            <HStack gap={1}>
              {isCurrent && (
                <Badge size="sm" colorPalette="green">
                  Current
                </Badge>
              )}
              {/* Settings gear icon */}
              <IconButton
                variant="ghost"
                size="sm"
                onClick={handleSettingsClick}
                aria-label="Workspace settings"
                title="Workspace settings"
              >
                <LuSettings size={16} color="#808080" />
              </IconButton>
            </HStack>
          </HStack>

          {/* Path */}
          <Text color="app.text" fontSize="xs" lineClamp={1} opacity={0.8}>
            {path}
          </Text>

          {/* Stats */}
          <HStack gap={4}>
            {sessionCount > 0 && (
              <Button
                variant="ghost"
                size="xs"
                p={0}
                height="auto"
                onClick={handleToggleExpanded}
                gap={1}
              >
                {isExpanded ? <LuChevronDown size={12} /> : <LuChevronRight size={12} />}
                <LuMessageSquare size={14} color="#808080" />
                <Text color="app.text" fontSize="xs">
                  {sessionCount} session{sessionCount !== 1 ? 's' : ''}
                </Text>
              </Button>
            )}
            {sessionCount === 0 && (
              <HStack gap={1}>
                <LuMessageSquare size={14} color="#808080" />
                <Text color="app.text" fontSize="xs">
                  No sessions
                </Text>
              </HStack>
            )}
            <HStack gap={1}>
              <LuClock size={14} color="#808080" />
              <Text color="app.text" fontSize="xs">
                {formatLastActivity(lastActivity)}
              </Text>
            </HStack>
          </HStack>

          {/* Expandable Sessions List */}
          {sessionCount > 0 && (
            <Collapsible.Root open={isExpanded}>
              <Collapsible.Content>
                <Box borderTop="1px solid" borderColor="app.border" pt={2} mt={1}>
                  {isLoadingSessions && (
                    <Text color="app.text" fontSize="xs">
                      Loading sessions...
                    </Text>
                  )}
                  {!isLoadingSessions && sessions.length > 0 && (
                    <VStack align="stretch" gap={1}>
                      {sessions.map((session) => (
                        <Box
                          key={session.id}
                          p={2}
                          bg="rgba(255,255,255,0.02)"
                          borderRadius="md"
                          _hover={{ bg: 'rgba(255,255,255,0.05)' }}
                          cursor="pointer"
                          onClick={() => handleOpenSession(session.id)}
                        >
                          <HStack justify="space-between" fontSize="xs">
                            <HStack gap={1}>
                              <LuHash size={12} color="#808080" />
                              <Text color="app.light" fontFamily="mono" fontSize="xs">
                                {session.id.slice(0, 8)}
                              </Text>
                            </HStack>
                            <Text color="app.text" fontSize="xs">
                              {formatSessionDate(session)}
                            </Text>
                          </HStack>
                          {session.title && (
                            <Text color="app.text" fontSize="xs" mt={1} opacity={0.8}>
                              {session.title}
                            </Text>
                          )}
                        </Box>
                      ))}
                    </VStack>
                  )}
                  {!isLoadingSessions && sessions.length === 0 && sessionCount > 0 && (
                    <Text color="app.text" fontSize="xs">
                      Unable to load sessions
                    </Text>
                  )}
                </Box>
              </Collapsible.Content>
            </Collapsible.Root>
          )}

          {/* Actions */}
          <HStack gap={2} mt={1}>
            <Button
              size="sm"
              variant="subtle"
              colorPalette="green"
              onClick={handleOpenWorkspace}
              flex={1}
            >
              <LuFolderOpen size={14} style={{ marginRight: 6 }} />
              Open in Chat
            </Button>
            <Button
              size="sm"
              variant="ghost"
              color="app.text"
              onClick={() => onOpenDirectory(path)}
              aria-label="Browse folder"
            >
              <LuExternalLink size={14} />
            </Button>
          </HStack>
        </VStack>
      </Card.Body>
    </Card.Root>
  )
}
