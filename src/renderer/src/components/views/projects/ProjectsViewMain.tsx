import React, { useEffect, useState } from 'react'
import { VStack, Box, Text, Center, Button, Spinner, HStack } from '@chakra-ui/react'
import { LuFolderTree, LuRefreshCw } from 'react-icons/lu'
import { useProjects } from '../../../hooks/useProjects'

export function ProjectsViewMain(): React.JSX.Element {
  const { projects, isLoading, error, fetchProjects } = useProjects()
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
          Manage and organize your OpenCode AI projects.
        </Text>
      </Box>

      {/* Refresh Button */}
      <HStack>
        <Button
          size="sm"
          variant="ghost"
          colorPalette="green"
          onClick={fetchProjects}
          disabled={isLoading}
        >
          <LuRefreshCw size={16} />
          <Text ml={2}>Refresh Projects</Text>
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
        <VStack align="stretch" gap={2}>
          <Text color="app.text" fontSize="sm">
            Found {projects.length} project(s):
          </Text>
          {projects.map((project, index) => (
            <Box
              key={index}
              p={4}
              bg="app.dark"
              borderRadius="md"
              borderWidth={1}
              borderColor="app.border"
            >
              <Text color="app.light" fontWeight="semibold">
                Project {index + 1}
              </Text>
              <Text color="app.text" fontSize="xs" fontFamily="mono">
                {JSON.stringify(project, null, 2)}
              </Text>
            </Box>
          ))}
        </VStack>
      ) : (
        <Center py={20}>
          <VStack gap={4}>
            <LuFolderTree size={48} color="#404040" />
            <Text color="app.light" fontSize="lg">
              No Projects Found
            </Text>
            <Text color="app.text" fontSize="sm" textAlign="center" maxW="400px">
              No OpenCode projects detected. Create a new project to get started.
            </Text>
          </VStack>
        </Center>
      )}
    </VStack>
  )
}
