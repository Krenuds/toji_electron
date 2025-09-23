import React, { useState, useEffect, useCallback } from 'react'
import { Box, VStack, HStack, Text, Input, Button, Card, Badge } from '@chakra-ui/react'
import { LuSend, LuUser, LuBot } from 'react-icons/lu'
import { useProjects } from '../../../hooks/useProjects'
import { useChat } from '../../../hooks/useChat'
import {
  createChatMessage,
  replaceMessages,
  type ChatMessage
} from '../../../utils/messageFormatter'

export function ChatViewMain(): React.JSX.Element {
  const [message, setMessage] = useState('')
  const [serverStatus, setServerStatus] = useState<'offline' | 'online' | 'initializing'>('offline')
  const { projectInfo, isChangingProject } = useProjects()
  const {
    sendMessage,
    checkServerStatus,
    ensureReadyForChat,
    getSessionMessages,
    getCurrentSession,
    isLoading
  } = useChat()
  const [messages, setMessages] = useState<ChatMessage[]>([])
  const [syncLoading, setSyncLoading] = useState(false)

  // Sync messages with backend session history
  const syncMessages = useCallback(
    async (forceRefresh = false): Promise<void> => {
      setSyncLoading(true)
      try {
        // Check if we have a current session
        const sessionInfo = await getCurrentSession()
        if (!sessionInfo) {
          // No session yet, clear messages
          setMessages([])
          return
        }

        // Load message history from backend
        const history = await getSessionMessages(sessionInfo.id, !forceRefresh)
        setMessages(replaceMessages(history))
      } catch (error) {
        console.error('Failed to sync messages:', error)
        // Don't clear messages on error, keep what we have
      } finally {
        setSyncLoading(false)
      }
    },
    [getCurrentSession, getSessionMessages]
  )

  // Sync messages when project changes
  useEffect(() => {
    if (projectInfo && !isChangingProject) {
      syncMessages()
    }
  }, [projectInfo, isChangingProject, syncMessages])

  // Sync messages when component mounts (view navigation)
  useEffect(() => {
    syncMessages()
  }, [syncMessages])

  // Listen for session changes from sidebar and sync messages
  useEffect(() => {
    const handleSessionChange = (event: CustomEvent): void => {
      console.log('Session changed, syncing messages for:', event.detail.sessionId)
      syncMessages(true) // Force refresh for new session
    }

    window.addEventListener('session-changed', handleSessionChange as EventListener)

    return () => {
      window.removeEventListener('session-changed', handleSessionChange as EventListener)
    }
  }, [syncMessages])

  // Poll server status
  useEffect(() => {
    const pollServerStatus = async (): Promise<void> => {
      const isRunning = await checkServerStatus()
      setServerStatus(isRunning ? 'online' : 'offline')
    }

    if (!isChangingProject) {
      pollServerStatus()
      const interval = setInterval(pollServerStatus, 2000)
      return () => clearInterval(interval)
    }
    return undefined
  }, [isChangingProject, checkServerStatus])

  const handleSendMessage = async (): Promise<void> => {
    if (!message.trim() || isLoading) return

    // Create user message and add it immediately for responsive UI
    const userMessage = createChatMessage('user', message)
    setMessages((prev) => [...prev, userMessage])
    const currentMessage = message
    setMessage('')

    // Ensure server is ready if this is the first message
    if (serverStatus === 'offline') {
      setServerStatus('initializing')
      const readyStatus = await ensureReadyForChat()
      if (readyStatus.serverStatus === 'online') {
        setServerStatus('online')
      } else {
        const errorMessage = createChatMessage(
          'assistant',
          `Error: ${readyStatus.error || 'Failed to initialize OpenCode server'}`
        )
        setMessages((prev) => [...prev, errorMessage])
        setServerStatus('offline')
        return
      }
    }

    // Send the actual message
    const response = await sendMessage(currentMessage)

    if (response.success) {
      // Sync messages from backend to get the complete conversation
      // Force refresh to bypass cache and get the latest response
      await syncMessages(true)
    } else {
      const errorMessage = createChatMessage(
        'assistant',
        `Error: ${response.error || 'Failed to send message'}`
      )
      setMessages((prev) => [...prev, errorMessage])
      setServerStatus('offline')
    }
  }

  const handleKeyPress = (e: React.KeyboardEvent<HTMLInputElement>): void => {
    if (e.key === 'Enter' && !isLoading) {
      handleSendMessage()
    }
  }

  // Get project name for display
  const projectName = projectInfo?.name || 'No Project'

  return (
    <VStack align="stretch" gap={6} h="100%">
      {/* Header */}
      <Box>
        <HStack justify="space-between" align="center" mb={2}>
          <Text color="app.light" fontSize="2xl" fontWeight="bold">
            Chatting with {projectName}
          </Text>
          <Badge
            size="sm"
            colorPalette={
              serverStatus === 'online'
                ? 'green'
                : serverStatus === 'initializing'
                  ? 'yellow'
                  : 'gray'
            }
            variant="subtle"
          >
            {serverStatus === 'online'
              ? 'Server Online'
              : serverStatus === 'initializing'
                ? 'Initializing...'
                : 'Server Offline'}
          </Badge>
        </HStack>
        <Text color="app.text" fontSize="sm">
          {projectInfo
            ? `Working in: ${projectInfo.path}`
            : 'Select a project to start chatting with your AI coding assistant'}
        </Text>
      </Box>

      {/* Chat Messages */}
      <Card.Root
        bg="app.dark"
        border="1px solid"
        borderColor="app.border"
        flex="1"
        overflow="hidden"
      >
        <Card.Body p={0} h="100%">
          <VStack
            gap={3}
            align="stretch"
            h="100%"
            overflowY="auto"
            p={4}
            css={{
              '&::-webkit-scrollbar': {
                width: '6px'
              },
              '&::-webkit-scrollbar-track': {
                background: 'transparent'
              },
              '&::-webkit-scrollbar-thumb': {
                background: '#404040',
                borderRadius: '3px'
              }
            }}
          >
            {messages.map((msg) => (
              <Box key={msg.id} w="100%">
                <HStack align="flex-start" gap={3}>
                  <Box
                    w={8}
                    h={8}
                    borderRadius="full"
                    bg={msg.type === 'user' ? 'blue.500' : 'app.accent'}
                    display="flex"
                    alignItems="center"
                    justifyContent="center"
                    flexShrink={0}
                    mt={1}
                  >
                    {msg.type === 'user' ? (
                      <LuUser size={16} color="white" />
                    ) : (
                      <LuBot size={16} color="white" />
                    )}
                  </Box>
                  <Box flex="1">
                    <HStack gap={2} mb={1}>
                      <Text color="app.light" fontSize="sm" fontWeight="medium">
                        {msg.type === 'user' ? 'You' : 'Toji'}
                      </Text>
                      <Text color="app.text" fontSize="xs">
                        {msg.timestamp.toLocaleTimeString()}
                      </Text>
                    </HStack>
                    <Box
                      p={3}
                      borderRadius="md"
                      bg={
                        msg.type === 'user' ? 'rgba(59, 130, 246, 0.1)' : 'rgba(255,255,255,0.02)'
                      }
                      border="1px solid"
                      borderColor={msg.type === 'user' ? 'blue.500' : 'app.border'}
                    >
                      <Text color="app.light" fontSize="sm" lineHeight="tall">
                        {msg.content}
                      </Text>
                    </Box>
                  </Box>
                </HStack>
              </Box>
            ))}
          </VStack>
        </Card.Body>
      </Card.Root>

      {/* Input Area */}
      <Card.Root bg="app.dark" border="1px solid" borderColor="app.border">
        <Card.Body p={4}>
          <HStack gap={3}>
            <Input
              placeholder="Type your message..."
              value={message}
              onChange={(e) => setMessage(e.target.value)}
              onKeyPress={handleKeyPress}
              bg="rgba(255,255,255,0.02)"
              border="1px solid"
              borderColor="app.border"
              color="app.light"
              _placeholder={{ color: 'app.text' }}
              _focus={{ borderColor: 'app.accent', boxShadow: 'none' }}
              flex="1"
            />
            <Button
              onClick={handleSendMessage}
              colorPalette="green"
              variant="solid"
              disabled={!message.trim() || isLoading}
              px={4}
            >
              <LuSend size={16} />
            </Button>
          </HStack>
          <Text color="app.text" fontSize="xs" mt={2}>
            {isLoading
              ? 'Toji is thinking...'
              : syncLoading
                ? 'Syncing messages...'
                : 'Press Enter to send • OpenCode powered'}
          </Text>
        </Card.Body>
      </Card.Root>
    </VStack>
  )
}
