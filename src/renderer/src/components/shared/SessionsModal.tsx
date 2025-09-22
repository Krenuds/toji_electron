import React from 'react'
import { Dialog, Button } from '@chakra-ui/react'

interface Session {
  id: string
  title?: string
  created?: Date
  updated?: Date
}

interface SessionsModalProps {
  isOpen: boolean
  onClose: () => void
  sessions: Session[]
  isLoading: boolean
  currentSessionId: string | null
  onDeleteSession: (sessionId: string) => Promise<void>
  onRefresh: () => Promise<void>
  deletingSessionId: string | null
}

export function SessionsModal({
  isOpen,
  onClose,
  sessions,
  isLoading,
  currentSessionId,
  onDeleteSession,
  onRefresh,
  deletingSessionId
}: SessionsModalProps): React.JSX.Element {
  // Suppress unused parameter warnings for now
  void sessions
  void isLoading
  void currentSessionId
  void onDeleteSession
  void onRefresh
  void deletingSessionId

  return (
    <Dialog.Root open={isOpen} onOpenChange={(details) => !details.open && onClose()}>
      <Dialog.Content>
        <Dialog.Header>
          <Dialog.Title>Sessions</Dialog.Title>
        </Dialog.Header>
        <Dialog.Body>
          <p>Sessions management coming soon...</p>
        </Dialog.Body>
        <Dialog.Footer>
          <Dialog.CloseTrigger asChild>
            <Button onClick={onClose}>Close</Button>
          </Dialog.CloseTrigger>
        </Dialog.Footer>
      </Dialog.Content>
    </Dialog.Root>
  )
}
