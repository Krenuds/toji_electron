// Example: API Key Management Component
// This demonstrates how to use the OpenCode API key management system

import { useState } from 'react'
import { Box, Button, Input, VStack, Text, HStack, Badge } from '@chakra-ui/react'
import { useOpencodeApiKeys } from '@/hooks/useOpencodeApiKeys'
import type { ReactElement } from 'react'

export function ApiKeyManager(): ReactElement {
  const [providerId, setProviderId] = useState('zen')
  const [apiKey, setApiKey] = useState('')
  const [configuredProviders, setConfiguredProviders] = useState<string[]>([])

  const {
    setApiKey: saveApiKey,
    hasApiKey,
    clearApiKey,
    getConfiguredProviders,
    isLoading,
    error
  } = useOpencodeApiKeys()

  // Load configured providers on mount
  const loadProviders = async (): Promise<void> => {
    const providers = await getConfiguredProviders()
    setConfiguredProviders(providers)
  }

  // Save API key
  const handleSaveKey = async (): Promise<void> => {
    try {
      await saveApiKey(providerId, apiKey)
      setApiKey('') // Clear input
      await loadProviders() // Refresh list
      console.log('API key saved successfully')
    } catch (err) {
      console.error('Failed to save API key:', err)
    }
  }

  // Check if key exists
  const handleCheckKey = async (): Promise<void> => {
    const exists = await hasApiKey(providerId)
    console.log(`API key for ${providerId} exists:`, exists)
  }

  // Remove API key
  const handleRemoveKey = async (provider: string): Promise<void> => {
    try {
      await clearApiKey(provider)
      await loadProviders() // Refresh list
      console.log(`API key for ${provider} removed`)
    } catch (err) {
      console.error('Failed to remove API key:', err)
    }
  }

  return (
    <Box p={4}>
      <VStack gap={4} align="stretch">
        <Text fontSize="xl" fontWeight="bold">
          OpenCode API Key Management
        </Text>

        {error && (
          <Text color="red.500" fontSize="sm">
            Error: {error}
          </Text>
        )}

        {/* Add new API key */}
        <Box>
          <Text mb={2}>Provider ID (e.g., zen, anthropic, openai):</Text>
          <Input
            value={providerId}
            onChange={(e) => setProviderId(e.target.value)}
            placeholder="zen"
            mb={2}
          />

          <Text mb={2}>API Key:</Text>
          <Input
            type="password"
            value={apiKey}
            onChange={(e) => setApiKey(e.target.value)}
            placeholder="sk-..."
            mb={2}
          />

          <HStack>
            <Button onClick={handleSaveKey} loading={isLoading} colorScheme="blue">
              Save API Key
            </Button>
            <Button onClick={handleCheckKey} variant="outline">
              Check Key Exists
            </Button>
          </HStack>
        </Box>

        {/* List configured providers */}
        <Box>
          <Text mb={2} fontWeight="semibold">
            Configured Providers:
          </Text>
          <Button onClick={loadProviders} size="sm" mb={2}>
            Refresh
          </Button>

          <VStack gap={2} align="stretch">
            {configuredProviders.map((provider) => (
              <HStack key={provider} justify="space-between">
                <Badge colorScheme="green">{provider}</Badge>
                <Button size="sm" colorScheme="red" onClick={() => handleRemoveKey(provider)}>
                  Remove
                </Button>
              </HStack>
            ))}
          </VStack>
        </Box>
      </VStack>
    </Box>
  )
}

// Usage in your main app or settings panel:
// import { ApiKeyManager } from '@/components/ApiKeyManager'
// <ApiKeyManager />
