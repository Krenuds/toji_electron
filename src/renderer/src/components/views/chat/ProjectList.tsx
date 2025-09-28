import React from 'react'
import { VStack, HStack, Text, Button } from '@chakra-ui/react'
import { LuFolderOpen, LuCheck } from 'react-icons/lu'
import { useChatCoordinatorContext } from '../../../hooks/useChatCoordinatorContext'
import { SidebarSection } from '../../shared/SidebarSection'
import { SidebarCard } from '../../shared/SidebarCard'
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
        <SidebarCard
          isActive={isActive}
          onClick={() => handleProjectClick(project.worktree)}
        >
          <HStack gap={2}>
            <Text
              color="app.light"
              fontSize="sm"
              fontWeight="medium"
              noOfLines={1}
              overflow="hidden"
              textOverflow="ellipsis"
              flex={1}
            >
              {projectName}
            </Text>
            {isActive && <LuCheck size={14} color="#48bb78" />}
          </HStack>
        </SidebarCard>
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
      <VStack gap={2} align="stretch">
        {projectError ? (
          <VStack gap={2} py={2}>
            <Text color="red.400" fontSize="2xs" textAlign="center">
              {projectError}
            </Text>
            <Button
              size="xs"
              variant="ghost"
              colorPalette="red"
              onClick={clearErrors}
            >
              Dismiss
            </Button>
          </VStack>
        ) : projects.length === 0 ? (
          <VStack gap={3} py={2}>
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