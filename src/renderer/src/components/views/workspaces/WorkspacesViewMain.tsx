import React from 'react'
import { Box, VStack, HStack, Text, Grid, Card, Badge, Button } from '@chakra-ui/react'
import { LuGitBranch, LuClock, LuCode, LuZap, LuRefreshCw, LuFolder } from 'react-icons/lu'
import { useProjects } from '../../../hooks/useProjects'
import { useSession } from '../../../hooks/useSession'
import { WorkspaceTracker } from '../../WorkspaceTracker'
import { MetricCard } from '../../shared'

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
        <MetricCard
          title="OpenCode Projects"
          value={activeProjects}
          description="Total in workspace"
          icon={<LuCode size={16} color="#808080" />}
          valueSize="xl"
        />

        <MetricCard
          title="Active Sessions"
          value={activeSessions}
          description="OpenCode sessions"
          icon={<LuZap size={16} color="#808080" />}
          valueSize="xl"
          variant={activeSessions > 0 ? 'accent' : 'default'}
        />

        <MetricCard
          title="Recent Sessions"
          value={
            sessions.filter((s) => {
              const lastUpdated = s.time?.updated || s.time?.created || 0
              const dayAgo = Date.now() - 24 * 60 * 60 * 1000
              return lastUpdated > dayAgo
            }).length
          }
          description="Last 24 hours"
          icon={<LuGitBranch size={16} color="#808080" />}
          valueSize="xl"
        />

        <MetricCard
          title="Total Sessions"
          value={sessions.length}
          description="All time"
          icon={<LuClock size={16} color="#808080" />}
          valueSize="xl"
        />
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
