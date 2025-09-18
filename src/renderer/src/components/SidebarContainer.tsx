import React from 'react'
import { ScrollArea } from '@chakra-ui/react'

interface SidebarContainerProps {
  children: React.ReactNode
}

export function SidebarContainer({ children }: SidebarContainerProps): React.JSX.Element {
  return (
    <ScrollArea.Root height="100%" variant="hover" size="xs">
      <ScrollArea.Viewport>
        <ScrollArea.Content>
          <div style={{ paddingLeft: '8px', paddingTop: '8px', paddingBottom: '8px', paddingRight: '24px' }}>
            {children}
          </div>
        </ScrollArea.Content>
      </ScrollArea.Viewport>
      <ScrollArea.Scrollbar bg="transparent">
        <ScrollArea.Thumb bg="app.border" _hover={{ bg: "app.text" }} />
      </ScrollArea.Scrollbar>
    </ScrollArea.Root>
  )
}