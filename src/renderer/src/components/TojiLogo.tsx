import React from 'react'
import { Box } from '@chakra-ui/react'

interface TojiLogoProps {
  size?: string
}

export function TojiLogo({ size = '16px' }: TojiLogoProps): React.JSX.Element {
  return (
    <Box
      width={size}
      height={size}
      bg="app.accent"
      borderRadius="sm"
      display="flex"
      alignItems="center"
      justifyContent="center"
      fontSize="xs"
      fontWeight="bold"
      color="white"
    >
      T3
    </Box>
  )
}
