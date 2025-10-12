import React, { useState } from 'react'
import { VStack, HStack, Text, Button, Box, IconButton, Spinner } from '@chakra-ui/react'
import { LuFolderOpen, LuCheck, LuTrash2 } from 'react-icons/lu'
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
    clearErrors,
    refreshAll
  } = useChatCoordinatorContext()

  const [deletingProjectPath, setDeletingProjectPath] = useState<string | null>(null)

  const handleProjectClick = async (projectPath: string): Promise<void> => {
    if (projectPath !== currentProject?.path) {
      await switchProject(projectPath)
    }
  }

  const handleDeleteProject = async (projectPath: string, e: React.MouseEvent): Promise<void> => {
    e.stopPropagation() // Prevent project selection when clicking delete

    const projectName = projectPath.split(/[/\\]/).pop() || projectPath

    // Confirm deletion
    if (
      !confirm(
        `Delete project "${projectName}"?\n\nThis will remove it from your projects list. The actual folder will not be deleted.`
      )
    ) {
      return
    }

    // Check if it's the active project
    if (currentProject?.path === projectPath) {
      alert('Cannot delete the currently active project. Please switch to another project first.')
      return
    }

    setDeletingProjectPath(projectPath)
    try {
      await window.api.project.delete(projectPath)
      // Refresh the projects list
      await refreshAll()
    } catch (error) {
      console.error('Failed to delete project:', error)
      alert(`Failed to delete project: ${error instanceof Error ? error.message : 'Unknown error'}`)
    } finally {
      setDeletingProjectPath(null)
    }
  }

  const renderProjectItem = (project: Project): React.JSX.Element => {
    const projectName = project.worktree.split(/[/\\]/).pop() || project.worktree
    const isActive = currentProject?.path === project.worktree
    const isDeleting = deletingProjectPath === project.worktree

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
          position="relative"
          p={2}
          pr={8}
          borderRadius="md"
          bg={isActive ? 'green.800' : 'app.dark'}
          border="1px solid"
          borderColor={isActive ? 'app.accent' : 'app.border'}
          cursor={isDeleting ? 'not-allowed' : 'pointer'}
          opacity={isDeleting ? 0.6 : 1}
          _hover={
            !isDeleting
              ? {
                  bg: isActive ? 'green.800' : 'app.medium',
                  borderColor: 'app.accent'
                }
              : {}
          }
          onClick={() => !isDeleting && handleProjectClick(project.worktree)}
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

          {/* Delete button */}
          <IconButton
            position="absolute"
            right={1}
            top="50%"
            transform="translateY(-50%)"
            aria-label="Delete project"
            size="xs"
            variant="ghost"
            color="app.text"
            _hover={{
              bg: 'red.500',
              color: 'white'
            }}
            onClick={(e) => handleDeleteProject(project.worktree, e)}
            disabled={isDeleting}
          >
            {isDeleting ? <Spinner size="xs" color="white" /> : <LuTrash2 size={12} />}
          </IconButton>
        </Box>
      </Tooltip>
    )
  }

  const handleOpenProjectsFolder = async (): Promise<void> => {
    try {
      await window.api.window.openFolder(
        'C:\\Users\\donth\\.local\\share\\opencode\\storage\\project'
      )
    } catch (error) {
      console.error('Failed to open projects folder:', error)
    }
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
            onClick={handleOpenProjectsFolder}
            title="Open projects folder"
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
