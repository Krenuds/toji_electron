import React from 'react'
import { ScrollArea } from '@chakra-ui/react'

interface SidebarContainerProps {
  children: React.ReactNode
}

export function SidebarContainer({ children }: SidebarContainerProps): React.JSX.Element {
  return (
    <ScrollArea.Root height="100%" size="xs">
      <ScrollArea.Viewport>
        <ScrollArea.Content p="4" maxW="100%">
          {children}
        </ScrollArea.Content>
      </ScrollArea.Viewport>
      <ScrollArea.Scrollbar bg="transparent">
        <ScrollArea.Thumb bg="app.border" _hover={{ bg: 'app.text' }} />
      </ScrollArea.Scrollbar>
    </ScrollArea.Root>
  )
}
