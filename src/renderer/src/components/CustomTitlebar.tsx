import React from 'react'
import { Flex, Box, IconButton } from '@chakra-ui/react'
import { LuMinus, LuSquare, LuX } from 'react-icons/lu'
import { TojiLogo } from './TojiLogo'

interface CustomTitlebarProps {
  onMinimize?: () => void
  onMaximize?: () => void
  onClose?: () => void
}

export function CustomTitlebar({
  onMinimize,
  onMaximize,
  onClose
}: CustomTitlebarProps): React.JSX.Element {
  return (
    <Flex
      h="32px"
      w="100%"
      bg="gray.800"
      align="center"
      justify="space-between"
      px={4}
      style={{ WebkitAppRegion: 'drag' } as React.CSSProperties}
    >
      {/* Left side - empty for now */}
      <Box />

      {/* Center logo */}
      <Box style={{ WebkitAppRegion: 'no-drag' } as React.CSSProperties}>
        <TojiLogo size="18px" />
      </Box>

      {/* Right window controls */}
      <Flex gap="1" style={{ WebkitAppRegion: 'no-drag' } as React.CSSProperties}>
        <IconButton
          aria-label="Minimize"
          onClick={onMinimize}
          size="sm"
          variant="ghost"
          color="white"
          bg="rgba(255,255,255,0.1)"
          _hover={{ bg: 'rgba(255,255,255,0.2)' }}
          _focus={{ boxShadow: 'none', outline: 'none' }}
          minW="20px"
          h="20px"
        >
          <LuMinus size={12} />
        </IconButton>
        <IconButton
          aria-label="Maximize"
          onClick={onMaximize}
          size="sm"
          variant="ghost"
          color="white"
          bg="rgba(255,255,255,0.1)"
          _hover={{ bg: 'rgba(255,255,255,0.2)' }}
          _focus={{ boxShadow: 'none', outline: 'none' }}
          minW="20px"
          h="20px"
        >
          <LuSquare size={12} />
        </IconButton>
        <IconButton
          aria-label="Close"
          onClick={onClose}
          size="sm"
          variant="ghost"
          color="white"
          bg="rgba(255,255,255,0.1)"
          _hover={{ bg: 'red.500' }}
          _focus={{ boxShadow: 'none', outline: 'none' }}
          minW="20px"
          h="20px"
        >
          <LuX size={12} />
        </IconButton>
      </Flex>
    </Flex>
  )
}
