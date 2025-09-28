import React from 'react'
import {
  VStack,
  HStack,
  Text,
  Button,
  useDisclosure,
  Separator,
  NativeSelectRoot,
  NativeSelectField
} from '@chakra-ui/react'
import { DirectoryPicker } from './DirectoryPicker'
import { useProjects } from '../../../hooks/useProjects'

export const ProjectSelector: React.FC = () => {
  const { projects, currentProject, switchProject, isLoading } = useProjects()
  const { open, onOpen, onClose } = useDisclosure()

  const handleProjectChange = (event: React.ChangeEvent<HTMLSelectElement>): void => {
    const projectPath = event.target.value
    switchProject(projectPath)
  }

  const handleDirectorySelect = async (directoryPath: string): Promise<void> => {
    await switchProject(directoryPath)
    onClose()
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
          onClick={onOpen}
          variant="solid"
          colorPalette="green"
          disabled={isLoading}
          borderRadius="md"
        >
          Add Project Directory
        </Button>
      </VStack>

      <Separator borderColor="app.border" />

      <DirectoryPicker isOpen={open} onClose={onClose} onSelect={handleDirectorySelect} />
    </>
  )
}
