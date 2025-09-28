import React from 'react'
import { Box, BoxProps } from '@chakra-ui/react'

interface SidebarCardProps extends BoxProps {
  isActive?: boolean
  isDisabled?: boolean
  children: React.ReactNode
  onClick?: () => void
}

export const SidebarCard: React.FC<SidebarCardProps> = ({
  isActive = false,
  isDisabled = false,
  children,
  onClick,
  ...boxProps
}) => {
  return (
    <Box
      p={2}
      borderRadius="md"
      bg={isActive ? 'green.800' : 'app.dark'}
      border="1px solid"
      borderColor={isActive ? 'app.accent' : 'app.border'}
      cursor={isDisabled ? 'not-allowed' : onClick ? 'pointer' : 'default'}
      opacity={isDisabled ? 0.6 : 1}
      _hover={
        !isDisabled && onClick
          ? {
              bg: isActive ? 'green.800' : 'app.medium',
              borderColor: 'app.accent'
            }
          : {}
      }
      onClick={!isDisabled ? onClick : undefined}
      transition="all 0.2s"
      {...boxProps}
    >
      {children}
    </Box>
  )
}