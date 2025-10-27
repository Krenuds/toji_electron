import React, { useState, useEffect, useCallback } from 'react'
import {
  Drawer,
  VStack,
  HStack,
  Text,
  Button,
  Separator,
  Spinner,
  Box,
  Field
} from '@chakra-ui/react'
import { LuX, LuSave, LuRotateCcw } from 'react-icons/lu'
import { useAvailableModelsContext } from '../../contexts/AvailableModelsContext'

// Define types locally since we can't import from preload directly
interface LocalPermissionConfig {
  edit?: 'allow' | 'ask' | 'deny'
  bash?: 'allow' | 'ask' | 'deny'
  webfetch?: 'allow' | 'ask' | 'deny'
}

interface LocalModelConfig {
  model?: string
  small_model?: string
}

interface SettingsDrawerProps {
  isOpen: boolean
  onClose: () => void
  mode?: 'default' | 'project'
  projectPath?: string
}

export function SettingsDrawer({
  isOpen,
  onClose,
  mode = 'default',
  projectPath
}: SettingsDrawerProps): React.JSX.Element {
  const [loading, setLoading] = useState(false)
  const [saving, setSaving] = useState(false)

  // Load available models from OpenCode SDK
  const { models: availableModels, loading: modelsLoading } = useAvailableModelsContext()

  const isProjectMode = mode === 'project'
  const [permissions, setPermissions] = useState<LocalPermissionConfig>({
    edit: 'ask',
    bash: 'ask',
    webfetch: 'ask'
  })
  const [models, setModels] = useState<LocalModelConfig>({
    model: 'opencode/grok-code-fast-1',
    small_model: ''
  })

  const loadPermissions = useCallback(async (): Promise<void> => {
    setLoading(true)
    try {
      // ConfigManager automatically handles project vs global based on current directory
      if (window.api?.toji?.getPermissions) {
        const currentPermissions = await window.api.toji.getPermissions()
        setPermissions({
          edit: currentPermissions.edit || 'ask',
          bash: typeof currentPermissions.bash === 'string' ? currentPermissions.bash : 'ask',
          webfetch: currentPermissions.webfetch || 'ask'
        })
      }
    } catch {
      // Use defaults on error - no need for console.error as this has proper logging in backend
    } finally {
      setLoading(false)
    }
  }, [])

  const loadModelSettings = useCallback(async (): Promise<void> => {
    setLoading(true)
    try {
      // ConfigManager automatically determines project vs global context
      if (window.api?.toji?.getModelConfig) {
        const currentModels = await window.api.toji.getModelConfig()
        setModels({
          model: currentModels.model || 'opencode/grok-code-fast-1',
          small_model: currentModels.small_model || ''
        })
      }
    } catch {
      // Keep existing default values on error - backend handles logging
    } finally {
      setLoading(false)
    }
  }, [])

  // Load current permissions and models when drawer opens
  useEffect(() => {
    if (isOpen) {
      loadPermissions()
      loadModelSettings()
    }
  }, [isOpen, loadPermissions, loadModelSettings])

  const handleSave = async (): Promise<void> => {
    setSaving(true)
    try {
      // Save permissions - ConfigManager handles project vs global context automatically
      if (window.api?.toji?.updatePermissions) {
        await window.api.toji.updatePermissions(permissions)
      }

      // Save model configuration - ConfigManager handles context automatically
      if (window.api?.toji?.updateModelConfig) {
        await window.api.toji.updateModelConfig(models)
      }

      onClose()
    } catch {
      // Backend handles error logging with proper context
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
    // Reset to first available model or fallback
    const defaultModel =
      availableModels.length > 0 ? availableModels[0].value : 'opencode/grok-code-fast-1'
    setModels({
      model: defaultModel,
      small_model: ''
    })
  }

  const renderModelSelection = (): React.JSX.Element => {
    // Show loading state while models are being fetched
    if (modelsLoading) {
      return (
        <Box textAlign="center" py={4}>
          <Spinner size="sm" color="app.accent" />
          <Text color="app.text" fontSize="sm" mt={2}>
            Loading available models...
          </Text>
        </Box>
      )
    }

    // Show error state if models failed to load (fallbacks are still available)
    // Error logging handled by useAvailableModels hook

    const modelTypes = [
      {
        key: 'model' as const,
        label: 'Primary Model',
        description: 'Main model used for most AI operations and conversations',
        required: true
      },
      {
        key: 'small_model' as const,
        label: 'Small Model (Optional)',
        description: 'Lightweight model for simple tasks like title generation',
        required: false
      }
    ]

    return (
      <VStack align="stretch" gap={4}>
        {modelTypes.map((modelType) => (
          <Box key={modelType.key}>
            <Text color="app.light" fontSize="sm" fontWeight="medium" mb={1}>
              {modelType.label}
            </Text>
            <Text color="app.text" fontSize="xs" mb={3}>
              {modelType.description}
            </Text>
            <Field.Root>
              <select
                value={
                  models[modelType.key] ||
                  (modelType.required && availableModels.length > 0
                    ? availableModels[0].value
                    : modelType.required
                      ? 'opencode/grok-code-fast-1'
                      : '')
                }
                onChange={(e) => {
                  setModels((prev) => ({
                    ...prev,
                    [modelType.key]: e.target.value
                  }))
                }}
                style={{
                  background: 'var(--chakra-colors-app-dark)',
                  border: '1px solid var(--chakra-colors-app-border)',
                  borderRadius: '6px',
                  padding: '8px 12px',
                  color: 'var(--chakra-colors-app-light)',
                  fontSize: '14px',
                  cursor: 'pointer',
                  width: '100%'
                }}
              >
                {!modelType.required && <option value="">None (use primary model)</option>}
                {/* Group models by provider for better organization */}
                {(() => {
                  const groupedModels = availableModels.reduce(
                    (acc, model) => {
                      if (!acc[model.providerName]) {
                        acc[model.providerName] = []
                      }
                      acc[model.providerName].push(model)
                      return acc
                    },
                    {} as Record<string, typeof availableModels>
                  )

                  return Object.entries(groupedModels).map(([providerName, models]) => (
                    <optgroup key={providerName} label={providerName}>
                      {models.map((model) => (
                        <option key={model.value} value={model.value}>
                          {model.displayLabel || model.label}
                        </option>
                      ))}
                    </optgroup>
                  ))
                })()}
              </select>
            </Field.Root>
          </Box>
        ))}
      </VStack>
    )
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
      placement="start"
      size="md"
    >
      <Drawer.Backdrop />
      <Drawer.Positioner>
        <Drawer.Content bg="app.medium" border="3px solid" borderColor="app.border">
          <Drawer.Header borderBottom="1px solid" borderColor="app.border" pb={4}>
            <HStack justify="space-between" align="center">
              <VStack align="start" gap={0}>
                <Drawer.Title color="app.light" fontSize="lg" fontWeight="bold">
                  {isProjectMode ? 'Project Settings' : 'Default Settings'}
                </Drawer.Title>
                <Text color="app.text" fontSize="sm">
                  {isProjectMode
                    ? `Configure permissions and preferences for this project`
                    : 'Configure default permissions and preferences for new projects'}
                </Text>
                {isProjectMode && projectPath && (
                  <Text color="app.text" fontSize="xs" mt={1}>
                    Project: {projectPath.split(/[/\\]/).pop()}
                  </Text>
                )}
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
                    {isProjectMode ? 'Project Permissions' : 'Default Permissions'}
                  </Text>
                  <Text color="app.text" fontSize="sm">
                    {isProjectMode
                      ? 'Control how Toji handles operations in this specific project'
                      : 'Control how Toji handles different types of operations by default'}
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

              {/* Model Selection Section */}
              <VStack align="stretch" gap={4}>
                <Box>
                  <Text color="app.light" fontSize="md" fontWeight="medium" mb={1}>
                    Model Selection
                  </Text>
                  <Text color="app.text" fontSize="sm">
                    Choose different AI models for specific tasks
                  </Text>
                </Box>

                {renderModelSelection()}
              </VStack>
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
