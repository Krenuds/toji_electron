import React, { useState, useEffect } from 'react'
import { Drawer, VStack, HStack, Text, Button, Separator, Spinner, Box } from '@chakra-ui/react'
import { LuX, LuSave, LuRotateCcw } from 'react-icons/lu'

// Define types locally since we can't import from preload directly
interface LocalPermissionConfig {
  edit?: 'allow' | 'ask' | 'deny'
  bash?: 'allow' | 'ask' | 'deny'
  webfetch?: 'allow' | 'ask' | 'deny'
}

interface SettingsDrawerProps {
  isOpen: boolean
  onClose: () => void
}

export function SettingsDrawer({ isOpen, onClose }: SettingsDrawerProps): React.JSX.Element {
  const [loading, setLoading] = useState(false)
  const [saving, setSaving] = useState(false)
  const [permissions, setPermissions] = useState<LocalPermissionConfig>({
    edit: 'ask',
    bash: 'ask',
    webfetch: 'ask'
  })

  // Load current permissions when drawer opens
  useEffect(() => {
    if (isOpen) {
      loadPermissions()
    }
  }, [isOpen])

  const loadPermissions = async (): Promise<void> => {
    setLoading(true)
    try {
      // Check if we have the API available - this might not be implemented yet
      if (window.api?.toji?.getPermissions) {
        const currentPermissions = await window.api.toji.getPermissions()
        setPermissions({
          edit: currentPermissions.edit || 'ask',
          bash: typeof currentPermissions.bash === 'string' ? currentPermissions.bash : 'ask',
          webfetch: currentPermissions.webfetch || 'ask'
        })
      }
    } catch (error) {
      console.error('Failed to load permissions:', error)
      // Use defaults on error
    } finally {
      setLoading(false)
    }
  }

  const handleSave = async (): Promise<void> => {
    setSaving(true)
    try {
      // Check if we have the API available
      if (window.api?.toji?.updatePermissions) {
        await window.api.toji.updatePermissions(permissions)
        onClose()
      } else {
        console.log('Permissions updated (API not available):', permissions)
        // For now, just close the drawer
        onClose()
      }
    } catch (error) {
      console.error('Failed to save permissions:', error)
    } finally {
      setSaving(false)
    }
  }

  const handleReset = (): void => {
    setPermissions({
      edit: 'ask',
      bash: 'ask',
      webfetch: 'ask'
    })
  }

  const renderRoutingMatrix = (): React.JSX.Element => {
    const permissionTypes = [
      { key: 'edit' as const, label: 'File Editing' },
      { key: 'bash' as const, label: 'Shell Commands' },
      { key: 'webfetch' as const, label: 'Web Requests' }
    ]

    const permissionLevels = [
      { value: 'allow' as const, label: 'Allow' },
      { value: 'ask' as const, label: 'Ask' },
      { value: 'deny' as const, label: 'Deny' }
    ]

    return (
      <Box
        bg="app.dark"
        border="1px solid"
        borderColor="app.border"
        borderRadius="md"
        overflow="hidden"
      >
        {/* Header Row */}
        <HStack
          bg="app.medium"
          borderBottom="1px solid"
          borderColor="app.border"
          px={4}
          py={3}
          gap={0}
        >
          <Box w="140px" flexShrink={0}>
            <Text color="app.light" fontSize="sm" fontWeight="medium">
              Permission
            </Text>
          </Box>
          {permissionLevels.map((level) => (
            <Box key={level.value} flex={1} textAlign="center">
              <Text color="app.light" fontSize="sm" fontWeight="medium">
                {level.label}
              </Text>
            </Box>
          ))}
        </HStack>

        {/* Permission Rows */}
        {permissionTypes.map((permType, index) => (
          <HStack
            key={permType.key}
            px={4}
            py={3}
            gap={0}
            borderBottom={index < permissionTypes.length - 1 ? '1px solid' : 'none'}
            borderColor="app.border"
            _hover={{ bg: 'rgba(255,255,255,0.02)' }}
          >
            <Box w="140px" flexShrink={0}>
              <Text color="app.light" fontSize="sm">
                {permType.label}
              </Text>
            </Box>
            {permissionLevels.map((level) => (
              <Box key={level.value} flex={1} display="flex" justifyContent="center">
                <Box
                  as="button"
                  onClick={() => {
                    setPermissions((prev) => ({
                      ...prev,
                      [permType.key]: level.value
                    }))
                  }}
                  w="20px"
                  h="20px"
                  borderRadius="50%"
                  border="2px solid"
                  borderColor={
                    permissions[permType.key] === level.value ? 'green.500' : 'app.border'
                  }
                  bg={permissions[permType.key] === level.value ? 'green.500' : 'transparent'}
                  cursor="pointer"
                  _hover={{
                    borderColor:
                      permissions[permType.key] === level.value ? 'green.400' : 'app.accent'
                  }}
                  transition="all 0.2s"
                >
                  {permissions[permType.key] === level.value && (
                    <Box w="8px" h="8px" bg="app.dark" borderRadius="50%" mx="auto" my="auto" />
                  )}
                </Box>
              </Box>
            ))}
          </HStack>
        ))}
      </Box>
    )
  }

  return (
    <Drawer.Root
      open={isOpen}
      onOpenChange={({ open }) => !open && onClose()}
      placement="end"
      size="md"
    >
      <Drawer.Backdrop />
      <Drawer.Positioner>
        <Drawer.Content bg="app.medium" border="3px solid" borderColor="app.border">
          <Drawer.Header borderBottom="1px solid" borderColor="app.border" pb={4}>
            <HStack justify="space-between" align="center">
              <VStack align="start" gap={0}>
                <Drawer.Title color="app.light" fontSize="lg" fontWeight="bold">
                  Settings
                </Drawer.Title>
                <Text color="app.text" fontSize="sm">
                  Configure default permissions and preferences
                </Text>
              </VStack>
              <Drawer.CloseTrigger asChild>
                <Button variant="ghost" size="sm" color="app.text">
                  <LuX size={16} />
                </Button>
              </Drawer.CloseTrigger>
            </HStack>
          </Drawer.Header>

          <Drawer.Body py={6}>
            <VStack align="stretch" gap={6}>
              {/* Permission Settings Section */}
              <VStack align="stretch" gap={4}>
                <Box>
                  <Text color="app.light" fontSize="md" fontWeight="medium" mb={1}>
                    Default Permissions
                  </Text>
                  <Text color="app.text" fontSize="sm">
                    Control how Toji handles different types of operations by default
                  </Text>
                </Box>

                {loading ? (
                  <HStack justify="center" py={8}>
                    <Spinner size="lg" color="app.accent" />
                    <Text color="app.text" fontSize="sm">
                      Loading settings...
                    </Text>
                  </HStack>
                ) : (
                  renderRoutingMatrix()
                )}
              </VStack>

              <Separator borderColor="app.border" />

              {/* Future settings sections can go here */}
              <Box>
                <Text color="app.text" fontSize="sm" textAlign="center" py={4}>
                  More settings coming soon...
                </Text>
              </Box>
            </VStack>
          </Drawer.Body>

          <Drawer.Footer borderTop="1px solid" borderColor="app.border" pt={4}>
            <HStack justify="space-between" w="full">
              <Button
                variant="ghost"
                size="sm"
                onClick={handleReset}
                disabled={loading || saving}
                color="app.text"
              >
                <LuRotateCcw size={14} />
                Reset to Defaults
              </Button>

              <HStack gap={2}>
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={onClose}
                  disabled={saving}
                  color="app.text"
                >
                  Cancel
                </Button>
                <Button
                  variant="solid"
                  colorPalette="green"
                  size="sm"
                  onClick={handleSave}
                  loading={saving}
                  disabled={loading}
                >
                  <LuSave size={14} />
                  Apply Settings
                </Button>
              </HStack>
            </HStack>
          </Drawer.Footer>
        </Drawer.Content>
      </Drawer.Positioner>
    </Drawer.Root>
  )
}
