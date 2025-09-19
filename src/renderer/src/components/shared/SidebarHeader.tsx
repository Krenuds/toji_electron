import React from 'react'
import { Box, Text } from '@chakra-ui/react'

interface SidebarHeaderProps {
  title: string
  subtitle?: string
}

/**
 * Reusable sidebar header component with title and optional subtitle
 * Provides consistent header styling across all sidebar views
 */
export function SidebarHeader({ title, subtitle }: SidebarHeaderProps): React.JSX.Element {
  return (
    <Box>
      <Text color="app.light" fontSize="sm" fontWeight="bold" mb={subtitle ? 2 : 0}>
        {title}
      </Text>
      {subtitle && (
        <Text color="app.text" fontSize="xs">
          {subtitle}
        </Text>
      )}
    </Box>
  )
}
