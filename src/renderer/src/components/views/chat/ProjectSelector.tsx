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
      <VStack w="full" gap={2} p={3}>
        <HStack w="full" gap={2}>
          <Text fontSize="sm" color="gray.500" minW="fit-content">
            Project:
          </Text>
          <NativeSelectRoot size="sm" disabled={isLoading}>
            <NativeSelectField value={currentProject?.path || '/'} onChange={handleProjectChange}>
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
          variant="outline"
          colorScheme="blue"
          disabled={isLoading}
          borderRadius="md"
        >
          Add Project Directory
        </Button>
      </VStack>

      <Separator />

      <DirectoryPicker isOpen={open} onClose={onClose} onSelect={handleDirectorySelect} />
    </>
  )
}
