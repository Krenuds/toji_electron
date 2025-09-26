import React from 'react'
import { Box, Text, HStack, VStack, Badge } from '@chakra-ui/react'
import { LuFolder, LuCode, LuFileText, LuCheck } from 'react-icons/lu'
import { Tooltip } from '../../shared'

interface ProjectInfo {
  path: string
  name: string
  sdkProject: {
    id: string
    worktree: string
    vcs?: string
  }
}

interface ProjectCardProps {
  project: ProjectInfo
  isActive: boolean
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

export function ProjectCard({ project, isActive }: ProjectCardProps): React.JSX.Element {
  const projectPath = project.sdkProject.worktree
  const projectName = getProjectName(projectPath)
  const icon = getProjectIcon(projectPath)

  return (
    <Box
      p={4}
      bg="app.dark"
      borderRadius="md"
      borderWidth={2}
      borderColor={isActive ? 'app.accent' : 'app.border'}
      cursor="default"
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
          {isActive && (
            <Badge colorPalette="green" size="sm" variant="solid">
              <LuCheck size={12} />
              <Text ml={1}>Current</Text>
            </Badge>
          )}
        </HStack>
      </VStack>
    </Box>
  )
}
