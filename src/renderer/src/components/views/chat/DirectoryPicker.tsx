import React, { useState } from 'react'
import {
  Button,
  VStack,
  Text,
  Input,
  HStack,
  DialogRoot,
  DialogContent,
  DialogHeader,
  DialogBody,
  DialogFooter,
  DialogCloseTrigger
} from '@chakra-ui/react'

interface DirectoryPickerProps {
  isOpen: boolean
  onClose: () => void
  onSelect: (directoryPath: string) => Promise<void>
}

export const DirectoryPicker: React.FC<DirectoryPickerProps> = ({ isOpen, onClose, onSelect }) => {
  const [manualPath, setManualPath] = useState('')
  const [isLoading, setIsLoading] = useState(false)

  const handleBrowse = async (): Promise<void> => {
    try {
      const result = await window.api.dialog.showOpenDialog({
        properties: ['openDirectory']
      })

      if (!result.canceled && result.filePaths[0]) {
        setIsLoading(true)
        try {
          await onSelect(result.filePaths[0])
          console.log('Successfully switched to', result.filePaths[0])
          onClose()
        } catch (error) {
          console.error('Failed to switch project:', error)
        } finally {
          setIsLoading(false)
        }
      }
    } catch (error) {
      console.error('Failed to open directory picker:', error)
    }
  }

  const handleManualSubmit = async (): Promise<void> => {
    if (!manualPath.trim()) {
      console.warn('Invalid path entered')
      return
    }

    setIsLoading(true)
    try {
      await onSelect(manualPath.trim())
      console.log('Successfully switched to', manualPath)
      setManualPath('')
      onClose()
    } catch (error) {
      console.error('Failed to switch project:', error)
    } finally {
      setIsLoading(false)
    }
  }

  return (
    <DialogRoot open={isOpen} onOpenChange={(e) => !e.open && onClose()} size="md">
      <DialogContent>
        <DialogHeader>Select Project Directory</DialogHeader>
        <DialogCloseTrigger />

        <DialogBody>
          <VStack gap={4} align="stretch">
            <Text fontSize="sm" color="gray.600">
              Choose a directory to add as a project. The OpenCode server will be started in this
              directory.
            </Text>

            <VStack gap={3} align="stretch">
              <Button onClick={handleBrowse} colorScheme="blue" size="lg" loading={isLoading}>
                Browse for Directory
              </Button>

              <Text fontSize="sm" color="gray.500" textAlign="center">
                OR
              </Text>

              <HStack>
                <Input
                  placeholder="Enter directory path manually"
                  value={manualPath}
                  onChange={(e) => setManualPath(e.target.value)}
                  onKeyDown={(e) => {
                    if (e.key === 'Enter') {
                      handleManualSubmit()
                    }
                  }}
                  size="sm"
                />
                <Button
                  onClick={handleManualSubmit}
                  size="sm"
                  loading={isLoading}
                  disabled={!manualPath.trim()}
                >
                  Add
                </Button>
              </HStack>
            </VStack>
          </VStack>
        </DialogBody>

        <DialogFooter>
          <Button variant="ghost" onClick={onClose} disabled={isLoading}>
            Cancel
          </Button>
        </DialogFooter>
      </DialogContent>
    </DialogRoot>
  )
}
