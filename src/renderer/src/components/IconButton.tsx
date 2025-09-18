import React from 'react'
import { Box } from '@chakra-ui/react'

interface IconButtonProps {
  icon: React.ReactNode
  onClick?: () => void
}

export function IconButton({ icon, onClick }: IconButtonProps): React.JSX.Element {
  return (
    <Box
      color="app.text"
      fontSize="sm"
      fontWeight="bold"
      cursor="pointer"
      display="flex"
      alignItems="center"
      justifyContent="center"
      w="40px"
      h="40px"
      _hover={{ color: 'app.light' }}
      onClick={onClick}
    >
      {icon}
    </Box>
  )
}
