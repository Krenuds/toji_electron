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
    <Box w="full" maxW="full" overflow="hidden">
      {action ? (
        <HStack justify="space-between" mb={3} w="full" maxW="full">
          <Text
            color="app.light"
            fontSize="xs"
            fontWeight="semibold"
            overflow="hidden"
            textOverflow="ellipsis"
            whiteSpace="nowrap"
          >
            {title}
          </Text>
          {action}
        </HStack>
      ) : (
        <Text
          color="app.light"
          fontSize="xs"
          fontWeight="semibold"
          mb={3}
          overflow="hidden"
          textOverflow="ellipsis"
          whiteSpace="nowrap"
        >
          {title}
        </Text>
      )}
      {children}
    </Box>
  )
}
