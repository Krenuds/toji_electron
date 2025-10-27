import { createContext, useContext, useState, useEffect, useCallback, type ReactNode } from 'react'

// ============================================================================
// Type Definitions
// ============================================================================

export interface ModelOption {
  value: string // provider_id/model_id format
  label: string // Human readable name
  providerId: string
  modelId: string
  providerName: string
  displayLabel?: string // Optional enhanced label with provider info for duplicates
}

export interface AvailableModelsContextValue {
  models: ModelOption[]
  loading: boolean
  error: string | null
  refresh: () => Promise<void>
  isReady: boolean
}

// ============================================================================
// Context Creation
// ============================================================================

const AvailableModelsContext = createContext<AvailableModelsContextValue | undefined>(undefined)

// ============================================================================
// Provider Types
// ============================================================================

interface Provider {
  id: string
  name: string
  models: Record<
    string,
    {
      name: string
      [key: string]: unknown
    }
  >
}

interface AvailableModelsProviderProps {
  children: ReactNode
}

// ============================================================================
// Fallback Models
// ============================================================================

const FALLBACK_MODELS: ModelOption[] = [
  {
    value: 'opencode/grok-code-fast-1',
    label: 'Grok Code Fast 1 (Default)',
    providerId: 'opencode',
    modelId: 'grok-code-fast-1',
    providerName: 'OpenCode'
  },
  {
    value: 'opencode/code-supernova',
    label: 'Code Supernova',
    providerId: 'opencode',
    modelId: 'code-supernova',
    providerName: 'OpenCode'
  },
  {
    value: 'anthropic/claude-3-5-sonnet-20241022',
    label: 'Claude 3.5 Sonnet',
    providerId: 'anthropic',
    modelId: 'claude-3-5-sonnet-20241022',
    providerName: 'Anthropic'
  }
]

// ============================================================================
// Provider Component
// ============================================================================

export function AvailableModelsProvider({
  children
}: AvailableModelsProviderProps): React.JSX.Element {
  const [models, setModels] = useState<ModelOption[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [isReady, setIsReady] = useState(false)

  const fetchModels = useCallback(async (): Promise<void> => {
    setLoading(true)
    setError(null)

    try {
      const result = await window.api.toji.getModelProviders()
      const providers = result.providers as Provider[]

      const modelOptions: ModelOption[] = []
      const modelNameCounts = new Map<string, number>()

      // First pass: count occurrences of each model name
      for (const provider of providers) {
        for (const modelData of Object.values(provider.models)) {
          const count = modelNameCounts.get(modelData.name) || 0
          modelNameCounts.set(modelData.name, count + 1)
        }
      }

      // Second pass: build model options with enhanced labels for duplicates
      for (const provider of providers) {
        for (const [modelId, modelData] of Object.entries(provider.models)) {
          const isDuplicate = (modelNameCounts.get(modelData.name) || 0) > 1

          modelOptions.push({
            value: `${provider.id}/${modelId}`,
            label: modelData.name,
            providerId: provider.id,
            modelId: modelId,
            providerName: provider.name,
            // Add provider name to label if there are duplicates
            displayLabel: isDuplicate ? `${modelData.name} (${provider.name})` : modelData.name
          })
        }
      }

      // Sort: prioritize opencode, then alphabetically by display label
      modelOptions.sort((a, b) => {
        // OpenCode models first
        if (a.providerId === 'opencode' && b.providerId !== 'opencode') return -1
        if (a.providerId !== 'opencode' && b.providerId === 'opencode') return 1

        // Then alphabetically
        const labelA = a.displayLabel || a.label
        const labelB = b.displayLabel || b.label
        return labelA.localeCompare(labelB)
      })

      setModels(modelOptions)
      setIsReady(true)
    } catch (err) {
      console.error('Failed to fetch model providers:', err)
      setError(err instanceof Error ? err.message : 'Unknown error fetching models')
      setModels(FALLBACK_MODELS)
      setIsReady(true)
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => {
    fetchModels()
  }, [fetchModels])

  const value: AvailableModelsContextValue = {
    models,
    loading,
    error,
    refresh: fetchModels,
    isReady
  }

  return <AvailableModelsContext.Provider value={value}>{children}</AvailableModelsContext.Provider>
}

// ============================================================================
// Custom Hook
// ============================================================================

export function useAvailableModelsContext(): AvailableModelsContextValue {
  const context = useContext(AvailableModelsContext)
  if (!context) {
    throw new Error('useAvailableModelsContext must be used within AvailableModelsProvider')
  }
  return context
}
