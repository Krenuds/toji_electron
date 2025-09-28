import React from 'react'
import { Box, ScrollArea } from '@chakra-ui/react'

interface SidebarContainerProps {
  children: React.ReactNode
}

export function SidebarContainer({ children }: SidebarContainerProps): React.JSX.Element {
  return (
    <Box position="relative" h="100%" w="100%" overflow="hidden">
      <ScrollArea.Root h="100%" size="xs">
        <ScrollArea.Viewport>
          <Box p="4" minW="0">
            {children}
          </Box>
        </ScrollArea.Viewport>
        <ScrollArea.Scrollbar bg="transparent">
          <ScrollArea.Thumb bg="app.border" _hover={{ bg: 'app.text' }} />
        </ScrollArea.Scrollbar>
      </ScrollArea.Root>
    </Box>
  )
}
