import React from 'react'
import { Box, Text, HStack, VStack, Badge, Button } from '@chakra-ui/react'
import { LuFolder, LuCode, LuFileText, LuPlay, LuCheck } from 'react-icons/lu'
import { Tooltip } from '../../shared'

interface ProjectInfo {
  path: string
  name: string
  isOpen: boolean
  port?: number
  config?: unknown
  sdkProject?: {
    id: string
    worktree: string
    vcs?: string
  }
}

interface ProjectCardProps {
  project: ProjectInfo
  isActive: boolean
  isLoading: boolean
  onOpen: (projectPath: string) => void
}

function getProjectIcon(projectPath: string): React.ReactNode {
  // Simple heuristics for project type detection
  const pathLower = projectPath.toLowerCase()

  if (pathLower.includes('src') || pathLower.includes('code') || pathLower.includes('.git')) {
    return <LuCode size={20} />
  }
  if (pathLower.includes('doc') || pathLower.includes('paper') || pathLower.includes('writing')) {
    return <LuFileText size={20} />
  }

  // Default to folder icon
  return <LuFolder size={20} />
}

function getProjectName(projectPath: string): string {
  // Extract the last directory name from the path
  const segments = projectPath.split(/[/\\]/)
  return segments[segments.length - 1] || projectPath
}

export function ProjectCard({
  project,
  isActive,
  isLoading,
  onOpen
}: ProjectCardProps): React.JSX.Element {
  const projectPath = project.sdkProject?.worktree || project.path
  const projectName = getProjectName(projectPath)
  const icon = getProjectIcon(projectPath)

  const handleClick = (): void => {
    if (!isLoading && !isActive) {
      onOpen(project.path)
    }
  }

  return (
    <Box
      p={4}
      bg="app.dark"
      borderRadius="md"
      borderWidth={2}
      borderColor={isActive ? 'app.accent' : 'app.border'}
      cursor={isActive ? 'default' : 'pointer'}
      onClick={handleClick}
      transition="all 0.2s"
      _hover={
        !isActive && !isLoading
          ? {
              borderColor: 'app.text',
              transform: 'translateY(-1px)',
              bg: 'app.medium'
            }
          : {}
      }
      position="relative"
    >
      <VStack align="stretch" gap={3}>
        {/* Header Row */}
        <HStack justify="space-between" align="start">
          <HStack gap={3} flex="1" minW="0">
            <Box color={isActive ? 'app.accent' : 'app.light'} flexShrink={0}>
              {icon}
            </Box>
            <VStack align="start" gap={1} flex="1" minW="0">
              <Text
                color="app.light"
                fontWeight="semibold"
                fontSize="md"
                truncate
                title={projectName}
              >
                {projectName}
              </Text>
              <Tooltip content={projectPath} showArrow>
                <Text color="app.text" fontSize="xs" fontFamily="mono" truncate cursor="help">
                  {projectPath}
                </Text>
              </Tooltip>
            </VStack>
          </HStack>

          {/* Status Badge */}
          {isActive ? (
            <Badge colorPalette="green" size="sm" variant="solid">
              <LuCheck size={12} />
              <Text ml={1}>Active</Text>
            </Badge>
          ) : (
            <Button
              size="xs"
              variant="ghost"
              colorPalette="green"
              disabled={isLoading}
              onClick={(e) => {
                e.stopPropagation()
                handleClick()
              }}
            >
              <LuPlay size={12} />
              <Text ml={1}>{isLoading ? 'Opening...' : 'Open'}</Text>
            </Button>
          )}
        </HStack>
      </VStack>
    </Box>
  )
}
