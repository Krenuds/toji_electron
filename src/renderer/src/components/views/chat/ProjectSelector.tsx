import React, { useMemo } from 'react'
import {
  Box,
  VStack,
  HStack,
  Text,
  Button,
  Separator,
  SelectRoot,
  SelectTrigger,
  SelectValueText,
  SelectContent,
  SelectItem,
  Spinner
} from '@chakra-ui/react'
import { LuFolderOpen, LuInfo } from 'react-icons/lu'
import { ListCollection } from '@zag-js/collection'
import { useChatCoordinatorContext } from '../../../hooks/useChatCoordinatorContext'

export const ProjectSelector: React.FC = () => {
  const {
    projects,
    currentProject,
    isLoadingProjects,
    projectError,
    switchProject,
    openProjectDialog,
    clearErrors
  } = useChatCoordinatorContext()

  // Create collection items for the select dropdown
  const projectItems = useMemo(
    () =>
      projects.map((project) => {
        const projectName = project.worktree.split(/[/\\]/).pop() ?? project.worktree
        return { label: projectName, value: project.worktree }
      }),
    [projects]
  )

  const projectCollection = useMemo(
    () =>
      new ListCollection({
        items: projectItems,
        itemToValue: (item) => item.value,
        itemToString: (item) => item.label
      }),
    [projectItems]
  )

  const handleProjectChange = async (value: string[]): Promise<void> => {
    const nextPath = value[0]
    if (!nextPath || nextPath === currentProject?.path) {
      return
    }
    await switchProject(nextPath)
  }

  return (
    <>
      <VStack
        w="full"
        gap={2}
        p={3}
        bg="app.dark"
        borderRadius="md"
        border="1px solid"
        borderColor={projectError ? 'red.500' : 'app.border'}
      >
        {projectError && (
          <HStack w="full" gap={2} color="red.400">
            <LuInfo size={14} />
            <Text fontSize="2xs" flex={1}>
              {projectError}
            </Text>
            <Button size="xs" variant="ghost" colorPalette="red" onClick={clearErrors}>
              ×
            </Button>
          </HStack>
        )}

        <HStack w="full" gap={2}>
          <Text fontSize="xs" color="app.text" minW="fit-content" fontWeight="medium">
            Project:
          </Text>
          <SelectRoot
            size="sm"
            flex={1}
            disabled={isLoadingProjects}
            collection={projectCollection}
            value={currentProject?.path ? [currentProject.path] : []}
            onValueChange={({ value }) => handleProjectChange(value)}
          >
            <SelectTrigger
              bg="app.medium"
              borderColor="app.border"
              color="app.light"
              _hover={{ borderColor: 'app.accent' }}
              _focusVisible={{ borderColor: 'app.accent', boxShadow: 'none' }}
            >
              {isLoadingProjects ? (
                <HStack gap={2}>
                  <Spinner size="xs" />
                  <Text>Loading projects...</Text>
                </HStack>
              ) : (
                <SelectValueText placeholder="Select a project" />
              )}
            </SelectTrigger>
            <SelectContent bg="app.dark" borderColor="app.border" color="app.light" shadow="lg">
              {projectItems.length === 0 ? (
                <Box p={2}>
                  <Text fontSize="xs" color="app.text" textAlign="center">
                    No projects found. Click &quot;Open Project&quot; to add one.
                  </Text>
                </Box>
              ) : (
                projectItems.map((project) => (
                  <SelectItem
                    key={project.value}
                    item={project}
                    color="app.light"
                    _hover={{ bg: 'app.medium' }}
                    _highlighted={{ bg: 'app.medium', color: 'app.light' }}
                    _selected={{ bg: 'app.medium', color: 'app.light' }}
                  >
                    <VStack align="start" gap={0}>
                      <Text fontSize="sm">{project.label}</Text>
                      <Text fontSize="2xs" color="app.text" lineClamp={1}>
                        {project.value}
                      </Text>
                    </VStack>
                  </SelectItem>
                ))
              )}
            </SelectContent>
          </SelectRoot>
        </HStack>

        <Button
          size="sm"
          w="full"
          onClick={openProjectDialog}
          variant="solid"
          colorPalette="green"
          disabled={isLoadingProjects}
          borderRadius="md"
        >
          <LuFolderOpen size={14} />
          Open Project
        </Button>
      </VStack>

      <Separator borderColor="app.border" />
    </>
  )
}
