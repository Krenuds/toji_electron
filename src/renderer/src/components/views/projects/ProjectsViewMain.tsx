import React, { useEffect, useState } from 'react'
import { VStack, Box, Text, Center, Button, Spinner, HStack } from '@chakra-ui/react'
import { LuFolderTree, LuRefreshCw } from 'react-icons/lu'
import { useProjects } from '../../../hooks/useProjects'
import { ProjectCard } from './ProjectCard'

export function ProjectsViewMain(): React.JSX.Element {
  const { projects, isLoading, error, fetchProjects, currentProject } = useProjects()
  const [hasLoaded, setHasLoaded] = useState(false)

  useEffect(() => {
    if (!hasLoaded) {
      fetchProjects()
      setHasLoaded(true)
    }
  }, [hasLoaded, fetchProjects])

  return (
    <VStack align="stretch" gap={6}>
      {/* Header */}
      <Box>
        <Text color="app.light" fontSize="2xl" fontWeight="bold" mb={2}>
          Projects
        </Text>
        <Text color="app.text" fontSize="sm">
          View your OpenCode AI projects from the SDK.
        </Text>
      </Box>

      {/* Action Bar */}
      <HStack gap={2}>
        <Button
          size="sm"
          variant="ghost"
          colorPalette="green"
          onClick={fetchProjects}
          disabled={isLoading}
        >
          <LuRefreshCw size={16} />
          <Text ml={2}>Refresh</Text>
        </Button>
      </HStack>

      {/* Main Content Area */}
      {isLoading ? (
        <Center py={20}>
          <VStack gap={4}>
            <Spinner size="xl" color="app.accent" />
            <Text color="app.text">Loading projects...</Text>
          </VStack>
        </Center>
      ) : error ? (
        <Center py={20}>
          <VStack gap={4}>
            <Text color="red.400">Error loading projects:</Text>
            <Text color="app.text" fontSize="sm">
              {error}
            </Text>
            <Button size="sm" colorPalette="green" onClick={fetchProjects}>
              Try Again
            </Button>
          </VStack>
        </Center>
      ) : projects.length > 0 ? (
        <VStack align="stretch" gap={4}>
          <Text color="app.text" fontSize="sm">
            {projects.length === 1 ? '1 project found:' : `${projects.length} projects found:`}
          </Text>
          <VStack align="stretch" gap={3}>
            {projects.map((project) => (
              <ProjectCard
                key={project.sdkProject.id}
                project={project}
                isActive={currentProject?.path === project.path}
              />
            ))}
          </VStack>
        </VStack>
      ) : (
        <Center py={20}>
          <VStack gap={6}>
            <LuFolderTree size={48} color="#404040" />
            <VStack gap={2}>
              <Text color="app.light" fontSize="lg" fontWeight="semibold">
                No Projects Found
              </Text>
              <Text color="app.text" fontSize="sm" textAlign="center" maxW="400px">
                No projects are currently registered with OpenCode SDK. Start by opening a project
                through the OpenCode server.
              </Text>
            </VStack>
          </VStack>
        </Center>
      )}
    </VStack>
  )
}
