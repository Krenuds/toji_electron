import React from 'react'
import {
  VStack,
  HStack,
  Text,
  Button,
  Separator,
  NativeSelectRoot,
  NativeSelectField
} from '@chakra-ui/react'
import { LuFolderOpen } from 'react-icons/lu'
import { useProjects } from '../../../hooks/useProjects'

export const ProjectSelector: React.FC = () => {
  const { projects, currentProject, switchProject, isLoading } = useProjects()

  const handleProjectChange = (event: React.ChangeEvent<HTMLSelectElement>): void => {
    const projectPath = event.target.value
    switchProject(projectPath)
  }

  const handleOpenProject = async (): Promise<void> => {
    try {
      const result = await window.api.dialog.showOpenDialog({
        properties: ['openDirectory']
      })

      if (!result.canceled && result.filePaths[0]) {
        await switchProject(result.filePaths[0])
      }
    } catch (error) {
      console.error('Failed to open project:', error)
    }
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
        borderColor="app.border"
      >
        <HStack w="full" gap={2}>
          <Text fontSize="xs" color="app.text" minW="fit-content" fontWeight="medium">
            Project:
          </Text>
          <NativeSelectRoot size="sm" disabled={isLoading} flex={1}>
            <NativeSelectField
              value={currentProject?.path || '/'}
              onChange={handleProjectChange}
              bg="app.medium"
              borderColor="app.border"
              color="app.light"
              _hover={{ borderColor: 'app.accent' }}
              _focus={{ borderColor: 'app.accent', boxShadow: 'none' }}
            >
              <option value="/">Global (/)</option>
              {projects.map((project) => (
                <option key={project.worktree} value={project.worktree}>
                  {project.worktree.split(/[/\\]/).pop() || project.worktree}
                </option>
              ))}
            </NativeSelectField>
          </NativeSelectRoot>
        </HStack>

        <Button
          size="sm"
          w="full"
          onClick={handleOpenProject}
          variant="solid"
          colorPalette="green"
          disabled={isLoading}
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
