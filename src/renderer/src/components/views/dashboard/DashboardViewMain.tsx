import React from 'react'
import { Box, VStack, HStack, Text, Grid, Card, Progress } from '@chakra-ui/react'
import {
  LuActivity,
  LuServer,
  LuWifi,
  LuHardDrive,
  LuCpu,
  LuMemoryStick,
  LuMessageSquare,
  LuMic,
  LuVolumeX
} from 'react-icons/lu'
import { StatusBadge } from '../../StatusBadge'
import { useServerStatus } from '../../../hooks/useServerStatus'

export function DashboardViewMain(): React.JSX.Element {
  const serverStatus = useServerStatus()
  return (
    <VStack align="stretch" gap={6}>
      {/* Header */}
      <Box>
        <Text color="app.light" fontSize="2xl" fontWeight="bold" mb={2}>
          Toji System Dashboard
        </Text>
        <Text color="app.text" fontSize="sm">
          Monitor and manage your universal computer control agent.
        </Text>
      </Box>

      {/* Service Status Cards */}
      <Grid templateColumns="repeat(auto-fit, minmax(220px, 1fr))" gap={4}>
        <Card.Root bg="app.dark" border="1px solid" borderColor="app.border">
          <Card.Body p={4}>
            <HStack justify="space-between" mb={2}>
              <Text color="app.text" fontSize="sm">
                Toji Core Service
              </Text>
              <Box color={serverStatus === 'running' ? 'app.accent' : 'app.text'}>
                <LuServer size={16} />
              </Box>
            </HStack>
            <HStack justify="space-between" mb={1}>
              <Text color="app.light" fontSize="lg" fontWeight="bold">
                {serverStatus === 'running'
                  ? 'Running'
                  : serverStatus === 'checking'
                    ? 'Checking...'
                    : 'Stopped'}
              </Text>
              <StatusBadge status={serverStatus} />
            </HStack>
            <Text color="app.text" fontSize="xs">
              Uptime: 2h 34m
            </Text>
          </Card.Body>
        </Card.Root>

        <Card.Root bg="app.dark" border="1px solid" borderColor="app.border">
          <Card.Body p={4}>
            <HStack justify="space-between" mb={2}>
              <Text color="app.text" fontSize="sm">
                Discord Bot
              </Text>
              <Box color="app.text">
                <LuMessageSquare size={16} />
              </Box>
            </HStack>
            <HStack justify="space-between" mb={1}>
              <Text color="app.text" fontSize="lg" fontWeight="bold">
                Not Configured
              </Text>
              <StatusBadge status="stub" />
            </HStack>
            <Text color="app.text" fontSize="xs">
              Discord integration coming soon
            </Text>
          </Card.Body>
        </Card.Root>

        <Card.Root bg="app.dark" border="1px solid" borderColor="app.border">
          <Card.Body p={4}>
            <HStack justify="space-between" mb={2}>
              <Text color="app.text" fontSize="sm">
                Whisper STT
              </Text>
              <Box color="app.text">
                <LuMic size={16} />
              </Box>
            </HStack>
            <HStack justify="space-between" mb={1}>
              <Text color="app.text" fontSize="lg" fontWeight="bold">
                Not Available
              </Text>
              <StatusBadge status="stub" />
            </HStack>
            <Text color="app.text" fontSize="xs">
              Voice services not implemented
            </Text>
          </Card.Body>
        </Card.Root>

        <Card.Root bg="app.dark" border="1px solid" borderColor="app.border">
          <Card.Body p={4}>
            <HStack justify="space-between" mb={2}>
              <Text color="app.text" fontSize="sm">
                Piper TTS
              </Text>
              <Box color="app.error">
                <LuVolumeX size={16} />
              </Box>
            </HStack>
            <HStack justify="space-between" mb={1}>
              <Text color="app.text" fontSize="lg" fontWeight="bold">
                Not Available
              </Text>
              <StatusBadge status="stub" />
            </HStack>
            <Text color="app.text" fontSize="xs">
              TTS not implemented
            </Text>
          </Card.Body>
        </Card.Root>
      </Grid>

      {/* System Resources & Interface Status */}
      <Grid templateColumns="2fr 1fr" gap={6}>
        {/* System Resources */}
        <Card.Root bg="app.dark" border="1px solid" borderColor="app.border">
          <Card.Header>
            <HStack justify="space-between">
              <Text color="app.light" fontSize="lg" fontWeight="semibold">
                System Resources
              </Text>
              <StatusBadge status="stub" />
            </HStack>
          </Card.Header>
          <Card.Body>
            <VStack gap={4} align="stretch">
              {/* CPU Usage */}
              <Box>
                <HStack justify="space-between" mb={2}>
                  <HStack>
                    <Box color="app.text">
                      <LuCpu size={14} />
                    </Box>
                    <Text color="app.light" fontSize="sm" fontWeight="medium">
                      CPU Usage
                    </Text>
                  </HStack>
                  <Text color="app.text" fontSize="sm">
                    --%
                  </Text>
                </HStack>
                <Progress.Root value={0} size="sm">
                  <Progress.Track bg="app.border">
                    <Progress.Range bg="app.border" />
                  </Progress.Track>
                </Progress.Root>
              </Box>

              {/* Memory Usage */}
              <Box>
                <HStack justify="space-between" mb={2}>
                  <HStack>
                    <Box color="app.text">
                      <LuMemoryStick size={14} />
                    </Box>
                    <Text color="app.light" fontSize="sm" fontWeight="medium">
                      Memory Usage
                    </Text>
                  </HStack>
                  <Text color="app.text" fontSize="sm">
                    -- / --
                  </Text>
                </HStack>
                <Progress.Root value={0} size="sm">
                  <Progress.Track bg="app.border">
                    <Progress.Range bg="app.border" />
                  </Progress.Track>
                </Progress.Root>
              </Box>

              {/* Disk Usage */}
              <Box>
                <HStack justify="space-between" mb={2}>
                  <HStack>
                    <Box color="app.text">
                      <LuHardDrive size={14} />
                    </Box>
                    <Text color="app.light" fontSize="sm" fontWeight="medium">
                      Storage (Logs/Cache)
                    </Text>
                  </HStack>
                  <Text color="app.text" fontSize="sm">
                    --
                  </Text>
                </HStack>
                <Progress.Root value={0} size="sm">
                  <Progress.Track bg="app.border">
                    <Progress.Range bg="app.border" />
                  </Progress.Track>
                </Progress.Root>
              </Box>

              {/* Network Status */}
              <Box>
                <HStack justify="space-between" mb={2}>
                  <HStack>
                    <Box color="app.text">
                      <LuWifi size={14} />
                    </Box>
                    <Text color="app.light" fontSize="sm" fontWeight="medium">
                      Network Latency
                    </Text>
                  </HStack>
                  <Text color="app.text" fontSize="sm">
                    --
                  </Text>
                </HStack>
                <Progress.Root value={0} size="sm">
                  <Progress.Track bg="app.border">
                    <Progress.Range bg="app.border" />
                  </Progress.Track>
                </Progress.Root>
              </Box>
            </VStack>
          </Card.Body>
        </Card.Root>

        {/* Interface Connections */}
        <Card.Root bg="app.dark" border="1px solid" borderColor="app.border">
          <Card.Header>
            <HStack>
              <Box color="app.light">
                <LuActivity size={16} />
              </Box>
              <Text color="app.light" fontSize="lg" fontWeight="semibold">
                Active Interfaces
              </Text>
            </HStack>
          </Card.Header>
          <Card.Body>
            <VStack gap={3} align="stretch">
              <HStack gap={3}>
                <Box w={2} h={2} borderRadius="full" bg="app.accent" />
                <Box flex={1}>
                  <Text color="app.light" fontSize="xs" fontWeight="medium">
                    Electron UI
                  </Text>
                  <Text color="app.text" fontSize="2xs">
                    This interface - Active
                  </Text>
                </Box>
              </HStack>

              <HStack gap={3}>
                <Box w={2} h={2} borderRadius="full" bg="blue.400" />
                <Box flex={1}>
                  <Text color="app.light" fontSize="xs" fontWeight="medium">
                    Discord Bot
                  </Text>
                  <Text color="app.text" fontSize="2xs">
                    3 servers connected
                  </Text>
                </Box>
              </HStack>

              <HStack gap={3}>
                <Box w={2} h={2} borderRadius="full" bg="gray.400" />
                <Box flex={1}>
                  <Text color="app.light" fontSize="xs" fontWeight="medium">
                    Slack Integration
                  </Text>
                  <Text color="app.text" fontSize="2xs">
                    Not configured
                  </Text>
                </Box>
              </HStack>

              <HStack gap={3}>
                <Box w={2} h={2} borderRadius="full" bg="purple.400" />
                <Box flex={1}>
                  <Text color="app.light" fontSize="xs" fontWeight="medium">
                    MCP Bridge
                  </Text>
                  <Text color="app.text" fontSize="2xs">
                    Claude Code CLI ready
                  </Text>
                </Box>
              </HStack>

              <HStack gap={3}>
                <Box w={2} h={2} borderRadius="full" bg="orange.400" />
                <Box flex={1}>
                  <Text color="app.light" fontSize="xs" fontWeight="medium">
                    Voice Channel
                  </Text>
                  <Text color="app.text" fontSize="2xs">
                    No active connections
                  </Text>
                </Box>
              </HStack>
            </VStack>
          </Card.Body>
        </Card.Root>
      </Grid>
    </VStack>
  )
}
