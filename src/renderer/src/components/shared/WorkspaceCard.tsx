import React from 'react'
import { Card, HStack, VStack, Text, Badge, Button } from '@chakra-ui/react'
import { LuFolder, LuMessageSquare, LuClock, LuExternalLink, LuFolderOpen } from 'react-icons/lu'
import { useAppView } from '../../hooks/useAppView'
import { useWorkspace } from '../../hooks/useWorkspace'

interface WorkspaceCardProps {
  path: string
  name: string
  sessionCount: number
  lastActivity: Date | null
  isCurrent?: boolean
  onOpenDirectory: (path: string) => Promise<void>
}

export function WorkspaceCard({
  path,
  name,
  sessionCount,
  lastActivity,
  isCurrent = false,
  onOpenDirectory
}: WorkspaceCardProps): React.JSX.Element {
  const { setActiveView } = useAppView()
  const { changeWorkspace } = useWorkspace()

  const handleOpenWorkspace = async (): Promise<void> => {
    await changeWorkspace(path)
    setActiveView('chat')
  }

  const formatLastActivity = (date: Date | null): string => {
    if (!date) return 'Never'
    const now = new Date()
    const diffMs = now.getTime() - date.getTime()
    const diffHours = Math.floor(diffMs / (1000 * 60 * 60))
    const diffDays = Math.floor(diffMs / (1000 * 60 * 60 * 24))

    if (diffHours < 1) return 'Just now'
    if (diffHours < 24) return `${diffHours} hour${diffHours > 1 ? 's' : ''} ago`
    if (diffDays < 7) return `${diffDays} day${diffDays > 1 ? 's' : ''} ago`
    return date.toLocaleDateString()
  }

  return (
    <Card.Root
      bg={isCurrent ? 'rgba(51,180,47,0.05)' : 'app.dark'}
      border="1px solid"
      borderColor={isCurrent ? 'app.accent' : 'app.border'}
      _hover={{ borderColor: isCurrent ? 'app.accent' : 'rgba(255,255,255,0.2)' }}
      transition="border-color 0.2s"
    >
      <Card.Body>
        <VStack align="stretch" gap={3}>
          {/* Header */}
          <HStack justify="space-between">
            <HStack gap={2}>
              <LuFolder size={18} color={isCurrent ? '#33b42f' : '#808080'} />
              <Text color="app.light" fontSize="md" fontWeight="semibold" lineClamp={1}>
                {name}
              </Text>
            </HStack>
            {isCurrent && (
              <Badge size="sm" colorPalette="green">
                Current
              </Badge>
            )}
          </HStack>

          {/* Path */}
          <Text color="app.text" fontSize="xs" lineClamp={1} opacity={0.8}>
            {path}
          </Text>

          {/* Stats */}
          <HStack gap={4}>
            <HStack gap={1}>
              <LuMessageSquare size={14} color="#808080" />
              <Text color="app.text" fontSize="xs">
                {sessionCount} session{sessionCount !== 1 ? 's' : ''}
              </Text>
            </HStack>
            <HStack gap={1}>
              <LuClock size={14} color="#808080" />
              <Text color="app.text" fontSize="xs">
                {formatLastActivity(lastActivity)}
              </Text>
            </HStack>
          </HStack>

          {/* Actions */}
          <HStack gap={2} mt={1}>
            <Button
              size="sm"
              variant="subtle"
              colorPalette="green"
              onClick={handleOpenWorkspace}
              flex={1}
            >
              <LuFolderOpen size={14} style={{ marginRight: 6 }} />
              Open in Chat
            </Button>
            <Button
              size="sm"
              variant="ghost"
              color="app.text"
              onClick={() => onOpenDirectory(path)}
              aria-label="Browse folder"
            >
              <LuExternalLink size={14} />
            </Button>
          </HStack>
        </VStack>
      </Card.Body>
    </Card.Root>
  )
}
