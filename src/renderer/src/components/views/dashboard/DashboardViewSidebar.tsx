import React from 'react'
import { Box, VStack, HStack, Text, Badge, Button, Separator } from '@chakra-ui/react'
import {
  LuPlay,
  LuSquare,
  LuRotateCcw,
  LuDownload,
  LuSettings,
  LuFileText,
  LuTriangleAlert
} from 'react-icons/lu'

export function DashboardViewSidebar(): React.JSX.Element {
  return (
    <VStack align="stretch" gap={4}>
      {/* Header */}
      <Box>
        <Text color="app.light" fontSize="sm" fontWeight="bold" mb={2}>
          System Control
        </Text>
        <Text color="app.text" fontSize="xs">
          Manage Toji services and dependencies
        </Text>
      </Box>

      <Separator borderColor="app.border" />

      {/* Service Controls */}
      <Box>
        <Text color="app.light" fontSize="xs" fontWeight="semibold" mb={3}>
          Service Management
        </Text>
        <VStack gap={2} align="stretch">
          <Button
            variant="ghost"
            size="sm"
            justifyContent="flex-start"
            color="app.text"
            _hover={{ color: 'app.light', bg: 'rgba(255,255,255,0.05)' }}
          >
            <LuPlay size={14} />
            Start All Services
          </Button>
          <Button
            variant="ghost"
            size="sm"
            justifyContent="flex-start"
            color="app.text"
            _hover={{ color: 'app.light', bg: 'rgba(255,255,255,0.05)' }}
          >
            <LuSquare size={14} />
            Stop All Services
          </Button>
          <Button
            variant="ghost"
            size="sm"
            justifyContent="flex-start"
            color="app.text"
            _hover={{ color: 'app.light', bg: 'rgba(255,255,255,0.05)' }}
          >
            <LuRotateCcw size={14} />
            Restart Services
          </Button>
        </VStack>
      </Box>

      <Separator borderColor="app.border" />

      {/* Binary Management */}
      <Box>
        <Text color="app.light" fontSize="xs" fontWeight="semibold" mb={3}>
          Dependencies
        </Text>
        <VStack gap={2} align="stretch">
          <Button
            variant="ghost"
            size="sm"
            justifyContent="flex-start"
            color="app.text"
            _hover={{ color: 'app.light', bg: 'rgba(255,255,255,0.05)' }}
          >
            <LuDownload size={14} />
            Install Dependencies
          </Button>
          <Button
            variant="ghost"
            size="sm"
            justifyContent="flex-start"
            color="app.text"
            _hover={{ color: 'app.light', bg: 'rgba(255,255,255,0.05)' }}
          >
            <LuSettings size={14} />
            Configure Services
          </Button>
        </VStack>
      </Box>

      <Separator borderColor="app.border" />

      {/* Service Status Overview */}
      <Box>
        <Text color="app.light" fontSize="xs" fontWeight="semibold" mb={3}>
          Quick Status
        </Text>
        <VStack gap={2} align="stretch">
          <Box
            p={2}
            borderRadius="md"
            bg="rgba(255,255,255,0.02)"
            border="1px solid"
            borderColor="app.border"
          >
            <HStack justify="space-between">
              <Text color="app.light" fontSize="xs" fontWeight="medium">
                Core Service
              </Text>
              <Badge size="sm" colorScheme="green" variant="subtle">
                Running
              </Badge>
            </HStack>
            <Text color="app.text" fontSize="2xs" mt={1}>
              System agent operational
            </Text>
          </Box>

          <Box
            p={2}
            borderRadius="md"
            bg="rgba(255,255,255,0.02)"
            border="1px solid"
            borderColor="app.border"
          >
            <HStack justify="space-between">
              <Text color="app.light" fontSize="xs" fontWeight="medium">
                Discord Bot
              </Text>
              <Badge size="sm" colorScheme="green" variant="subtle">
                Connected
              </Badge>
            </HStack>
            <Text color="app.text" fontSize="2xs" mt={1}>
              3 servers, voice ready
            </Text>
          </Box>

          <Box
            p={2}
            borderRadius="md"
            bg="rgba(255,255,255,0.02)"
            border="1px solid"
            borderColor="app.border"
          >
            <HStack justify="space-between">
              <Text color="app.light" fontSize="xs" fontWeight="medium">
                Voice Services
              </Text>
              <Badge size="sm" colorScheme="yellow" variant="subtle">
                Partial
              </Badge>
            </HStack>
            <Text color="app.text" fontSize="2xs" mt={1}>
              STT loading, TTS offline
            </Text>
          </Box>
        </VStack>
      </Box>

      <Separator borderColor="app.border" />

      {/* Diagnostics */}
      <Box>
        <Text color="app.light" fontSize="xs" fontWeight="semibold" mb={3}>
          Diagnostics
        </Text>
        <VStack gap={2} align="stretch">
          <Button
            variant="ghost"
            size="sm"
            justifyContent="flex-start"
            color="app.text"
            _hover={{ color: 'app.light', bg: 'rgba(255,255,255,0.05)' }}
          >
            <LuFileText size={14} />
            View Logs
          </Button>
          <Button
            variant="ghost"
            size="sm"
            justifyContent="flex-start"
            color="app.text"
            _hover={{ color: 'app.light', bg: 'rgba(255,255,255,0.05)' }}
          >
            <LuTriangleAlert size={14} />
            Test Connections
          </Button>
        </VStack>
      </Box>
    </VStack>
  )
}