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
import { LuDownload, LuTriangleAlert, LuCheck, LuRefreshCw } from 'react-icons/lu'
import { useBinaryStatus } from '../../../hooks/useBinaryStatus'
import { useOpenCodeLogs } from '../../../hooks/useOpenCodeLogs'
import { SidebarContainer } from '../../SidebarContainer'
import { StatusBadge } from '../../StatusBadge'
import { useServerStatus } from '../../../hooks/useServerStatus'

export function DashboardViewSidebar(): React.JSX.Element {
  const { info, loading, error, installing, installProgress, install } = useBinaryStatus()
  const { logs, loading: logsLoading, error: logsError, refresh: refreshLogs } = useOpenCodeLogs()
  const serverStatus = useServerStatus()

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
        {/* Dependencies Management */}
        <Card.Root
          size="sm"
          bg="rgba(255,255,255,0.02)"
          border="1px solid"
          borderColor="app.border"
        >
          <Card.Header pb={2}>
            <Text color="app.light" fontSize="xs" fontWeight="semibold">
              OpenCode
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
                      Binary Name
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
              </VStack>

              {/* Logs Display */}
              <Separator borderColor="app.border" />
              <VStack gap={2} align="stretch">
                <HStack justify="space-between" align="center">
                  <Text color="app.text" fontSize="2xs" fontWeight="semibold">
                    OpenCode Logs
                  </Text>
                  <Button
                    variant="ghost"
                    size="xs"
                    color="app.text"
                    _hover={{ color: 'app.light' }}
                    onClick={refreshLogs}
                    loading={logsLoading}
                    disabled={!info?.installed}
                  >
                    <LuRefreshCw size={12} />
                  </Button>
                </HStack>

                {logsError && (
                  <Alert.Root status="error" size="sm">
                    <Alert.Indicator>
                      <LuTriangleAlert />
                    </Alert.Indicator>
                    <Alert.Description fontSize="2xs">{logsError}</Alert.Description>
                  </Alert.Root>
                )}

                <Box
                  bg="rgba(0,0,0,0.3)"
                  border="1px solid"
                  borderColor="app.border"
                  borderRadius="md"
                  p={2}
                  maxH="120px"
                  overflowY="auto"
                >
                  {logsLoading ? (
                    <HStack justify="center" py={2}>
                      <Spinner size="xs" />
                      <Text color="app.text" fontSize="2xs">
                        Loading logs...
                      </Text>
                    </HStack>
                  ) : logs ? (
                    <Text
                      color="app.light"
                      fontSize="2xs"
                      fontFamily="mono"
                      whiteSpace="pre-wrap"
                      lineHeight="1.2"
                    >
                      {logs.slice(-1000)} {/* Show last 1000 characters for now */}
                    </Text>
                  ) : (
                    <Text color="app.text" fontSize="2xs" fontStyle="italic">
                      No logs available
                    </Text>
                  )}
                </Box>

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
                <StatusBadge status={serverStatus} />
              </HStack>
              <Text color="app.text" fontSize="2xs" mt={1}>
                {serverStatus === 'running'
                  ? 'OpenCode server operational'
                  : serverStatus === 'checking'
                    ? 'Checking status...'
                    : 'Server stopped'}
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
                <Text color="app.text" fontSize="xs" fontWeight="medium">
                  Discord Bot
                </Text>
                <StatusBadge status="stub" />
              </HStack>
              <Text color="app.text" fontSize="2xs" mt={1}>
                Not configured
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
                <Text color="app.text" fontSize="xs" fontWeight="medium">
                  Voice Services
                </Text>
                <StatusBadge status="stub" />
              </HStack>
              <Text color="app.text" fontSize="2xs" mt={1}>
                Not available
              </Text>
            </Box>
          </VStack>
        </Box>
      </VStack>
    </SidebarContainer>
  )
}
