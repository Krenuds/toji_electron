import React, { useState, useEffect, useRef } from 'react'
import {
  Box,
  VStack,
  HStack,
  Text,
  Input,
  Button,
  Card,
  Badge,
  Spinner,
  Center
} from '@chakra-ui/react'
import { LuSend, LuUser, LuBot, LuRefreshCw, LuInfo } from 'react-icons/lu'
import { useChatCoordinatorContext } from '../../../hooks/useChatCoordinatorContext'

export function ChatViewMain(): React.JSX.Element {
  const [messageInput, setMessageInput] = useState('')
  const messagesEndRef = useRef<HTMLDivElement>(null)

  const {
    currentProject,
    currentSessionId,
    messages,
    serverStatus,
    isLoadingMessages,
    isSendingMessage,
    messageError,
    sendMessage,
    refreshAll,
    clearErrors
  } = useChatCoordinatorContext()

  // Auto-scroll to bottom when new messages arrive
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' })
  }, [messages])

  const handleSendMessage = async (): Promise<void> => {
    if (!messageInput.trim() || isSendingMessage) return

    const currentMessage = messageInput
    setMessageInput('')

    // Note: In a real app, we'd update the coordinator's state here optimistically
    // For now, let the coordinator handle it after the response

    await sendMessage(currentMessage)
  }

  const handleKeyPress = (e: React.KeyboardEvent<HTMLInputElement>): void => {
    if (e.key === 'Enter' && !e.shiftKey && !isSendingMessage) {
      e.preventDefault()
      handleSendMessage()
    }
  }

  // Get project name for display
  const projectName = currentProject?.path
    ? currentProject.path.split(/[/\\]/).pop() || currentProject.path
    : 'No Project'

  // Determine what to show in the chat area
  const renderChatContent = (): React.JSX.Element => {
    // No project selected
    if (!currentProject) {
      return (
        <Center h="100%" color="app.text">
          <VStack gap={3}>
            <LuInfo size={48} />
            <Text fontSize="lg" fontWeight="medium">
              No Project Selected
            </Text>
            <Text fontSize="sm" textAlign="center">
              Select a project from the sidebar to start chatting
            </Text>
          </VStack>
        </Center>
      )
    }

    // No session selected
    if (!currentSessionId) {
      return (
        <Center h="100%" color="app.text">
          <VStack gap={3}>
            <LuInfo size={48} />
            <Text fontSize="lg" fontWeight="medium">
              No Session Active
            </Text>
            <Text fontSize="sm" textAlign="center">
              Create or select a session to start chatting
            </Text>
          </VStack>
        </Center>
      )
    }

    // Loading messages
    if (isLoadingMessages && messages.length === 0) {
      return (
        <Center h="100%">
          <VStack gap={3}>
            <Spinner size="xl" color="app.accent" />
            <Text color="app.text" fontSize="sm">
              Loading conversation...
            </Text>
          </VStack>
        </Center>
      )
    }

    // Error loading messages
    if (messageError && messages.length === 0) {
      return (
        <Center h="100%">
          <VStack gap={3}>
            <LuInfo size={48} color="red" />
            <Text color="red.400" fontSize="lg" fontWeight="medium">
              Failed to Load Messages
            </Text>
            <Text color="app.text" fontSize="sm">
              {messageError}
            </Text>
            <Button
              size="sm"
              colorPalette="green"
              variant="solid"
              onClick={() => {
                clearErrors()
                refreshAll()
              }}
            >
              <LuRefreshCw size={14} />
              Retry
            </Button>
          </VStack>
        </Center>
      )
    }

    // No messages yet
    if (messages.length === 0) {
      return (
        <Center h="100%" color="app.text">
          <VStack gap={3}>
            <Text fontSize="lg" fontWeight="medium">
              Start a Conversation
            </Text>
            <Text fontSize="sm" textAlign="center">
              Type a message below to begin chatting with Toji
            </Text>
          </VStack>
        </Center>
      )
    }

    // Show messages
    return (
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
                bg={msg.type === 'user' ? 'green.200' : 'app.accent'}
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
                  bg={msg.type === 'user' ? 'rgba(59, 130, 246, 0.1)' : 'rgba(255,255,255,0.02)'}
                  border="1px solid"
                  borderColor={msg.type === 'user' ? 'green.500' : 'app.border'}
                >
                  <Text color="app.light" fontSize="sm" lineHeight="tall" whiteSpace="pre-wrap">
                    {msg.content}
                  </Text>
                </Box>
              </Box>
            </HStack>
          </Box>
        ))}
        <div ref={messagesEndRef} />
      </VStack>
    )
  }

  return (
    <VStack align="stretch" gap={6} h="100%">
      {/* Header */}
      <Box>
        <HStack justify="space-between" align="center" mb={2}>
          <Text color="app.light" fontSize="2xl" fontWeight="bold">
            {currentProject ? `Chatting with ${projectName}` : 'Toji Chat'}
          </Text>
          <HStack gap={2}>
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
                ? 'Online'
                : serverStatus === 'initializing'
                  ? 'Starting...'
                  : 'Offline'}
            </Badge>
            {messageError && (
              <Button
                size="xs"
                variant="ghost"
                colorPalette="red"
                onClick={() => {
                  clearErrors()
                  refreshAll()
                }}
                title="Retry failed operation"
              >
                <LuRefreshCw size={12} />
              </Button>
            )}
          </HStack>
        </HStack>
        {currentProject && (
          <Text color="app.text" fontSize="sm">
            Working in: {currentProject.path}
          </Text>
        )}
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
          {renderChatContent()}
        </Card.Body>
      </Card.Root>

      {/* Input Area */}
      <Card.Root
        bg="app.dark"
        border="1px solid"
        borderColor="app.border"
        opacity={!currentProject || !currentSessionId ? 0.5 : 1}
      >
        <Card.Body p={4}>
          <HStack gap={3}>
            <Input
              placeholder={
                !currentProject
                  ? 'Select a project first...'
                  : !currentSessionId
                    ? 'Select or create a session first...'
                    : 'Type your message...'
              }
              value={messageInput}
              onChange={(e) => setMessageInput(e.target.value)}
              onKeyPress={handleKeyPress}
              bg="rgba(255,255,255,0.02)"
              border="1px solid"
              borderColor="app.border"
              color="app.light"
              _placeholder={{ color: 'app.text' }}
              _focus={{ borderColor: 'app.accent', boxShadow: 'none' }}
              flex="1"
              disabled={!currentProject || !currentSessionId || isSendingMessage}
            />
            <Button
              onClick={handleSendMessage}
              colorPalette="green"
              variant="solid"
              disabled={
                !messageInput.trim() ||
                !currentProject ||
                !currentSessionId ||
                isSendingMessage ||
                isLoadingMessages
              }
              px={4}
            >
              {isSendingMessage ? <Spinner size="sm" /> : <LuSend size={16} />}
            </Button>
          </HStack>
          <Text color="app.text" fontSize="xs" mt={2}>
            {isSendingMessage
              ? 'Toji is thinking...'
              : isLoadingMessages
                ? 'Loading messages...'
                : serverStatus === 'offline'
                  ? 'Server offline - will start when you send a message'
                  : 'Press Enter to send • OpenCode powered'}
          </Text>
        </Card.Body>
      </Card.Root>
    </VStack>
  )
}
