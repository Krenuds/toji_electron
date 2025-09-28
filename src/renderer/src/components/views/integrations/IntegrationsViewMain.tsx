import React, { useState } from 'react'
import { Box, VStack, HStack, Text, Button, Card, Input, Badge, Spinner } from '@chakra-ui/react'
import { LuBotMessageSquare, LuPlug, LuPowerOff, LuTrash2, LuEye, LuEyeOff } from 'react-icons/lu'
import { useDiscord } from '../../../hooks/useDiscord'

export function IntegrationsViewMain(): React.JSX.Element {
  const { status, hasToken, isConnecting, error, connect, disconnect, refreshStatus } = useDiscord()
  const [tokenInput, setTokenInput] = useState('')
  const [showToken, setShowToken] = useState(false)
  const [isSavingToken, setIsSavingToken] = useState(false)

  const handleSaveToken = async (): Promise<void> => {
    if (!tokenInput.trim()) return

    setIsSavingToken(true)
    try {
      await window.api.discord.setToken(tokenInput.trim())
      setTokenInput('') // Clear input after saving
      await refreshStatus()
    } catch (err) {
      console.error('Failed to save token:', err)
    } finally {
      setIsSavingToken(false)
    }
  }

  const handleClearToken = async (): Promise<void> => {
    try {
      await window.api.discord.clearToken()
      await refreshStatus()
    } catch (err) {
      console.error('Failed to clear token:', err)
    }
  }

  const handleConnect = async (): Promise<void> => {
    await connect()
  }

  const handleDisconnect = async (): Promise<void> => {
    await disconnect()
  }

  return (
    <VStack align="stretch" gap={6} h="100%">
      {/* Header */}
      <Box>
        <HStack justify="space-between" align="center" mb={2}>
          <Text color="app.light" fontSize="2xl" fontWeight="bold">
            Integrations
          </Text>
          <Badge size="sm" colorPalette="green" variant="subtle">
            {status.connected ? 'Connected' : 'Disconnected'}
          </Badge>
        </HStack>
        <Text color="app.text" fontSize="sm">
          Connect Toji to external services like Discord, Slack, and more
        </Text>
      </Box>

      {/* Discord Integration Card */}
      <Card.Root bg="app.dark" border="1px solid" borderColor="app.border">
        <Card.Body p={6}>
          <VStack align="stretch" gap={4}>
            {/* Card Header */}
            <HStack justify="space-between">
              <HStack gap={3}>
                <Box
                  w={10}
                  h={10}
                  borderRadius="full"
                  bg="purple.500"
                  display="flex"
                  alignItems="center"
                  justifyContent="center"
                >
                  <LuBotMessageSquare size={20} color="white" />
                </Box>
                <Box>
                  <Text color="app.light" fontSize="lg" fontWeight="semibold">
                    Discord Bot
                  </Text>
                  <Text color="app.text" fontSize="sm">
                    Connect Toji to Discord for AI-powered conversations
                  </Text>
                </Box>
              </HStack>
            </HStack>

            {/* Connection Status */}
            {status.connected && (
              <Box
                p={3}
                bg="rgba(34, 197, 94, 0.1)"
                borderRadius="md"
                border="1px solid"
                borderColor="green.500"
              >
                <VStack align="start" gap={1}>
                  <Text color="green.400" fontSize="sm" fontWeight="medium">
                    Bot Connected
                  </Text>
                  {status.username && (
                    <Text color="app.text" fontSize="xs">
                      Logged in as: {status.username}
                    </Text>
                  )}
                  {status.guilds !== undefined && (
                    <Text color="app.text" fontSize="xs">
                      Active in {status.guilds} server{status.guilds !== 1 ? 's' : ''}
                    </Text>
                  )}
                </VStack>
              </Box>
            )}

            {/* Error Display */}
            {error && (
              <Box
                p={3}
                bg="rgba(239, 68, 68, 0.1)"
                borderRadius="md"
                border="1px solid"
                borderColor="red.500"
              >
                <Text color="red.400" fontSize="sm">
                  {error}
                </Text>
              </Box>
            )}

            {/* Token Configuration */}
            {!hasToken ? (
              <VStack align="stretch" gap={3}>
                <Text color="app.text" fontSize="sm">
                  Enter your Discord bot token to get started:
                </Text>
                <HStack gap={2}>
                  <Box flex="1" position="relative">
                    <Input
                      type={showToken ? 'text' : 'password'}
                      placeholder="Enter Discord bot token..."
                      value={tokenInput}
                      onChange={(e) => setTokenInput(e.target.value)}
                      bg="rgba(255,255,255,0.02)"
                      border="1px solid"
                      borderColor="app.border"
                      color="app.light"
                      _placeholder={{ color: 'app.text' }}
                      _focus={{ borderColor: 'purple.500', boxShadow: 'none' }}
                      pr={10}
                    />
                    <Button
                      position="absolute"
                      right={1}
                      top="50%"
                      transform="translateY(-50%)"
                      size="xs"
                      variant="ghost"
                      onClick={() => setShowToken(!showToken)}
                      aria-label={showToken ? 'Hide token' : 'Show token'}
                    >
                      {showToken ? <LuEyeOff size={14} /> : <LuEye size={14} />}
                    </Button>
                  </Box>
                  <Button
                    colorPalette="purple"
                    variant="solid"
                    size="sm"
                    onClick={handleSaveToken}
                    disabled={!tokenInput.trim() || isSavingToken}
                  >
                    {isSavingToken ? <Spinner size="sm" /> : 'Save Token'}
                  </Button>
                </HStack>
                <Text color="app.text" fontSize="xs">
                  Need a bot token?{' '}
                  <Text
                    as="span"
                    color="purple.400"
                    textDecoration="underline"
                    cursor="pointer"
                    onClick={() =>
                      window.open('https://discord.com/developers/applications', '_blank')
                    }
                  >
                    Create one at Discord Developer Portal
                  </Text>
                </Text>
              </VStack>
            ) : (
              <VStack align="stretch" gap={3}>
                <HStack justify="space-between">
                  <Text color="app.text" fontSize="sm">
                    Bot token configured
                  </Text>
                  <Button size="xs" variant="ghost" colorPalette="red" onClick={handleClearToken}>
                    <LuTrash2 size={12} />
                    <Text ml={1}>Clear Token</Text>
                  </Button>
                </HStack>

                {/* Connection Controls */}
                <HStack gap={2}>
                  {!status.connected ? (
                    <Button
                      colorPalette="green"
                      variant="solid"
                      size="sm"
                      onClick={handleConnect}
                      disabled={isConnecting}
                    >
                      {isConnecting ? (
                        <>
                          <Spinner size="sm" mr={2} /> Connecting...
                        </>
                      ) : (
                        <>
                          <LuPlug size={14} /> <Text ml={1}>Connect Bot</Text>
                        </>
                      )}
                    </Button>
                  ) : (
                    <Button colorPalette="red" variant="solid" size="sm" onClick={handleDisconnect}>
                      <LuPowerOff size={14} />
                      <Text ml={1}>Disconnect</Text>
                    </Button>
                  )}
                </HStack>
              </VStack>
            )}

            {/* Instructions */}
            <Box pt={2} borderTop="1px solid" borderColor="app.border">
              <Text color="app.text" fontSize="xs" fontWeight="medium" mb={2}>
                How to use:
              </Text>
              <VStack align="start" gap={1}>
                <Text color="app.text" fontSize="xs">
                  1. Create a Discord application and bot
                </Text>
                <Text color="app.text" fontSize="xs">
                  2. Copy your bot token and paste it above
                </Text>
                <Text color="app.text" fontSize="xs">
                  3. Invite the bot to your Discord server
                </Text>
                <Text color="app.text" fontSize="xs">
                  4. Connect the bot and @mention it or use /chat command
                </Text>
              </VStack>
            </Box>
          </VStack>
        </Card.Body>
      </Card.Root>

      {/* Future Integration Placeholders */}
      <Card.Root bg="app.dark" border="1px solid" borderColor="app.border" opacity={0.5}>
        <Card.Body p={6}>
          <HStack gap={3}>
            <Box
              w={10}
              h={10}
              borderRadius="full"
              bg="gray.600"
              display="flex"
              alignItems="center"
              justifyContent="center"
            >
              <LuPlug size={20} color="white" />
            </Box>
            <Box flex="1">
              <Text color="app.light" fontSize="lg" fontWeight="semibold">
                More Integrations
              </Text>
              <Text color="app.text" fontSize="sm">
                Slack, Microsoft Teams, and more coming soon...
              </Text>
            </Box>
          </HStack>
        </Card.Body>
      </Card.Root>
    </VStack>
  )
}
