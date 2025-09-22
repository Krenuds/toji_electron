import React, { useState } from 'react'
import {
  Box,
  VStack,
  HStack,
  Text,
  Badge,
  Card,
  Collapsible,
  Spinner,
  IconButton
} from '@chakra-ui/react'
import {
  LuFolder,
  LuFolderOpen,
  LuGitBranch,
  LuCode,
  LuRefreshCw,
  LuSearch,
  LuChevronDown,
  LuChevronRight,
  LuActivity
} from 'react-icons/lu'
import { useWorkspaceTracker } from '../../hooks/useWorkspaceTracker'
import { useSession } from '../../hooks/useSession'

export function WorkspaceTracker(): React.JSX.Element {
  const {
    currentDirectory,
    collections,
    enrichedProjects,
    isLoading,
    error,
    refreshCollections,
    refreshProjects,
    discoverProjects
  } = useWorkspaceTracker()

  const { sessions } = useSession()

  const [expandedCollections, setExpandedCollections] = useState<Set<string>>(new Set())
  const [isDiscovering, setIsDiscovering] = useState(false)

  const toggleCollection = (collectionId: string): void => {
    setExpandedCollections((prev) => {
      const next = new Set(prev)
      if (next.has(collectionId)) {
        next.delete(collectionId)
      } else {
        next.add(collectionId)
      }
      return next
    })
  }

  const handleDiscover = async (): Promise<void> => {
    setIsDiscovering(true)
    try {
      await discoverProjects()
    } finally {
      setIsDiscovering(false)
    }
  }

  const handleRefresh = async (): Promise<void> => {
    await Promise.all([refreshCollections(), refreshProjects()])
  }

  // Calculate stats
  const totalProjects = enrichedProjects.length
  const activeSessions = sessions.length
  const activeProjects = enrichedProjects.filter((p) => (p.sessionCount ?? 0) > 0).length

  return (
    <Card.Root bg="app.dark" border="1px solid" borderColor="app.border" height="100%">
      <Card.Header pb={3}>
        <HStack justify="space-between">
          <HStack gap={2}>
            <LuActivity size={18} color="#33b42f" />
            <Text color="app.light" fontSize="md" fontWeight="semibold">
              Workspace Tracker
            </Text>
          </HStack>
          <HStack gap={1}>
            <IconButton
              size="xs"
              variant="ghost"
              aria-label="Discover projects"
              onClick={handleDiscover}
              disabled={isDiscovering}
            >
              {isDiscovering ? <Spinner size="xs" /> : <LuSearch size={14} />}
            </IconButton>
            <IconButton
              size="xs"
              variant="ghost"
              aria-label="Refresh"
              onClick={handleRefresh}
              disabled={isLoading}
            >
              {isLoading ? <Spinner size="xs" /> : <LuRefreshCw size={14} />}
            </IconButton>
          </HStack>
        </HStack>
      </Card.Header>

      <Card.Body pt={0} pb={4} px={4}>
        <VStack align="stretch" gap={4}>
          {/* Current Workspace */}
          <Box>
            <Text color="app.text" fontSize="xs" mb={1}>
              Current Workspace
            </Text>
            <HStack gap={2}>
              <LuFolder size={14} color="#808080" />
              <Text color="app.light" fontSize="sm" lineClamp={1}>
                {currentDirectory || 'No workspace selected'}
              </Text>
            </HStack>
          </Box>

          {/* Stats */}
          <HStack justify="space-between">
            <VStack align="start" gap={0}>
              <Text color="app.text" fontSize="xs">
                Projects
              </Text>
              <Text color="app.accent" fontSize="lg" fontWeight="bold">
                {totalProjects}
              </Text>
            </VStack>
            <VStack align="start" gap={0}>
              <Text color="app.text" fontSize="xs">
                Active
              </Text>
              <Text color="app.accent" fontSize="lg" fontWeight="bold">
                {activeProjects}
              </Text>
            </VStack>
            <VStack align="start" gap={0}>
              <Text color="app.text" fontSize="xs">
                Sessions
              </Text>
              <Text color="app.accent" fontSize="lg" fontWeight="bold">
                {activeSessions}
              </Text>
            </VStack>
          </HStack>

          {/* Workspace Collections */}
          <Box>
            <Text color="app.text" fontSize="xs" mb={2}>
              Workspace Collections ({collections.length})
            </Text>
            <VStack align="stretch" gap={2}>
              {collections.length === 0 ? (
                <Text color="app.text" fontSize="sm" textAlign="center" py={2}>
                  No collections found
                </Text>
              ) : (
                collections.map((collection) => (
                  <Box
                    key={collection.id}
                    borderRadius="md"
                    border="1px solid"
                    borderColor="app.border"
                    overflow="hidden"
                  >
                    <HStack
                      p={2}
                      cursor="pointer"
                      onClick={() => toggleCollection(collection.id)}
                      _hover={{ bg: 'app.darkest' }}
                    >
                      <Box>
                        {expandedCollections.has(collection.id) ? (
                          <LuChevronDown size={14} />
                        ) : (
                          <LuChevronRight size={14} />
                        )}
                      </Box>
                      <LuFolderOpen size={14} color="#33b42f" />
                      <Text color="app.light" fontSize="sm" flex={1}>
                        {collection.name}
                      </Text>
                      <Badge size="sm" colorPalette="green">
                        {collection.projects?.length || 0}
                      </Badge>
                    </HStack>

                    <Collapsible.Root open={expandedCollections.has(collection.id)}>
                      <Collapsible.Content>
                        <VStack align="stretch" p={2} pt={0} gap={1}>
                          {collection.projects?.map((project) => (
                            <HStack
                              key={project.id}
                              p={2}
                              bg="app.darkest"
                              borderRadius="md"
                              fontSize="xs"
                            >
                              {project.vcs ? (
                                <LuGitBranch size={12} color="#808080" />
                              ) : (
                                <LuCode size={12} color="#808080" />
                              )}
                              <Text color="app.light" flex={1} lineClamp={1}>
                                {project.name}
                              </Text>
                              {project.sessionCount !== undefined && project.sessionCount > 0 && (
                                <Badge size="xs" colorPalette="blue">
                                  {project.sessionCount} sessions
                                </Badge>
                              )}
                            </HStack>
                          ))}
                        </VStack>
                      </Collapsible.Content>
                    </Collapsible.Root>
                  </Box>
                ))
              )}
            </VStack>
          </Box>

          {/* Error Display */}
          {error && (
            <Box p={2} bg="red.900/20" borderRadius="md">
              <Text color="red.400" fontSize="xs">
                Error: {error}
              </Text>
            </Box>
          )}
        </VStack>
      </Card.Body>
    </Card.Root>
  )
}
