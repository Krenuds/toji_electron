import React from 'react'
import { Box, VStack, HStack, Text, Grid, Card, Badge, Button } from '@chakra-ui/react'
import { LuGitBranch, LuClock, LuCode, LuZap, LuRefreshCw, LuFolder } from 'react-icons/lu'
import { useProjects } from '../../../hooks/useProjects'
import { useSession } from '../../../hooks/useSession'
import { WorkspaceTracker } from '../../WorkspaceTracker'

export function ProjectsViewMain(): React.JSX.Element {
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
          Projects
        </Text>
        <Text color="app.text" fontSize="sm">
          Manage your development projects and track coding progress.
        </Text>
      </Box>

      {/* Stats Cards */}
      <Grid templateColumns="repeat(auto-fit, minmax(200px, 1fr))" gap={4}>
        <Card.Root bg="app.dark" border="1px solid" borderColor="app.border">
          <Card.Body p={4}>
            <HStack justify="space-between" mb={2}>
              <Text color="app.text" fontSize="sm">
                Active Projects
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
                OpenCode Sessions
              </Text>
              <LuZap size={16} color="#808080" />
            </HStack>
            <Text color="app.light" fontSize="2xl" fontWeight="bold">
              {activeSessions}
            </Text>
            <Text color="app.text" fontSize="xs" mt={1}>
              Active sessions
            </Text>
          </Card.Body>
        </Card.Root>

        <Card.Root bg="app.dark" border="1px solid" borderColor="app.border">
          <Card.Body p={4}>
            <HStack justify="space-between" mb={2}>
              <Text color="app.text" fontSize="sm">
                Total Commits
              </Text>
              <LuGitBranch size={16} color="#808080" />
            </HStack>
            <Text color="app.light" fontSize="2xl" fontWeight="bold">
              47
            </Text>
            <Text color="app.accent" fontSize="xs" mt={1}>
              +8 this week
            </Text>
          </Card.Body>
        </Card.Root>

        <Card.Root bg="app.dark" border="1px solid" borderColor="app.border">
          <Card.Body p={4}>
            <HStack justify="space-between" mb={2}>
              <Text color="app.text" fontSize="sm">
                Hours Coded
              </Text>
              <LuClock size={16} color="#808080" />
            </HStack>
            <Text color="app.light" fontSize="2xl" fontWeight="bold">
              23.5
            </Text>
            <Text color="app.accent" fontSize="xs" mt={1}>
              +6.2 this week
            </Text>
          </Card.Body>
        </Card.Root>
      </Grid>

      {/* Project Status */}
      <Grid templateColumns="2fr 1fr" gap={6}>
        {/* Active Projects */}
        <Card.Root bg="app.dark" border="1px solid" borderColor="app.border">
          <Card.Header>
            <HStack justify="space-between">
              <Text color="app.light" fontSize="lg" fontWeight="semibold">
                Active Projects
              </Text>
              <HStack gap={2}>
                <Badge colorPalette="green" variant="subtle">
                  {activeProjects} Active
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
                  Loading projects...
                </Text>
              ) : projects.length === 0 ? (
                <Box textAlign="center" py={8}>
                  <LuFolder size={32} color="#404040" style={{ margin: '0 auto' }} />
                  <Text color="app.text" fontSize="sm" mt={3}>
                    No projects found
                  </Text>
                  <Text color="app.text" fontSize="xs" mt={1}>
                    Select a folder to start a new project
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
                      {project.worktree || 'No path specified'}
                    </Text>
                    {project.worktree?.includes('.git') && (
                      <Badge size="xs" colorPalette="blue" variant="subtle">
                        <LuGitBranch size={10} style={{ marginRight: 4 }} />
                        Git
                      </Badge>
                    )}
                  </Box>
                ))
              )}
            </VStack>
          </Card.Body>
        </Card.Root>

        {/* Workspace Tracker */}
        <WorkspaceTracker />
      </Grid>
    </VStack>
  )
}
