import React, { Component, type ReactNode } from 'react'
import { Box, Text, VStack, Button } from '@chakra-ui/react'
import { LuInfo, LuRefreshCw } from 'react-icons/lu'

interface Props {
  children: ReactNode
  fallback?: ReactNode
  onReset?: () => void
}

interface State {
  hasError: boolean
  error: Error | null
}

/**
 * Error Boundary component for graceful error handling in React
 * Catches rendering errors and displays a user-friendly fallback UI
 */
export class ErrorBoundary extends Component<Props, State> {
  constructor(props: Props) {
    super(props)
    this.state = { hasError: false, error: null }
  }

  static getDerivedStateFromError(error: Error): State {
    return { hasError: true, error }
  }

  componentDidCatch(error: Error, errorInfo: React.ErrorInfo): void {
    // Log error to console for debugging
    console.error('ErrorBoundary caught an error:', error, errorInfo)
    console.error('Component stack:', errorInfo.componentStack)
  }

  handleReset = (): void => {
    this.setState({ hasError: false, error: null })
    this.props.onReset?.()
  }

  render(): ReactNode {
    if (this.state.hasError) {
      // Use custom fallback if provided
      if (this.props.fallback) {
        return this.props.fallback
      }

      // Default error UI
      return (
        <Box
          display="flex"
          alignItems="center"
          justifyContent="center"
          minH="400px"
          p={8}
          bg="app.medium"
        >
          <VStack gap={6} maxW="500px">
            <Box
              p={4}
              borderRadius="full"
              bg="rgba(239, 68, 68, 0.1)"
              border="2px solid"
              borderColor="red.500"
            >
              <LuInfo size={48} color="#ef4444" />
            </Box>

            <VStack gap={2}>
              <Text color="app.light" fontSize="xl" fontWeight="semibold" textAlign="center">
                Something went wrong
              </Text>
              <Text color="app.text" fontSize="sm" textAlign="center">
                An unexpected error occurred while rendering this component.
              </Text>
            </VStack>

            {this.state.error && (
              <Box
                p={4}
                bg="rgba(239, 68, 68, 0.05)"
                borderRadius="md"
                border="1px solid"
                borderColor="app.border"
                w="full"
              >
                <Text color="red.400" fontSize="xs" fontFamily="mono" wordBreak="break-word">
                  {this.state.error.message}
                </Text>
              </Box>
            )}

            <Button
              colorPalette="green"
              size="sm"
              onClick={this.handleReset}
              display="flex"
              alignItems="center"
              gap={2}
            >
              <LuRefreshCw size={16} />
              <Text color="white">Try Again</Text>
            </Button>

            <Text color="app.text" fontSize="xs" textAlign="center">
              If this problem persists, try restarting the application.
            </Text>
          </VStack>
        </Box>
      )
    }

    return this.props.children
  }
}
