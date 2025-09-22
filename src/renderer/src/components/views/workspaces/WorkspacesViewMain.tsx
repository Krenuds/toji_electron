import React from 'react'
import { Box, VStack, Text, Grid, Button, Spinner, Center } from '@chakra-ui/react'
import { LuFolderOpen } from 'react-icons/lu'
import { useWorkspaces } from '../../../hooks/useWorkspaces'
import { useWorkspace } from '../../../hooks/useWorkspace'
import { WorkspaceCard } from '../../shared/WorkspaceCard'

export function WorkspacesViewMain(): React.JSX.Element {
  const { workspaces, isLoading, error, refreshWorkspaces, openWorkspaceDirectory } =
    useWorkspaces()
  const { currentWorkspace, selectAndChangeWorkspace } = useWorkspace()

  return (
    <VStack align="stretch" gap={6}>
      {/* Header */}
      <Box>
        <Text color="app.light" fontSize="2xl" fontWeight="bold" mb={2}>
          Workspaces
        </Text>
        <Text color="app.text" fontSize="sm">
          Your project folders with AI conversation sessions.
        </Text>
      </Box>

      {/* Content */}
      {isLoading ? (
        <Center py={20}>
          <VStack gap={3}>
            <Spinner size="lg" color="app.accent" />
            <Text color="app.text" fontSize="sm">
              Loading workspaces...
            </Text>
          </VStack>
        </Center>
      ) : error ? (
        <Center py={20}>
          <VStack gap={3}>
            <Text color="red.500" fontSize="sm">
              Error loading workspaces: {error}
            </Text>
            <Button size="sm" variant="subtle" onClick={refreshWorkspaces}>
              Try Again
            </Button>
          </VStack>
        </Center>
      ) : workspaces.length === 0 ? (
        <Center py={20}>
          <VStack gap={4}>
            <LuFolderOpen size={48} color="#404040" />
            <Text color="app.light" fontSize="lg">
              No workspaces found
            </Text>
            <Text color="app.text" fontSize="sm" textAlign="center" maxW="400px">
              Open a folder to start working with the AI assistant. Your conversation sessions will
              be tracked per workspace.
            </Text>
            <Button
              size="sm"
              variant="subtle"
              colorPalette="green"
              onClick={selectAndChangeWorkspace}
            >
              <LuFolderOpen size={14} style={{ marginRight: 6 }} />
              Open Your First Workspace
            </Button>
          </VStack>
        </Center>
      ) : (
        <Grid templateColumns="repeat(auto-fill, minmax(320px, 1fr))" gap={4}>
          {workspaces.map((workspace) => (
            <WorkspaceCard
              key={workspace.path}
              path={workspace.path}
              name={workspace.name}
              sessionCount={workspace.sessionCount}
              lastActivity={workspace.lastActivity}
              isCurrent={workspace.path === currentWorkspace}
              onOpenDirectory={openWorkspaceDirectory}
            />
          ))}
        </Grid>
      )}

      {/* Info Footer */}
      {workspaces.length > 0 && (
        <Box borderTop="1px solid" borderColor="app.border" pt={4} mt={4}>
          <Text color="app.text" fontSize="xs">
            Showing {workspaces.length} workspace{workspaces.length !== 1 ? 's' : ''} with{' '}
            {workspaces.reduce((sum, ws) => sum + ws.sessionCount, 0)} total session
            {workspaces.reduce((sum, ws) => sum + ws.sessionCount, 0) !== 1 ? 's' : ''}.
          </Text>
        </Box>
      )}
    </VStack>
  )
}
