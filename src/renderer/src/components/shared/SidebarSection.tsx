import React from 'react'
import { Box, HStack, Text } from '@chakra-ui/react'

interface SidebarSectionProps {
  title: string
  action?: React.ReactNode
  children: React.ReactNode
}

/**
 * Reusable sidebar section component with consistent styling
 * Used across all sidebar views to maintain uniform section structure
 */
export function SidebarSection({
  title,
  action,
  children
}: SidebarSectionProps): React.JSX.Element {
  return (
    <Box>
      {action ? (
        <HStack justify="space-between" mb={3}>
          <Text color="app.light" fontSize="xs" fontWeight="semibold">
            {title}
          </Text>
          {action}
        </HStack>
      ) : (
        <Text color="app.light" fontSize="xs" fontWeight="semibold" mb={3}>
          {title}
        </Text>
      )}
      {children}
    </Box>
  )
}
