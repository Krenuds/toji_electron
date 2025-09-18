import React from 'react'
import { Box, VStack, HStack, Text, Badge, Button, Separator } from '@chakra-ui/react'
import { LuPlus, LuMessageCircle, LuActivity, LuServer } from 'react-icons/lu'
import { SidebarContainer } from '../../SidebarContainer'

export function ChatViewSidebar(): React.JSX.Element {
  return (
    <SidebarContainer>
      <VStack align="stretch" gap={4}>
        {/* Header */}
        <Box>
          <Text color="app.light" fontSize="sm" fontWeight="bold" mb={2}>
            Chat with Toji
          </Text>
          <Text color="app.text" fontSize="xs">
            AI-powered coding assistant
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
              New Chat
            </Button>
            <Button
              variant="ghost"
              size="sm"
              justifyContent="flex-start"
              color="app.text"
              _hover={{ color: 'app.light', bg: 'rgba(255,255,255,0.05)' }}
            >
              <LuServer size={14} />
              Start OpenCode
            </Button>
          </VStack>
        </Box>

        <Separator borderColor="app.border" />

        {/* Server Status */}
        <Box>
          <Text color="app.light" fontSize="xs" fontWeight="semibold" mb={3}>
            Server Status
          </Text>
          <Box
            p={2}
            borderRadius="md"
            bg="rgba(255,255,255,0.02)"
            border="1px solid"
            borderColor="app.border"
          >
            <HStack justify="space-between" mb={2}>
              <Text color="app.light" fontSize="xs" fontWeight="medium">
                OpenCode Server
              </Text>
              <Badge size="sm" colorScheme="gray" variant="subtle">
                Stopped
              </Badge>
            </HStack>
            <Text color="app.text" fontSize="2xs">
              Working Directory: /toji3
            </Text>
          </Box>
        </Box>

        <Separator borderColor="app.border" />

        {/* Recent Sessions */}
        <Box>
          <Text color="app.light" fontSize="xs" fontWeight="semibold" mb={3}>
            Recent Sessions
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
                  General Chat
                </Text>
                <Badge size="sm" colorScheme="green" variant="subtle">
                  Active
                </Badge>
              </HStack>
              <Text color="app.text" fontSize="2xs" mt={1}>
                Started 2 minutes ago
              </Text>
            </Box>

            <Text color="app.text" fontSize="2xs" textAlign="center" py={2}>
              No other sessions yet
            </Text>
          </VStack>
        </Box>

        <Separator borderColor="app.border" />

        {/* Activity */}
        <Box>
          <Text color="app.light" fontSize="xs" fontWeight="semibold" mb={3}>
            Recent Activity
          </Text>
          <VStack gap={2} align="stretch">
            <HStack gap={2}>
              <LuMessageCircle size={12} color="#808080" />
              <Text color="app.text" fontSize="2xs">
                Chat session created
              </Text>
            </HStack>
            <HStack gap={2}>
              <LuActivity size={12} color="#808080" />
              <Text color="app.text" fontSize="2xs">
                Server initialization ready
              </Text>
            </HStack>
          </VStack>
        </Box>
      </VStack>
    </SidebarContainer>
  )
}