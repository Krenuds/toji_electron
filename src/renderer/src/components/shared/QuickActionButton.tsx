import React from 'react'
import { Button, HStack, Text } from '@chakra-ui/react'

interface QuickActionButtonProps {
  icon: React.ReactNode
  label: string
  onClick: () => void
  isLoading?: boolean
  isDisabled?: boolean
}

/**
 * Reusable quick action button component for sidebar actions
 * Provides consistent styling for ghost buttons with icons
 */
export function QuickActionButton({
  icon,
  label,
  onClick,
  isLoading = false,
  isDisabled = false
}: QuickActionButtonProps): React.JSX.Element {
  return (
    <Button
      variant="ghost"
      size="sm"
      justifyContent="flex-start"
      color="app.text"
      _hover={{ color: 'app.light', bg: 'rgba(255,255,255,0.05)' }}
      onClick={onClick}
      disabled={isDisabled || isLoading}
    >
      <HStack gap={1}>
        {icon}
        <Text>{label}</Text>
      </HStack>
    </Button>
  )
}
