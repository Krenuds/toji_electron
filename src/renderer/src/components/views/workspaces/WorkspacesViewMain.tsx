import React from 'react'
import { Box, VStack, HStack, Text, Grid, Card, Badge, Button } from '@chakra-ui/react'
import { LuMessageSquare, LuClock, LuZap, LuRefreshCw, LuFolder, LuTrash2 } from 'react-icons/lu'
import { useSession } from '../../../hooks/useSession'
import { useWorkspace } from '../../../hooks/useWorkspace'
import { WorkspaceTracker } from '../../WorkspaceTracker'
import { MetricCard } from '../../shared'

export function WorkspacesViewMain(): React.JSX.Element {
  const { sessions, isLoading, fetchSessions, deleteSession, currentSessionId } = useSession()
  const { changeWorkspace } = useWorkspace()

  // Calculate session stats
  const totalSessions = sessions.length
  const recentSessions = sessions.filter((s) => {
    const lastUpdated = s.time?.updated || s.time?.created || 0
    const dayAgo = Date.now() - 24 * 60 * 60 * 1000
    return lastUpdated > dayAgo
  }).length

  // Helper to format time
  const formatTime = (timestamp: number | undefined): string => {
    if (!timestamp) return 'Unknown'
    const date = new Date(timestamp)
    const now = new Date()
    const diffMs = now.getTime() - date.getTime()
    const diffHours = Math.floor(diffMs / (1000 * 60 * 60))
    const diffDays = Math.floor(diffMs / (1000 * 60 * 60 * 24))

    if (diffHours < 1) return 'Just now'
    if (diffHours < 24) return `${diffHours} hour${diffHours > 1 ? 's' : ''} ago`
    if (diffDays < 7) return `${diffDays} day${diffDays > 1 ? 's' : ''} ago`
    return date.toLocaleDateString()
  }

  return (
    <VStack align="stretch" gap={6}>
      {/* Header */}
      <Box>
        <Text color="app.light" fontSize="2xl" fontWeight="bold" mb={2}>
          Sessions & Workspaces
        </Text>
        <Text color="app.text" fontSize="sm">
          View your recent AI conversation sessions and their workspaces.
        </Text>
      </Box>

      {/* Stats Cards */}
      <Grid templateColumns="repeat(auto-fit, minmax(200px, 1fr))" gap={4}>
        <MetricCard
          title="Total Sessions"
          value={totalSessions}
          description="All conversations"
          icon={<LuMessageSquare size={16} color="#808080" />}
          valueSize="xl"
        />

        <MetricCard
          title="Recent Sessions"
          value={recentSessions}
          description="Last 24 hours"
          icon={<LuZap size={16} color="#808080" />}
          valueSize="xl"
          variant={recentSessions > 0 ? 'accent' : 'default'}
        />

        <MetricCard
          title="Unique Workspaces"
          value={new Set(sessions.map((s) => s.directory)).size}
          description="Different folders"
          icon={<LuFolder size={16} color="#808080" />}
          valueSize="xl"
        />

        <MetricCard
          title="Avg Session Age"
          value={
            sessions.length > 0
              ? formatTime(
                  sessions.reduce((sum, s) => sum + (s.time?.created || 0), 0) / sessions.length
                )
              : 'N/A'
          }
          description="Typical session"
          icon={<LuClock size={16} color="#808080" />}
          valueSize="md"
        />
      </Grid>

      {/* Session Content */}
      <Grid templateColumns="2fr 1fr" gap={6}>
        {/* Recent Sessions List */}
        <Card.Root bg="app.dark" border="1px solid" borderColor="app.border">
          <Card.Header>
            <HStack justify="space-between">
              <Text color="app.light" fontSize="lg" fontWeight="semibold">
                Recent Sessions
              </Text>
              <HStack gap={2}>
                <Badge colorPalette="purple" variant="subtle">
                  {totalSessions} Total
                </Badge>
                <Button
                  size="xs"
                  variant="ghost"
                  color="app.text"
                  _hover={{ color: 'app.light' }}
                  onClick={fetchSessions}
                  disabled={isLoading}
                >
                  <LuRefreshCw size={12} />
                </Button>
              </HStack>
            </HStack>
          </Card.Header>
          <Card.Body>
            <VStack gap={3} align="stretch">
              {isLoading ? (
                <Text color="app.text" fontSize="sm" textAlign="center" py={4}>
                  Loading sessions...
                </Text>
              ) : sessions.length === 0 ? (
                <Box textAlign="center" py={8}>
                  <LuMessageSquare size={32} color="#404040" style={{ margin: '0 auto' }} />
                  <Text color="app.text" fontSize="sm" mt={3}>
                    No sessions found
                  </Text>
                  <Text color="app.text" fontSize="xs" mt={1}>
                    Start a new conversation to create a session
                  </Text>
                </Box>
              ) : (
                sessions.slice(0, 10).map((session) => {
                  const folderName = session.directory?.split(/[\\/]/).pop() || 'Unknown'
                  const isActive = session.id === currentSessionId
                  const lastUpdated = session.time?.updated || session.time?.created || 0

                  return (
                    <Box
                      key={session.id}
                      p={3}
                      borderRadius="md"
                      bg={isActive ? 'rgba(51,180,47,0.05)' : 'rgba(255,255,255,0.02)'}
                      border="1px solid"
                      borderColor={isActive ? 'app.accent' : 'app.border'}
                      cursor="pointer"
                      _hover={{ bg: isActive ? 'rgba(51,180,47,0.08)' : 'rgba(255,255,255,0.04)' }}
                      onClick={async () => {
                        if (!isActive && session.directory) {
                          await changeWorkspace(session.directory)
                        }
                      }}
                    >
                      <HStack justify="space-between" mb={2}>
                        <VStack align="start" gap={0.5}>
                          <Text color="app.light" fontSize="sm" fontWeight="medium" lineClamp={1}>
                            {session.title || `Session ${session.id.slice(4, 10)}`}
                          </Text>
                          <HStack gap={2}>
                            <Text color="app.text" fontSize="xs">
                              <LuFolder size={10} style={{ display: 'inline', marginRight: 4 }} />
                              {folderName}
                            </Text>
                            <Text color="app.text" fontSize="xs">
                              <LuClock size={10} style={{ display: 'inline', marginRight: 4 }} />
                              {formatTime(lastUpdated)}
                            </Text>
                          </HStack>
                        </VStack>
                        <HStack gap={1}>
                          {isActive && (
                            <Badge colorPalette="green" size="sm">
                              Active
                            </Badge>
                          )}
                          <Button
                            size="xs"
                            variant="ghost"
                            color="app.text"
                            _hover={{ color: 'red.500' }}
                            onClick={async (e) => {
                              e.stopPropagation()
                              await deleteSession(session.id)
                            }}
                          >
                            <LuTrash2 size={12} />
                          </Button>
                        </HStack>
                      </HStack>
                      <Text color="app.text" fontSize="xs" lineClamp={1} opacity={0.7}>
                        {session.directory || 'No directory'}
                      </Text>
                    </Box>
                  )
                })
              )}
            </VStack>
          </Card.Body>
        </Card.Root>

        {/* Workspace Tracker - Shows workspace collections */}
        <WorkspaceTracker />
      </Grid>
    </VStack>
  )
}
