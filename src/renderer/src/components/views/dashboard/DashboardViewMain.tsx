import React from 'react'
import { Box, VStack, HStack, Text, Grid, Card, Badge, Progress } from '@chakra-ui/react'
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

export function DashboardViewMain(): React.JSX.Element {
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
              <LuServer size={16} color="#33b42f" />
            </HStack>
            <HStack justify="space-between" mb={1}>
              <Text color="app.light" fontSize="lg" fontWeight="bold">
                Running
              </Text>
              <Badge colorScheme="green" size="sm">
                Online
              </Badge>
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
              <LuMessageSquare size={16} color="#33b42f" />
            </HStack>
            <HStack justify="space-between" mb={1}>
              <Text color="app.light" fontSize="lg" fontWeight="bold">
                Connected
              </Text>
              <Badge colorScheme="green" size="sm">
                Online
              </Badge>
            </HStack>
            <Text color="app.text" fontSize="xs">
              3 servers, 0 voice channels
            </Text>
          </Card.Body>
        </Card.Root>

        <Card.Root bg="app.dark" border="1px solid" borderColor="app.border">
          <Card.Body p={4}>
            <HStack justify="space-between" mb={2}>
              <Text color="app.text" fontSize="sm">
                Whisper STT
              </Text>
              <LuMic size={16} color="#fbbf24" />
            </HStack>
            <HStack justify="space-between" mb={1}>
              <Text color="app.light" fontSize="lg" fontWeight="bold">
                Initializing
              </Text>
              <Badge colorScheme="yellow" size="sm">
                Starting
              </Badge>
            </HStack>
            <Text color="app.text" fontSize="xs">
              Port 9000, loading models...
            </Text>
          </Card.Body>
        </Card.Root>

        <Card.Root bg="app.dark" border="1px solid" borderColor="app.border">
          <Card.Body p={4}>
            <HStack justify="space-between" mb={2}>
              <Text color="app.text" fontSize="sm">
                Piper TTS
              </Text>
              <LuVolumeX size={16} color="#ef4444" />
            </HStack>
            <HStack justify="space-between" mb={1}>
              <Text color="app.light" fontSize="lg" fontWeight="bold">
                Stopped
              </Text>
              <Badge colorScheme="red" size="sm">
                Offline
              </Badge>
            </HStack>
            <Text color="app.text" fontSize="xs">
              Port 9001, not configured
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
              <Badge colorScheme="blue" variant="subtle">
                Real-time
              </Badge>
            </HStack>
          </Card.Header>
          <Card.Body>
            <VStack gap={4} align="stretch">
              {/* CPU Usage */}
              <Box>
                <HStack justify="space-between" mb={2}>
                  <HStack>
                    <LuCpu size={14} color="#808080" />
                    <Text color="app.light" fontSize="sm" fontWeight="medium">
                      CPU Usage
                    </Text>
                  </HStack>
                  <Text color="app.text" fontSize="sm">
                    23%
                  </Text>
                </HStack>
                <Progress.Root value={23} size="sm" colorPalette="blue">
                  <Progress.Track>
                    <Progress.Range />
                  </Progress.Track>
                </Progress.Root>
              </Box>

              {/* Memory Usage */}
              <Box>
                <HStack justify="space-between" mb={2}>
                  <HStack>
                    <LuMemoryStick size={14} color="#808080" />
                    <Text color="app.light" fontSize="sm" fontWeight="medium">
                      Memory Usage
                    </Text>
                  </HStack>
                  <Text color="app.text" fontSize="sm">
                    1.2GB / 16GB
                  </Text>
                </HStack>
                <Progress.Root value={7.5} size="sm" colorPalette="green">
                  <Progress.Track>
                    <Progress.Range />
                  </Progress.Track>
                </Progress.Root>
              </Box>

              {/* Disk Usage */}
              <Box>
                <HStack justify="space-between" mb={2}>
                  <HStack>
                    <LuHardDrive size={14} color="#808080" />
                    <Text color="app.light" fontSize="sm" fontWeight="medium">
                      Storage (Logs/Cache)
                    </Text>
                  </HStack>
                  <Text color="app.text" fontSize="sm">
                    847MB
                  </Text>
                </HStack>
                <Progress.Root value={15} size="sm" colorPalette="yellow">
                  <Progress.Track>
                    <Progress.Range />
                  </Progress.Track>
                </Progress.Root>
              </Box>

              {/* Network Status */}
              <Box>
                <HStack justify="space-between" mb={2}>
                  <HStack>
                    <LuWifi size={14} color="#808080" />
                    <Text color="app.light" fontSize="sm" fontWeight="medium">
                      Network Latency
                    </Text>
                  </HStack>
                  <Text color="app.text" fontSize="sm">
                    45ms avg
                  </Text>
                </HStack>
                <Progress.Root value={85} size="sm" colorPalette="green">
                  <Progress.Track>
                    <Progress.Range />
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
              <LuActivity size={16} color="#ffffff" />
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
