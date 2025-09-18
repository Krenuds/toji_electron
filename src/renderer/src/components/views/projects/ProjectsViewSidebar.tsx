import React from 'react'
import { Box, VStack, HStack, Text, Badge, Button, Separator } from '@chakra-ui/react'
import { LuPlus, LuFolderOpen, LuActivity, LuGitBranch } from 'react-icons/lu'
import { SidebarContainer } from '../../SidebarContainer'

export function ProjectsViewSidebar(): React.JSX.Element {
  return (
    <SidebarContainer>
      <VStack align="stretch" gap={4}>
      {/* Header */}
      <Box>
        <Text color="app.light" fontSize="sm" fontWeight="bold" mb={2}>
          Projects
        </Text>
        <Text color="app.text" fontSize="xs">
          Manage and monitor development projects
        </Text>
      </Box>

      <Separator borderColor="app.border" />

      {/* Quick Actions */}
      <Box>
        <Text color="app.light" fontSize="xs" fontWeight="semibold" mb={3}>
          Quick Actions
        </Text>
        <VStack gap={2} align="stretch">
          <Button
            variant="ghost"
            size="sm"
            justifyContent="flex-start"
            color="app.text"
            _hover={{ color: 'app.light', bg: 'rgba(255,255,255,0.05)' }}
          >
            <LuPlus size={14} />
            New Project
          </Button>
          <Button
            variant="ghost"
            size="sm"
            justifyContent="flex-start"
            color="app.text"
            _hover={{ color: 'app.light', bg: 'rgba(255,255,255,0.05)' }}
          >
            <LuFolderOpen size={14} />
            Open Project
          </Button>
        </VStack>
      </Box>

      <Separator borderColor="app.border" />

      {/* Recent Projects */}
      <Box>
        <Text color="app.light" fontSize="xs" fontWeight="semibold" mb={3}>
          Recent Projects
        </Text>
        <VStack gap={2} align="stretch">
          <Box
            p={2}
            borderRadius="md"
            bg="rgba(255,255,255,0.02)"
            border="1px solid"
            borderColor="app.border"
            cursor="pointer"
            _hover={{ bg: 'rgba(255,255,255,0.05)' }}
          >
            <HStack justify="space-between">
              <Text color="app.light" fontSize="xs" fontWeight="medium">
                toji3
              </Text>
              <Badge size="sm" colorScheme="green" variant="subtle">
                Active
              </Badge>
            </HStack>
            <Text color="app.text" fontSize="2xs" mt={1}>
              Desktop AI application
            </Text>
          </Box>

          <Box
            p={2}
            borderRadius="md"
            bg="rgba(255,255,255,0.02)"
            border="1px solid"
            borderColor="app.border"
            cursor="pointer"
            _hover={{ bg: 'rgba(255,255,255,0.05)' }}
          >
            <HStack justify="space-between">
              <Text color="app.light" fontSize="xs" fontWeight="medium">
                opencode-demo
              </Text>
              <Badge size="sm" colorScheme="gray" variant="subtle">
                Idle
              </Badge>
            </HStack>
            <Text color="app.text" fontSize="2xs" mt={1}>
              SDK integration example
            </Text>
          </Box>
        </VStack>
      </Box>

      <Separator borderColor="app.border" />

      {/* Activity Feed */}
      <Box>
        <Text color="app.light" fontSize="xs" fontWeight="semibold" mb={3}>
          Recent Activity
        </Text>
        <VStack gap={2} align="stretch">
          <HStack gap={2}>
            <LuGitBranch size={12} color="#808080" />
            <Text color="app.text" fontSize="2xs">
              Committed to master
            </Text>
          </HStack>
          <HStack gap={2}>
            <LuActivity size={12} color="#808080" />
            <Text color="app.text" fontSize="2xs">
              OpenCode session started
            </Text>
          </HStack>
          <HStack gap={2}>
            <LuFolderOpen size={12} color="#808080" />
            <Text color="app.text" fontSize="2xs">
              Project toji3 opened
            </Text>
          </HStack>
        </VStack>
      </Box>
      </VStack>
    </SidebarContainer>
  )
}
