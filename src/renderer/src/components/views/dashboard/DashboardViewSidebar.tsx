import React from 'react'
import {
  Box,
  VStack,
  HStack,
  Text,
  Button,
  Separator,
  Card,
  Alert,
  Spinner,
  Progress,
  Stat
} from '@chakra-ui/react'
import {
  LuDownload,
  LuTriangleAlert,
  LuCheck,
  LuRefreshCw,
  LuPlay,
  LuSquare,
  LuServer
} from 'react-icons/lu'
import { useBinaryStatus } from '../../../hooks/useBinaryStatus'
import { useOpenCodeLogs } from '../../../hooks/useOpenCodeLogs'
import { useServerStatus } from '../../../hooks/useServerStatus'
import { SidebarContainer } from '../../SidebarContainer'

export function DashboardViewSidebar(): React.JSX.Element {
  const { info, loading, error, installing, installProgress, install } = useBinaryStatus()
  const { logs, loading: logsLoading, error: logsError, refresh: refreshLogs } = useOpenCodeLogs()
  const {
    status: serverStatus,
    loading: serverLoading,
    error: serverError,
    startServer,
    stopServer
  } = useServerStatus()

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
          border="2px solid"
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
                      {info.path?.split('\\').pop() || info.path || 'Unknown'}
                    </Stat.ValueText>
                  </Stat.Root>
                  <Stat.Root size="sm">
                    <Stat.Label color="app.text" fontSize="2xs">
                      Last Checked
                    </Stat.Label>
                    <Stat.ValueText color="app.light" fontSize="2xs">
                      {new Date().toLocaleTimeString()}
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

        {/* Server Control */}
        <Card.Root
          size="sm"
          bg="rgba(255,255,255,0.02)"
          border="2px solid"
          borderColor="app.border"
        >
          <Card.Header pb={2}>
            <HStack justify="space-between">
              <HStack gap={2}>
                <LuServer size={14} />
                <Text color="app.light" fontSize="xs" fontWeight="semibold">
                  Server Control
                </Text>
              </HStack>
              <Box
                w={2}
                h={2}
                borderRadius="full"
                bg={serverStatus.isRunning ? 'green.500' : 'red.500'}
                animation={
                  serverStatus.isRunning
                    ? 'pulse 2s cubic-bezier(0.4, 0, 0.6, 1) infinite'
                    : undefined
                }
              />
            </HStack>
          </Card.Header>
          <Card.Body pt={0}>
            <VStack gap={3} align="stretch">
              {/* Server Error Alert */}
              {serverError && (
                <Alert.Root status="error" size="sm">
                  <Alert.Indicator>
                    <LuTriangleAlert />
                  </Alert.Indicator>
                  <Alert.Content>
                    <Alert.Description fontSize="2xs">{serverError}</Alert.Description>
                  </Alert.Content>
                </Alert.Root>
              )}

              {/* Start/Stop Button */}
              <Button
                size="sm"
                variant="solid"
                colorPalette={serverStatus.isRunning ? 'red' : 'green'}
                onClick={serverStatus.isRunning ? stopServer : startServer}
                disabled={serverLoading || !info?.installed}
                loading={serverLoading}
              >
                {serverStatus.isRunning ? (
                  <>
                    <LuSquare size={14} />
                    Stop Server
                  </>
                ) : (
                  <>
                    <LuPlay size={14} />
                    Start Server
                  </>
                )}
              </Button>

              {/* Server Info */}
              {serverStatus.isRunning && (
                <VStack gap={2} align="stretch">
                  <Stat.Root size="sm">
                    <Stat.Label color="app.text" fontSize="2xs">
                      Port
                    </Stat.Label>
                    <Stat.ValueText color="app.light" fontSize="xs" fontFamily="mono">
                      {serverStatus.port || '4096'}
                    </Stat.ValueText>
                  </Stat.Root>

                  {serverStatus.isHealthy !== undefined && (
                    <Stat.Root size="sm">
                      <Stat.Label color="app.text" fontSize="2xs">
                        Health Status
                      </Stat.Label>
                      <Stat.ValueText
                        color={serverStatus.isHealthy ? 'green.400' : 'red.400'}
                        fontSize="xs"
                      >
                        {serverStatus.isHealthy ? 'Healthy' : 'Unhealthy'}
                      </Stat.ValueText>
                    </Stat.Root>
                  )}

                  {serverStatus.lastHealthCheck && (
                    <Stat.Root size="sm">
                      <Stat.Label color="app.text" fontSize="2xs">
                        Last Health Check
                      </Stat.Label>
                      <Stat.ValueText color="app.light" fontSize="2xs">
                        {new Date(serverStatus.lastHealthCheck).toLocaleTimeString()}
                      </Stat.ValueText>
                    </Stat.Root>
                  )}

                  {serverStatus.uptime && (
                    <Stat.Root size="sm">
                      <Stat.Label color="app.text" fontSize="2xs">
                        Uptime
                      </Stat.Label>
                      <Stat.ValueText color="app.light" fontSize="2xs">
                        {Math.floor(serverStatus.uptime / 1000 / 60)} minutes
                      </Stat.ValueText>
                    </Stat.Root>
                  )}
                </VStack>
              )}

              {/* Server not installed warning */}
              {!info?.installed && (
                <Alert.Root status="warning" size="sm">
                  <Alert.Indicator>
                    <LuTriangleAlert />
                  </Alert.Indicator>
                  <Alert.Content>
                    <Alert.Description fontSize="2xs">
                      Install OpenCode binary first
                    </Alert.Description>
                  </Alert.Content>
                </Alert.Root>
              )}
            </VStack>
          </Card.Body>
        </Card.Root>
      </VStack>
    </SidebarContainer>
  )
}
