import React from 'react'
import {
  Box,
  VStack,
  HStack,
  Text,
  Badge,
  Button,
  Separator,
  Card,
  Alert,
  Spinner,
  Progress,
  Stat
} from '@chakra-ui/react'
import {
  LuPlay,
  LuSquare,
  LuRotateCcw,
  LuDownload,
  LuSettings,
  LuFileText,
  LuTriangleAlert,
  LuCheck
} from 'react-icons/lu'
import { useBinaryStatus } from '../../../hooks/useBinaryStatus'
import { SidebarContainer } from '../../SidebarContainer'

export function DashboardViewSidebar(): React.JSX.Element {
  const { info, loading, error, installing, installProgress, install } = useBinaryStatus()

  const getBinaryStatusAlert = (): React.ReactNode => {
    if (loading) {
      return (
        <Alert.Root status="info" size="sm">
          <Alert.Indicator>
            <Spinner size="sm" />
          </Alert.Indicator>
          <Alert.Title>Checking binary status...</Alert.Title>
        </Alert.Root>
      )
    }

    if (error) {
      return (
        <Alert.Root status="error" size="sm">
          <Alert.Indicator>
            <LuTriangleAlert />
          </Alert.Indicator>
          <Alert.Content>
            <Alert.Title>Binary Error</Alert.Title>
            <Alert.Description>{error}</Alert.Description>
          </Alert.Content>
        </Alert.Root>
      )
    }

    if (info?.installed) {
      return (
        <Alert.Root status="success" size="sm">
          <Alert.Indicator>
            <LuCheck />
          </Alert.Indicator>
          <Alert.Title>OpenCode binary installed</Alert.Title>
        </Alert.Root>
      )
    }

    return (
      <Alert.Root status="warning" size="sm">
        <Alert.Indicator>
          <LuTriangleAlert />
        </Alert.Indicator>
        <Alert.Content>
          <Alert.Title>Binary not installed</Alert.Title>
          <Alert.Description>OpenCode binary needs to be installed</Alert.Description>
        </Alert.Content>
      </Alert.Root>
    )
  }

  return (
    <SidebarContainer>
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

        {/* Dependencies Management */}
        <Card.Root
          size="sm"
          bg="rgba(255,255,255,0.02)"
          border="1px solid"
          borderColor="app.border"
        >
          <Card.Header pb={2}>
            <Text color="app.light" fontSize="xs" fontWeight="semibold">
              Dependencies
            </Text>
          </Card.Header>
          <Card.Body pt={0}>
            <VStack gap={3} align="stretch">
              {/* Binary Status Alert */}
              {getBinaryStatusAlert()}

              {/* Installation Progress */}
              {installing && installProgress && (
                <Box>
                  <Text color="app.text" fontSize="2xs" mb={1}>
                    {installProgress.message || `${installProgress.stage}...`}
                  </Text>
                  {installProgress.progress !== undefined && (
                    <Progress.Root value={installProgress.progress} size="sm" colorPalette="blue">
                      <Progress.Track>
                        <Progress.Range />
                      </Progress.Track>
                    </Progress.Root>
                  )}
                </Box>
              )}

              {/* Binary Info Stats */}
              {info && (
                <VStack gap={2} align="stretch">
                  <Stat.Root size="sm">
                    <Stat.Label color="app.text" fontSize="2xs">
                      Binary Path
                    </Stat.Label>
                    <Stat.ValueText color="app.light" fontSize="2xs" fontFamily="mono">
                      {info.path.split('\\').pop() || info.path}
                    </Stat.ValueText>
                  </Stat.Root>
                  <Stat.Root size="sm">
                    <Stat.Label color="app.text" fontSize="2xs">
                      Last Checked
                    </Stat.Label>
                    <Stat.ValueText color="app.light" fontSize="2xs">
                      {new Date(info.lastChecked).toLocaleTimeString()}
                    </Stat.ValueText>
                  </Stat.Root>
                </VStack>
              )}

              {/* Action Buttons */}
              <VStack gap={2} align="stretch">
                <Button
                  variant="ghost"
                  size="sm"
                  justifyContent="flex-start"
                  color="app.text"
                  _hover={{ color: 'app.light', bg: 'rgba(255,255,255,0.05)' }}
                  disabled={installing}
                  loading={installing}
                  onClick={install}
                >
                  <LuDownload size={14} />
                  {info?.installed ? 'Reinstall Dependencies' : 'Install Dependencies'}
                </Button>
                <Button
                  variant="ghost"
                  size="sm"
                  justifyContent="flex-start"
                  color="app.text"
                  _hover={{ color: 'app.light', bg: 'rgba(255,255,255,0.05)' }}
                  disabled={!info?.installed}
                >
                  <LuSettings size={14} />
                  Configure Services
                </Button>
              </VStack>

              {/* Diagnostic Actions */}
              <Separator borderColor="app.border" />
              <VStack gap={2} align="stretch">
                <Text color="app.text" fontSize="2xs" fontWeight="semibold" mb={1}>
                  Diagnostics
                </Text>
                <Button
                  variant="ghost"
                  size="sm"
                  justifyContent="flex-start"
                  color="app.text"
                  _hover={{ color: 'app.light', bg: 'rgba(255,255,255,0.05)' }}
                  disabled={!info?.installed}
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
                  disabled={!info?.installed}
                >
                  <LuTriangleAlert size={14} />
                  Test Connections
                </Button>
              </VStack>
            </VStack>
          </Card.Body>
        </Card.Root>

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
      </VStack>
    </SidebarContainer>
  )
}
