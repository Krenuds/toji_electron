import React from 'react'
import { Box, VStack, HStack, Text, Grid, Card, Badge, Progress } from '@chakra-ui/react'
import { LuActivity, LuGitBranch, LuClock, LuCode, LuZap } from 'react-icons/lu'

export function ProjectsViewMain(): React.JSX.Element {
  return (
    <VStack align="stretch" gap={6}>
      {/* Header */}
      <Box>
        <Text color="app.light" fontSize="2xl" fontWeight="bold" mb={2}>
          Projects
        </Text>
        <Text color="app.text" fontSize="sm">
          Manage your development projects and track coding progress.
        </Text>
      </Box>

      {/* Stats Cards */}
      <Grid templateColumns="repeat(auto-fit, minmax(200px, 1fr))" gap={4}>
        <Card.Root bg="app.dark" border="1px solid" borderColor="app.border">
          <Card.Body p={4}>
            <HStack justify="space-between" mb={2}>
              <Text color="app.text" fontSize="sm">
                Active Projects
              </Text>
              <LuCode size={16} color="#808080" />
            </HStack>
            <Text color="app.light" fontSize="2xl" fontWeight="bold">
              3
            </Text>
            <Text color="app.accent" fontSize="xs" mt={1}>
              +1 this week
            </Text>
          </Card.Body>
        </Card.Root>

        <Card.Root bg="app.dark" border="1px solid" borderColor="app.border">
          <Card.Body p={4}>
            <HStack justify="space-between" mb={2}>
              <Text color="app.text" fontSize="sm">
                OpenCode Sessions
              </Text>
              <LuZap size={16} color="#808080" />
            </HStack>
            <Text color="app.light" fontSize="2xl" fontWeight="bold">
              12
            </Text>
            <Text color="app.accent" fontSize="xs" mt={1}>
              +4 today
            </Text>
          </Card.Body>
        </Card.Root>

        <Card.Root bg="app.dark" border="1px solid" borderColor="app.border">
          <Card.Body p={4}>
            <HStack justify="space-between" mb={2}>
              <Text color="app.text" fontSize="sm">
                Total Commits
              </Text>
              <LuGitBranch size={16} color="#808080" />
            </HStack>
            <Text color="app.light" fontSize="2xl" fontWeight="bold">
              47
            </Text>
            <Text color="app.accent" fontSize="xs" mt={1}>
              +8 this week
            </Text>
          </Card.Body>
        </Card.Root>

        <Card.Root bg="app.dark" border="1px solid" borderColor="app.border">
          <Card.Body p={4}>
            <HStack justify="space-between" mb={2}>
              <Text color="app.text" fontSize="sm">
                Hours Coded
              </Text>
              <LuClock size={16} color="#808080" />
            </HStack>
            <Text color="app.light" fontSize="2xl" fontWeight="bold">
              23.5
            </Text>
            <Text color="app.accent" fontSize="xs" mt={1}>
              +6.2 this week
            </Text>
          </Card.Body>
        </Card.Root>
      </Grid>

      {/* Project Status */}
      <Grid templateColumns="2fr 1fr" gap={6}>
        {/* Active Projects */}
        <Card.Root bg="app.dark" border="1px solid" borderColor="app.border">
          <Card.Header>
            <HStack justify="space-between">
              <Text color="app.light" fontSize="lg" fontWeight="semibold">
                Active Projects
              </Text>
              <Badge colorScheme="green" variant="subtle">
                3 Active
              </Badge>
            </HStack>
          </Card.Header>
          <Card.Body>
            <VStack gap={4} align="stretch">
              <Box
                p={3}
                borderRadius="md"
                bg="rgba(255,255,255,0.02)"
                border="1px solid"
                borderColor="app.border"
              >
                <HStack justify="space-between" mb={2}>
                  <Text color="app.light" fontSize="sm" fontWeight="medium">
                    toji3
                  </Text>
                  <Badge colorScheme="green" size="sm">
                    Active
                  </Badge>
                </HStack>
                <Text color="app.text" fontSize="xs" mb={3}>
                  Desktop AI application with OpenCode integration
                </Text>
                <Box>
                  <HStack justify="space-between" mb={1}>
                    <Text color="app.text" fontSize="2xs">
                      Progress
                    </Text>
                    <Text color="app.text" fontSize="2xs">
                      75%
                    </Text>
                  </HStack>
                  <Progress.Root value={75} size="sm" colorPalette="green">
                    <Progress.Track>
                      <Progress.Range />
                    </Progress.Track>
                  </Progress.Root>
                </Box>
              </Box>

              <Box
                p={3}
                borderRadius="md"
                bg="rgba(255,255,255,0.02)"
                border="1px solid"
                borderColor="app.border"
              >
                <HStack justify="space-between" mb={2}>
                  <Text color="app.light" fontSize="sm" fontWeight="medium">
                    opencode-demo
                  </Text>
                  <Badge colorScheme="blue" size="sm">
                    Development
                  </Badge>
                </HStack>
                <Text color="app.text" fontSize="xs" mb={3}>
                  SDK integration examples and documentation
                </Text>
                <Box>
                  <HStack justify="space-between" mb={1}>
                    <Text color="app.text" fontSize="2xs">
                      Progress
                    </Text>
                    <Text color="app.text" fontSize="2xs">
                      45%
                    </Text>
                  </HStack>
                  <Progress.Root value={45} size="sm" colorPalette="blue">
                    <Progress.Track>
                      <Progress.Range />
                    </Progress.Track>
                  </Progress.Root>
                </Box>
              </Box>

              <Box
                p={3}
                borderRadius="md"
                bg="rgba(255,255,255,0.02)"
                border="1px solid"
                borderColor="app.border"
              >
                <HStack justify="space-between" mb={2}>
                  <Text color="app.light" fontSize="sm" fontWeight="medium">
                    ai-toolchain
                  </Text>
                  <Badge colorScheme="yellow" size="sm">
                    Planning
                  </Badge>
                </HStack>
                <Text color="app.text" fontSize="xs" mb={3}>
                  AI development toolchain automation
                </Text>
                <Box>
                  <HStack justify="space-between" mb={1}>
                    <Text color="app.text" fontSize="2xs">
                      Progress
                    </Text>
                    <Text color="app.text" fontSize="2xs">
                      15%
                    </Text>
                  </HStack>
                  <Progress.Root value={15} size="sm" colorPalette="yellow">
                    <Progress.Track>
                      <Progress.Range />
                    </Progress.Track>
                  </Progress.Root>
                </Box>
              </Box>
            </VStack>
          </Card.Body>
        </Card.Root>

        {/* Recent Activity */}
        <Card.Root bg="app.dark" border="1px solid" borderColor="app.border">
          <Card.Header>
            <HStack>
              <LuActivity size={16} color="#ffffff" />
              <Text color="app.light" fontSize="lg" fontWeight="semibold">
                Recent Activity
              </Text>
            </HStack>
          </Card.Header>
          <Card.Body>
            <VStack gap={3} align="stretch">
              <HStack gap={3}>
                <Box w={2} h={2} borderRadius="full" bg="app.accent" />
                <Box flex={1}>
                  <Text color="app.light" fontSize="xs" fontWeight="medium">
                    Custom titlebar implemented
                  </Text>
                  <Text color="app.text" fontSize="2xs">
                    2 minutes ago
                  </Text>
                </Box>
              </HStack>

              <HStack gap={3}>
                <Box w={2} h={2} borderRadius="full" bg="blue.400" />
                <Box flex={1}>
                  <Text color="app.light" fontSize="xs" fontWeight="medium">
                    OpenCode session started
                  </Text>
                  <Text color="app.text" fontSize="2xs">
                    15 minutes ago
                  </Text>
                </Box>
              </HStack>

              <HStack gap={3}>
                <Box w={2} h={2} borderRadius="full" bg="gray.400" />
                <Box flex={1}>
                  <Text color="app.light" fontSize="xs" fontWeight="medium">
                    Project toji3 opened
                  </Text>
                  <Text color="app.text" fontSize="2xs">
                    1 hour ago
                  </Text>
                </Box>
              </HStack>

              <HStack gap={3}>
                <Box w={2} h={2} borderRadius="full" bg="green.400" />
                <Box flex={1}>
                  <Text color="app.light" fontSize="xs" fontWeight="medium">
                    Dependencies updated
                  </Text>
                  <Text color="app.text" fontSize="2xs">
                    3 hours ago
                  </Text>
                </Box>
              </HStack>

              <HStack gap={3}>
                <Box w={2} h={2} borderRadius="full" bg="purple.400" />
                <Box flex={1}>
                  <Text color="app.light" fontSize="xs" fontWeight="medium">
                    Theme system configured
                  </Text>
                  <Text color="app.text" fontSize="2xs">
                    Yesterday
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
