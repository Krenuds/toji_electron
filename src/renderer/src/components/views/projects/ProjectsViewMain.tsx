import React, { useEffect, useState } from 'react'
import { VStack, Box, Text, Center, Button, Spinner, HStack } from '@chakra-ui/react'
import { LuFolderTree, LuRefreshCw, LuFolderOpen, LuPlus } from 'react-icons/lu'
import { useProjects } from '../../../hooks/useProjects'
import { ProjectCard } from './ProjectCard'

export function ProjectsViewMain(): React.JSX.Element {
  const {
    projects,
    isLoading,
    error,
    fetchProjects,
    openProjectsFolder,
    changeProject,
    isChangingProject,
    currentProject,
    selectAndChangeProject
  } = useProjects()
  const [hasLoaded, setHasLoaded] = useState(false)
  const [openingProject, setOpeningProject] = useState<string | null>(null)

  useEffect(() => {
    if (!hasLoaded) {
      fetchProjects()
      setHasLoaded(true)
    }
  }, [hasLoaded, fetchProjects])

  const handleOpenProject = async (projectPath: string): Promise<void> => {
    setOpeningProject(projectPath)
    try {
      await changeProject(projectPath)
    } catch (error) {
      console.error('Failed to open project:', error)
    } finally {
      setOpeningProject(null)
    }
  }
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

      {/* Action Buttons */}
      <HStack>
        <Button
          size="sm"
          variant="solid"
          colorPalette="green"
          onClick={selectAndChangeProject}
          disabled={isChangingProject}
        >
          <LuPlus size={16} />
          <Text ml={2}>{isChangingProject ? 'Opening...' : 'Open Project'}</Text>
        </Button>
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
        <Button size="sm" variant="ghost" colorPalette="gray" onClick={openProjectsFolder}>
          <LuFolderOpen size={16} />
          <Text ml={2}>Show Folder</Text>
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
                key={project.sdkProject?.id || project.path}
                project={project}
                isActive={currentProject === project.path}
                isLoading={openingProject === project.path}
                onOpen={handleOpenProject}
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
                No Projects Yet
              </Text>
              <Text color="app.text" fontSize="sm" textAlign="center" maxW="400px">
                Start by opening a folder with your documents, code, or any files you&apos;d like to
                chat about with AI.
              </Text>
            </VStack>
            <Button
              size="md"
              variant="solid"
              colorPalette="green"
              onClick={selectAndChangeProject}
              disabled={isChangingProject}
            >
              <LuPlus size={16} />
              <Text ml={2}>{isChangingProject ? 'Opening...' : 'Open Your First Project'}</Text>
            </Button>
          </VStack>
        </Center>
      )}
    </VStack>
  )
}
