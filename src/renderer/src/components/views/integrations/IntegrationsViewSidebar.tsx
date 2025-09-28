import React from 'react'
import { VStack, Text, Box, HStack, Badge } from '@chakra-ui/react'
import { LuSlack, LuGithub } from 'react-icons/lu'
import { FaDiscord } from 'react-icons/fa6'
import { SidebarCard } from '../../shared/SidebarCard'
import { useDiscord } from '../../../hooks/useDiscord'

interface Integration {
  id: string
  name: string
  icon: React.ReactElement
  status: 'connected' | 'disconnected' | 'coming-soon'
  color: string
}

export function IntegrationsViewSidebar(): React.JSX.Element {
  const { status: discordStatus } = useDiscord()

  const integrations: Integration[] = [
    {
      id: 'discord',
      name: 'Discord',
      icon: <FaDiscord size={16} />,
      status: discordStatus.connected ? 'connected' : 'disconnected',
      color: '#5865F2'
    },
    {
      id: 'slack',
      name: 'Slack',
      icon: <LuSlack size={16} />,
      status: 'coming-soon',
      color: 'orange.500'
    },
    {
      id: 'github',
      name: 'GitHub',
      icon: <LuGithub size={16} />,
      status: 'coming-soon',
      color: 'gray.500'
    }
  ]

  return (
    <VStack align="stretch" gap={4} p={4} h="100%">
      {/* Header */}
      <Box>
        <Text color="app.light" fontSize="lg" fontWeight="bold" mb={1}>
          Integrations
        </Text>
        <Text color="app.text" fontSize="xs">
          Manage external service connections
        </Text>
      </Box>

      {/* Integration List */}
      <VStack align="stretch" gap={2} flex="1">
        {integrations.map((integration) => (
          <SidebarCard
            key={integration.id}
            isActive={integration.id === 'discord'} // For now, Discord is always selected
            onClick={() => {
              // Future: Allow selecting different integrations
            }}
          >
            <HStack justify="space-between" w="100%">
              <HStack gap={2}>
                <Box color={integration.color}>{integration.icon}</Box>
                <Text color="app.light" fontSize="sm">
                  {integration.name}
                </Text>
              </HStack>
              {integration.status === 'connected' && (
                <Badge size="xs" colorPalette="green" variant="subtle">
                  Connected
                </Badge>
              )}
              {integration.status === 'disconnected' && (
                <Badge size="xs" colorPalette="gray" variant="subtle">
                  Disconnected
                </Badge>
              )}
              {integration.status === 'coming-soon' && (
                <Badge size="xs" colorPalette="yellow" variant="subtle">
                  Soon
                </Badge>
              )}
            </HStack>
          </SidebarCard>
        ))}
      </VStack>

      {/* Info Box */}
      <Box
        p={3}
        bg="rgba(255,255,255,0.02)"
        borderRadius="md"
        border="1px solid"
        borderColor="app.border"
      >
        <Text color="app.text" fontSize="xs">
          Connect Toji to your favorite tools and services to extend its capabilities across your
          workflow.
        </Text>
      </Box>
    </VStack>
  )
}
