import React, { useState, useEffect } from 'react'
import { Box, VStack, HStack, Text, Input, Button, Card, Badge } from '@chakra-ui/react'
import { LuSend, LuUser, LuBot } from 'react-icons/lu'
import { useWorkspace } from '../../../hooks/useWorkspace'

interface ChatMessage {
  id: string
  type: 'user' | 'assistant'
  content: string
  timestamp: Date
}

export function ChatViewMain(): React.JSX.Element {
  const [message, setMessage] = useState('')
  const [isLoading, setIsLoading] = useState(false)
  const [serverStatus, setServerStatus] = useState<'offline' | 'online' | 'initializing'>('offline')
  const { workspaceInfo, isChangingWorkspace } = useWorkspace()
  const [messages, setMessages] = useState<ChatMessage[]>([
    {
      id: '1',
      type: 'assistant',
      content: 'Hello! I&apos;m Toji, your AI coding assistant. How can I help you today?',
      timestamp: new Date()
    }
  ])

  // Reset messages when workspace changes
  useEffect(() => {
    if (workspaceInfo) {
      const workspaceName = workspaceInfo.workspacePath.split(/[\\/]/).pop() || 'this workspace'
      setMessages([
        {
          id: Date.now().toString(),
          type: 'assistant',
          content: `Workspace changed to "${workspaceName}". ${
            workspaceInfo.isNew
              ? 'This is a new workspace. I&apos;m ready to help you start your project!'
              : 'I&apos;m ready to help you with this project!'
          }`,
          timestamp: new Date()
        }
      ])
      setServerStatus('online')
    }
  }, [workspaceInfo])

  // Poll server status
  useEffect(() => {
    const checkServerStatus = async (): Promise<void> => {
      try {
        const isRunning = await window.api.core.isRunning()
        setServerStatus(isRunning ? 'online' : 'offline')
      } catch (error) {
        console.error('Failed to check server status:', error)
        setServerStatus('offline')
      }
    }

    if (!isChangingWorkspace) {
      checkServerStatus()
      const interval = setInterval(checkServerStatus, 2000)
      return () => clearInterval(interval)
    }
    return undefined
  }, [isChangingWorkspace])

  const handleSendMessage = async (): Promise<void> => {
    if (!message.trim() || isLoading) return

    const userMessage: ChatMessage = {
      id: Date.now().toString(),
      type: 'user',
      content: message,
      timestamp: new Date()
    }

    setMessages((prev) => [...prev, userMessage])
    const currentMessage = message
    setMessage('')
    setIsLoading(true)

    try {
      // Ensure server is ready if this is the first message
      if (serverStatus === 'offline') {
        setServerStatus('initializing')
        const readyStatus = await window.api.core.ensureReadyForChat()
        if (readyStatus.serverStatus === 'online') {
          setServerStatus('online')
        } else {
          throw new Error('Failed to initialize OpenCode server')
        }
      }

      // Send the actual message
      const response = await window.api.core.chat(currentMessage)

      const assistantMessage: ChatMessage = {
        id: (Date.now() + 1).toString(),
        type: 'assistant',
        content: response,
        timestamp: new Date()
      }
      setMessages((prev) => [...prev, assistantMessage])
    } catch (error) {
      console.error('Chat error:', error)
      const errorMessage: ChatMessage = {
        id: (Date.now() + 1).toString(),
        type: 'assistant',
        content: `Error: ${error instanceof Error ? error.message : 'Failed to send message'}`,
        timestamp: new Date()
      }
      setMessages((prev) => [...prev, errorMessage])
      setServerStatus('offline')
    } finally {
      setIsLoading(false)
    }
  }

  const handleKeyPress = (e: React.KeyboardEvent<HTMLInputElement>): void => {
    if (e.key === 'Enter' && !isLoading) {
      handleSendMessage()
    }
  }

  return (
    <VStack align="stretch" gap={6} h="100%">
      {/* Header */}
      <Box>
        <HStack justify="space-between" align="center" mb={2}>
          <Text color="app.light" fontSize="2xl" fontWeight="bold">
            Chat with Toji
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
          AI-powered coding assistant ready to help with your development tasks.
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
            {isLoading ? 'Toji is thinking...' : 'Press Enter to send • OpenCode powered'}
          </Text>
        </Card.Body>
      </Card.Root>
    </VStack>
  )
}
