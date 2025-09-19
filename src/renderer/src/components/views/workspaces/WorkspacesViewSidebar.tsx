import React from 'react'
import { Box, VStack, HStack, Text, Badge, Button, Separator } from '@chakra-ui/react'
import { LuPlus, LuFolderOpen, LuActivity, LuGitBranch } from 'react-icons/lu'
import { SidebarContainer } from '../../SidebarContainer'

export function WorkspacesViewSidebar(): React.JSX.Element {
  return (
    <SidebarContainer>
      <VStack align="stretch" gap={4}>
        {/* Header */}
        <Box>
          <Text color="app.light" fontSize="sm" fontWeight="bold" mb={2}>
            Workspace Management
          </Text>
          <Text color="app.text" fontSize="xs">
            Working directories and OpenCode projects
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
              Change Workspace
            </Button>
            <Button
              variant="ghost"
              size="sm"
              justifyContent="flex-start"
              color="app.text"
              _hover={{ color: 'app.light', bg: 'rgba(255,255,255,0.05)' }}
            >
              <LuFolderOpen size={14} />
              Discover Projects
            </Button>
          </VStack>
        </Box>

        <Separator borderColor="app.border" />

        {/* Recent OpenCode Projects */}
        <Box>
          <Text color="app.light" fontSize="xs" fontWeight="semibold" mb={3}>
            Recent OpenCode Projects
          </Text>
          <VStack gap={2} align="stretch">
            <Box
              p={2}
              borderRadius="md"
              border="1px solid"
              borderColor="app.border"
              _hover={{ bg: 'rgba(255,255,255,0.02)' }}
              cursor="pointer"
            >
              <HStack justify="space-between" mb={1}>
                <Text color="app.light" fontSize="xs" fontWeight="medium">
                  toji3
                </Text>
                <Badge colorPalette="green" size="xs">
                  Active
                </Badge>
              </HStack>
              <Text color="app.text" fontSize="xs" lineClamp={1}>
                C:/Users/donth/toji3
              </Text>
            </Box>

            <Box
              p={2}
              borderRadius="md"
              border="1px solid"
              borderColor="app.border"
              _hover={{ bg: 'rgba(255,255,255,0.02)' }}
              cursor="pointer"
            >
              <HStack justify="space-between" mb={1}>
                <Text color="app.light" fontSize="xs" fontWeight="medium">
                  CNC
                </Text>
                <Badge colorPalette="gray" size="xs">
                  Idle
                </Badge>
              </HStack>
              <Text color="app.text" fontSize="xs" lineClamp={1}>
                C:/Users/donth/Documents/GitHub/CNC
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
            <HStack gap={2} fontSize="xs">
              <LuActivity size={12} color="#33b42f" />
              <Text color="app.text">Session created in toji3</Text>
            </HStack>
            <HStack gap={2} fontSize="xs">
              <LuGitBranch size={12} color="#808080" />
              <Text color="app.text">Workspace changed to Downloads</Text>
            </HStack>
            <HStack gap={2} fontSize="xs">
              <LuActivity size={12} color="#33b42f" />
              <Text color="app.text">3 projects discovered</Text>
            </HStack>
          </VStack>
        </Box>
      </VStack>
    </SidebarContainer>
  )
}