import { Box, Card, HStack, Text, VStack } from '@chakra-ui/react'
import React from 'react'

interface IntegrationCardProps {
  icon: React.ReactElement
  iconBg: string
  title: string
  description: string
  headerAction?: React.ReactElement
  children?: React.ReactNode
}

export function IntegrationCard({
  icon,
  iconBg,
  title,
  description,
  headerAction,
  children
}: IntegrationCardProps): React.JSX.Element {
  return (
    <Card.Root bg="app.dark" border="1px solid" borderColor="app.border">
      <Card.Body p={6}>
        <VStack align="stretch" gap={4}>
          <HStack justify="space-between">
            <HStack gap={3}>
              <Box bg={iconBg} p={2} borderRadius="md">
                {icon}
              </Box>
              <VStack align="start" gap={0}>
                <Text color="app.light" fontSize="lg" fontWeight="semibold">
                  {title}
                </Text>
                <Text color="app.text" fontSize="sm">
                  {description}
                </Text>
              </VStack>
            </HStack>
            {headerAction}
          </HStack>
          {children}
        </VStack>
      </Card.Body>
    </Card.Root>
  )
}
