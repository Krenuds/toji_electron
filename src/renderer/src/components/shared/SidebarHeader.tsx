import React from 'react'
import { Box, HStack, Text } from '@chakra-ui/react'

interface SidebarHeaderProps {
  title: string
  subtitle?: string
  action?: React.ReactNode
}

/**
 * Reusable sidebar header component with title and optional subtitle
 * Provides consistent header styling across all sidebar views
 */
export function SidebarHeader({ title, subtitle, action }: SidebarHeaderProps): React.JSX.Element {
  return (
    <Box>
      <HStack justify="space-between" align="start" mb={subtitle ? 2 : 0}>
        <Text color="app.light" fontSize="sm" fontWeight="bold">
          {title}
        </Text>
        {action ?? null}
      </HStack>
      {subtitle && (
        <Text color="app.text" fontSize="xs">
          {subtitle}
        </Text>
      )}
    </Box>
  )
}
