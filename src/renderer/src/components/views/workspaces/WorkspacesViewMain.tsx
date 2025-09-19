import React from 'react'
import { Box, VStack, HStack, Text, Grid, Card, Badge, Button } from '@chakra-ui/react'
import { LuGitBranch, LuClock, LuCode, LuZap, LuRefreshCw, LuFolder } from 'react-icons/lu'
import { useProjects } from '../../../hooks/useProjects'
import { useSession } from '../../../hooks/useSession'
import { WorkspaceTracker } from '../../WorkspaceTracker'

export function WorkspacesViewMain(): React.JSX.Element {
  const { projects, isLoading: isLoadingProjects, fetchProjects } = useProjects()
  const { sessions } = useSession()

  // Calculate real stats
  const activeProjects = projects.length
  const activeSessions = sessions.length

  return (
    <VStack align="stretch" gap={6}>
      {/* Header */}
      <Box>
        <Text color="app.light" fontSize="2xl" fontWeight="bold" mb={2}>
          Workspaces
        </Text>
        <Text color="app.text" fontSize="sm">
          Manage your development workspaces and OpenCode projects.
        </Text>
      </Box>

      {/* Stats Cards */}
      <Grid templateColumns="repeat(auto-fit, minmax(200px, 1fr))" gap={4}>
        <Card.Root bg="app.dark" border="1px solid" borderColor="app.border">
          <Card.Body p={4}>
            <HStack justify="space-between" mb={2}>
              <Text color="app.text" fontSize="sm">
                OpenCode Projects
              </Text>
              <LuCode size={16} color="#808080" />
            </HStack>
            <Text color="app.light" fontSize="2xl" fontWeight="bold">
              {activeProjects}
            </Text>
            <Text color="app.text" fontSize="xs" mt={1}>
              Total in workspace
            </Text>
          </Card.Body>
        </Card.Root>

        <Card.Root bg="app.dark" border="1px solid" borderColor="app.border">
          <Card.Body p={4}>
            <HStack justify="space-between" mb={2}>
              <Text color="app.text" fontSize="sm">
                Active Sessions
              </Text>
              <LuZap size={16} color="#808080" />
            </HStack>
            <Text color="app.light" fontSize="2xl" fontWeight="bold">
              {activeSessions}
            </Text>
            <Text color="app.text" fontSize="xs" mt={1}>
              OpenCode sessions
            </Text>
          </Card.Body>
        </Card.Root>

        <Card.Root bg="app.dark" border="1px solid" borderColor="app.border">
          <Card.Body p={4}>
            <HStack justify="space-between" mb={2}>
              <Text color="app.text" fontSize="sm">
                Recent Sessions
              </Text>
              <LuGitBranch size={16} color="#808080" />
            </HStack>
            <Text color="app.light" fontSize="2xl" fontWeight="bold">
              {
                sessions.filter((s) => {
                  const lastUpdated = s.time?.updated || s.time?.created || 0
                  const dayAgo = Date.now() - 24 * 60 * 60 * 1000
                  return lastUpdated > dayAgo
                }).length
              }
            </Text>
            <Text color="app.text" fontSize="xs" mt={1}>
              Last 24 hours
            </Text>
          </Card.Body>
        </Card.Root>

        <Card.Root bg="app.dark" border="1px solid" borderColor="app.border">
          <Card.Body p={4}>
            <HStack justify="space-between" mb={2}>
              <Text color="app.text" fontSize="sm">
                Total Sessions
              </Text>
              <LuClock size={16} color="#808080" />
            </HStack>
            <Text color="app.light" fontSize="2xl" fontWeight="bold">
              {sessions.length}
            </Text>
            <Text color="app.text" fontSize="xs" mt={1}>
              All time
            </Text>
          </Card.Body>
        </Card.Root>
      </Grid>

      {/* Workspace Content */}
      <Grid templateColumns="2fr 1fr" gap={6}>
        {/* OpenCode Projects List */}
        <Card.Root bg="app.dark" border="1px solid" borderColor="app.border">
          <Card.Header>
            <HStack justify="space-between">
              <Text color="app.light" fontSize="lg" fontWeight="semibold">
                OpenCode Projects
              </Text>
              <HStack gap={2}>
                <Badge colorPalette="green" variant="subtle">
                  {activeProjects} Projects
                </Badge>
                <Button
                  size="xs"
                  variant="ghost"
                  color="app.text"
                  _hover={{ color: 'app.light' }}
                  onClick={fetchProjects}
                  disabled={isLoadingProjects}
                >
                  <LuRefreshCw size={12} />
                </Button>
              </HStack>
            </HStack>
          </Card.Header>
          <Card.Body>
            <VStack gap={4} align="stretch">
              {isLoadingProjects ? (
                <Text color="app.text" fontSize="sm" textAlign="center" py={4}>
                  Loading OpenCode projects...
                </Text>
              ) : projects.length === 0 ? (
                <Box textAlign="center" py={8}>
                  <LuFolder size={32} color="#404040" style={{ margin: '0 auto' }} />
                  <Text color="app.text" fontSize="sm" mt={3}>
                    No OpenCode projects found
                  </Text>
                  <Text color="app.text" fontSize="xs" mt={1}>
                    Initialize OpenCode in a workspace to create projects
                  </Text>
                </Box>
              ) : (
                projects.map((project, index) => (
                  <Box
                    key={project.id || index}
                    p={3}
                    borderRadius="md"
                    bg="rgba(255,255,255,0.02)"
                    border="1px solid"
                    borderColor="app.border"
                  >
                    <HStack justify="space-between" mb={2}>
                      <Text color="app.light" fontSize="sm" fontWeight="medium" lineClamp={1}>
                        {project.id || `Project ${index + 1}`}
                      </Text>
                      <Badge colorPalette="green" size="sm">
                        Active
                      </Badge>
                    </HStack>
                    <Text color="app.text" fontSize="xs" mb={2} lineClamp={2}>
                      {project.worktree || 'No worktree path'}
                    </Text>
                    {project.worktree && (
                      <Badge size="xs" colorPalette="blue" variant="subtle">
                        <LuGitBranch size={10} style={{ marginRight: 4 }} />
                        Git Worktree
                      </Badge>
                    )}
                  </Box>
                ))
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