import React from 'react'
import { VStack, HStack, Text, Button, Box } from '@chakra-ui/react'
import { LuFolderOpen, LuCheck } from 'react-icons/lu'
import { useChatCoordinatorContext } from '../../../hooks/useChatCoordinatorContext'
import { SidebarSection } from '../../shared/SidebarSection'
import { Tooltip } from '../../shared/Tooltip'

interface Project {
  worktree: string
}

export const ProjectList: React.FC = () => {
  const {
    projects,
    currentProject,
    isLoadingProjects,
    projectError,
    switchProject,
    openProjectDialog,
    clearErrors
  } = useChatCoordinatorContext()

  const handleProjectClick = async (projectPath: string): Promise<void> => {
    if (projectPath !== currentProject?.path) {
      await switchProject(projectPath)
    }
  }

  const renderProjectItem = (project: Project): React.JSX.Element => {
    const projectName = project.worktree.split(/[/\\]/).pop() || project.worktree
    const isActive = currentProject?.path === project.worktree

    return (
      <Tooltip
        key={project.worktree}
        content={project.worktree}
        contentProps={{
          bg: 'app.dark',
          color: 'app.light',
          borderColor: 'app.border',
          fontSize: 'xs'
        }}
      >
        <Box
          p={2}
          borderRadius="md"
          bg={isActive ? 'green.800' : 'app.dark'}
          border="1px solid"
          borderColor={isActive ? 'app.accent' : 'app.border'}
          cursor="pointer"
          _hover={{
            bg: isActive ? 'green.800' : 'app.medium',
            borderColor: 'app.accent'
          }}
          onClick={() => handleProjectClick(project.worktree)}
          transition="all 0.2s"
          overflow="hidden"
        >
          <HStack gap={2} minW="0">
            <Box flex={1} minW="0" overflow="hidden">
              <Text
                color="app.light"
                fontSize="sm"
                fontWeight="medium"
                overflow="hidden"
                textOverflow="ellipsis"
                whiteSpace="nowrap"
              >
                {projectName}
              </Text>
            </Box>
            {isActive && <LuCheck size={14} color="#48bb78" />}
          </HStack>
        </Box>
      </Tooltip>
    )
  }

  return (
    <SidebarSection
      title="Projects"
      action={
        projects.length > 0 && (
          <Button
            size="xs"
            variant="ghost"
            colorPalette="green"
            onClick={openProjectDialog}
            title="Open new project"
          >
            <LuFolderOpen size={12} />
          </Button>
        )
      }
    >
      <VStack gap={2} align="stretch" minW="0">
        {projectError ? (
          <VStack gap={2} py={2} minW="0">
            <Text color="red.400" fontSize="2xs" textAlign="center">
              {projectError}
            </Text>
            <Button size="xs" variant="ghost" colorPalette="red" onClick={clearErrors}>
              Dismiss
            </Button>
          </VStack>
        ) : projects.length === 0 ? (
          <VStack gap={3} py={2} minW="0">
            <Text color="app.text" fontSize="xs" textAlign="center">
              No projects yet
            </Text>
            <Button
              size="sm"
              w="full"
              onClick={openProjectDialog}
              variant="solid"
              colorPalette="green"
              disabled={isLoadingProjects}
            >
              <LuFolderOpen size={14} />
              Open Project
            </Button>
          </VStack>
        ) : (
          <>
            {/* Show up to 4 recent projects */}
            {projects.slice(0, 4).map(renderProjectItem)}

            {/* Add "Open Project" button at bottom */}
            <Button
              size="sm"
              w="full"
              onClick={openProjectDialog}
              variant="solid"
              colorPalette="green"
              mt={1}
            >
              <LuFolderOpen size={14} />
              Open Project
            </Button>

            {projects.length > 4 && (
              <Text color="app.text" fontSize="2xs" textAlign="center">
                {projects.length - 4} more projects available
              </Text>
            )}
          </>
        )}
      </VStack>
    </SidebarSection>
  )
}
