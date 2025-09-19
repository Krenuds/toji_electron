import React from 'react'
import {
  Box,
  VStack,
  HStack,
  Text,
  Button,
  Badge,
  Spinner,
  Separator,
  DialogRoot,
  DialogBody,
  DialogCloseTrigger,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogBackdrop
} from '@chakra-ui/react'
import { LuTrash2, LuRefreshCw, LuMessageCircle } from 'react-icons/lu'
import type { Session } from '../../../../main/api'

interface SessionsModalProps {
  isOpen: boolean
  onClose: () => void
  sessions: Session[]
  isLoading: boolean
  currentSessionId: string | null
  onDeleteSession: (sessionId: string) => Promise<void>
  onRefresh: () => Promise<void>
  deletingSessionId: string | null
}

export function SessionsModal({
  isOpen,
  onClose,
  sessions,
  isLoading,
  currentSessionId,
  onDeleteSession,
  onRefresh,
  deletingSessionId
}: SessionsModalProps): React.JSX.Element {
  const formatDate = (timestamp: number): string => {
    return new Date(timestamp).toLocaleString()
  }

  return (
    <DialogRoot open={isOpen} onOpenChange={(e) => !e.open && onClose()} size="xl">
      <DialogBackdrop bg="rgba(0, 0, 0, 0.8)" />
      <DialogContent bg="app.dark" borderColor="app.border" border="1px solid" maxH="80vh">
        <DialogHeader>
          <DialogTitle>
            <HStack justify="space-between">
              <HStack gap={2}>
                <LuMessageCircle size={20} color="#51b447" />
                <Text color="app.light" fontSize="lg" fontWeight="bold">
                  All Sessions
                </Text>
                <Badge size="sm" colorPalette="blue" variant="subtle">
                  {sessions.length}
                </Badge>
              </HStack>
              <Button
                size="sm"
                variant="ghost"
                color="app.text"
                _hover={{ color: 'app.light', bg: 'rgba(255,255,255,0.05)' }}
                onClick={onRefresh}
                disabled={isLoading}
              >
                <LuRefreshCw size={14} />
              </Button>
            </HStack>
          </DialogTitle>
          <DialogCloseTrigger color="app.text" _hover={{ color: 'app.light' }} />
        </DialogHeader>

        <DialogBody pb={6}>
          {isLoading ? (
            <VStack py={8} gap={4}>
              <Spinner color="app.accent" size="lg" />
              <Text color="app.text" fontSize="sm">
                Loading sessions...
              </Text>
            </VStack>
          ) : sessions.length === 0 ? (
            <VStack py={8} gap={4}>
              <LuMessageCircle size={48} color="#808080" />
              <Text color="app.text" fontSize="sm" textAlign="center">
                No sessions found
              </Text>
              <Text color="app.text" fontSize="xs" textAlign="center">
                Start a new chat to create your first session
              </Text>
            </VStack>
          ) : (
            <Box maxH="60vh" overflowY="auto" pr={2}>
              <VStack gap={3} align="stretch">
                {sessions.map((session, index) => (
                  <Box key={session.id}>
                    <Box
                      p={4}
                      borderRadius="md"
                      bg={
                        currentSessionId === session.id
                          ? 'rgba(51, 180, 47, 0.1)'
                          : 'rgba(255,255,255,0.02)'
                      }
                      border="1px solid"
                      borderColor={currentSessionId === session.id ? 'app.accent' : 'app.border'}
                      position="relative"
                      _hover={{ bg: 'rgba(255,255,255,0.05)' }}
                    >
                      <VStack align="stretch" gap={3}>
                        <HStack justify="space-between">
                          <VStack align="start" gap={1} flex={1}>
                            <HStack gap={2}>
                              <Text color="app.light" fontSize="sm" fontWeight="medium">
                                {session.title || `Session ${session.id.slice(0, 8)}`}
                              </Text>
                              {currentSessionId === session.id && (
                                <Badge size="xs" colorPalette="green" variant="subtle">
                                  Active
                                </Badge>
                              )}
                            </HStack>
                            <Text color="app.text" fontSize="xs" fontFamily="mono">
                              ID: {session.id}
                            </Text>
                          </VStack>
                          <Button
                            size="sm"
                            variant="ghost"
                            color="app.text"
                            _hover={{ color: 'red.400', bg: 'rgba(255,0,0,0.1)' }}
                            onClick={() => onDeleteSession(session.id)}
                            disabled={deletingSessionId === session.id}
                            aria-label="Delete session"
                          >
                            {deletingSessionId === session.id ? (
                              <Spinner size="sm" color="red.400" />
                            ) : (
                              <LuTrash2 size={16} />
                            )}
                          </Button>
                        </HStack>

                        {/* Session metadata */}
                        <VStack align="stretch" gap={2}>
                          {session.version && (
                            <HStack justify="space-between">
                              <Text color="app.text" fontSize="xs">
                                Version:
                              </Text>
                              <Badge size="xs" variant="outline" colorPalette="gray">
                                {session.version}
                              </Badge>
                            </HStack>
                          )}
                          {session.projectID && (
                            <HStack justify="space-between">
                              <Text color="app.text" fontSize="xs">
                                Project ID:
                              </Text>
                              <Text color="app.text" fontSize="xs" fontFamily="mono">
                                {session.projectID.slice(0, 12)}...
                              </Text>
                            </HStack>
                          )}
                          {session.directory && (
                            <HStack justify="space-between">
                              <Text color="app.text" fontSize="xs">
                                Directory:
                              </Text>
                              <Text color="app.text" fontSize="xs" fontFamily="mono" lineClamp={1}>
                                {session.directory.split(/[\\/]/).pop() || session.directory}
                              </Text>
                            </HStack>
                          )}
                          {session.time && (
                            <VStack align="stretch" gap={1}>
                              <HStack justify="space-between">
                                <Text color="app.text" fontSize="xs">
                                  Created:
                                </Text>
                                <Text color="app.text" fontSize="xs">
                                  {formatDate(session.time.created)}
                                </Text>
                              </HStack>
                              {session.time.updated &&
                                session.time.updated !== session.time.created && (
                                  <HStack justify="space-between">
                                    <Text color="app.text" fontSize="xs">
                                      Updated:
                                    </Text>
                                    <Text color="app.text" fontSize="xs">
                                      {formatDate(session.time.updated)}
                                    </Text>
                                  </HStack>
                                )}
                            </VStack>
                          )}
                        </VStack>
                      </VStack>
                    </Box>
                    {index < sessions.length - 1 && <Separator borderColor="app.border" my={0} />}
                  </Box>
                ))}
              </VStack>
            </Box>
          )}
        </DialogBody>
      </DialogContent>
    </DialogRoot>
  )
}
