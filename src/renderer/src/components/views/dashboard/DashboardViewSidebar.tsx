import React from 'react'
import {
  Box,
  VStack,
  HStack,
  Text,
  Button,
  Separator,
  Alert,
  Spinner,
  Progress,
  Stat
} from '@chakra-ui/react'
import {
  LuDownload,
  LuTriangleAlert,
  LuRefreshCw,
  LuPlay,
  LuSquare,
  LuServer
} from 'react-icons/lu'
import { useBinaryStatus } from '../../../hooks/useBinaryStatus'
import { useOpenCodeLogs } from '../../../hooks/useOpenCodeLogs'
import { useServerStatus } from '../../../hooks/useServerStatus'
import { SidebarContainer } from '../../SidebarContainer'
import { SidebarHeader } from '../../shared/SidebarHeader'
import { SidebarSection } from '../../shared/SidebarSection'
import { StatusBadge } from '../../StatusBadge'

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

  const getBinaryStatus = (): {
    status: 'checking' | 'installed' | 'not-installed'
    description: string
  } => {
    if (loading) return { status: 'checking' as const, description: 'Checking binary status...' }
    if (error) return { status: 'not-installed' as const, description: error }
    if (info?.installed)
      return { status: 'installed' as const, description: 'OpenCode binary ready' }
    return { status: 'not-installed' as const, description: 'Binary needs to be installed' }
  }

  return (
    <SidebarContainer>
      <VStack align="stretch" gap={4}>
        <SidebarHeader title="System Status" subtitle="OpenCode binary and server management" />

        <Separator borderColor="app.border" />

        {/* OpenCode Binary Status */}
        <SidebarSection
          title="OpenCode Binary"
          action={<StatusBadge status={getBinaryStatus().status} size="sm" />}
        >
          <VStack gap={3} align="stretch">
            {/* Binary Status Description */}
            <Box
              p={2}
              borderRadius="md"
              bg="rgba(255,255,255,0.02)"
              border="1px solid"
              borderColor="app.border"
            >
              <Text color="app.text" fontSize="2xs">
                {getBinaryStatus().description}
              </Text>
            </Box>

            {/* Error Alert */}
            {error && (
              <Alert.Root status="error" size="sm">
                <Alert.Indicator>
                  <LuTriangleAlert />
                </Alert.Indicator>
                <Alert.Content>
                  <Alert.Description fontSize="2xs">{error}</Alert.Description>
                </Alert.Content>
              </Alert.Root>
            )}

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

            {/* Install Button */}
            <Button
              variant="solid"
              colorPalette="green"
              size="sm"
              justifyContent="flex-start"
              disabled={installing}
              loading={installing}
              onClick={install}
            >
              <LuDownload size={14} />
              {info?.installed ? 'Reinstall Dependencies' : 'Install Dependencies'}
            </Button>
          </VStack>
        </SidebarSection>

        <Separator borderColor="app.border" />

        {/* OpenCode Logs */}
        <SidebarSection
          title="OpenCode Logs"
          action={
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
          }
        >
          <VStack gap={3} align="stretch">
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
              maxH="80px"
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
                  {logs.slice(-800)}
                </Text>
              ) : (
                <Text color="app.text" fontSize="2xs" fontStyle="italic">
                  No logs available
                </Text>
              )}
            </Box>
          </VStack>
        </SidebarSection>

        <Separator borderColor="app.border" />

        {/* Server Control */}
        <SidebarSection
          title="Server Control"
          action={
            <HStack gap={2} color="app.text">
              <LuServer size={15} />
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
          }
        >
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
              <VStack gap={1} align="stretch">
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
        </SidebarSection>
      </VStack>
    </SidebarContainer>
  )
}
