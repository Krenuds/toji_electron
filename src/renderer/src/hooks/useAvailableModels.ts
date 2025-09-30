import { useState, useEffect, useCallback } from 'react'

// Define types for OpenCode provider data
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

interface ModelOption {
  value: string // provider_id/model_id format
  label: string // Human readable name
  providerId: string
  modelId: string
  providerName: string
}

interface UseAvailableModelsReturn {
  models: ModelOption[]
  loading: boolean
  error: string | null
  refresh: () => Promise<void>
  isReady: boolean
}

// Fallback models if API is unavailable
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
  },
  {
    value: 'openai/gpt-4o',
    label: 'GPT-4o',
    providerId: 'openai',
    modelId: 'gpt-4o',
    providerName: 'OpenAI'
  },
  {
    value: 'google/gemini-1.5-pro',
    label: 'Gemini 1.5 Pro',
    providerId: 'google',
    modelId: 'gemini-1.5-pro',
    providerName: 'Google'
  }
]

/**
 * Hook to fetch and manage available AI models from OpenCode SDK
 *
 * This hook:
 * - Fetches providers from OpenCode client.config.providers()
 * - Transforms provider data into dropdown-friendly format
 * - Provides loading states and error handling
 * - Falls back to hardcoded models if API unavailable
 * - Caches results to avoid repeated API calls
 */
export function useAvailableModels(): UseAvailableModelsReturn {
  const [models, setModels] = useState<ModelOption[]>(FALLBACK_MODELS)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [isReady, setIsReady] = useState(false)

  /**
   * Transform OpenCode Provider data into ModelOption format
   */
  const transformProvidersToModels = useCallback((providers: Provider[]): ModelOption[] => {
    const modelOptions: ModelOption[] = []

    providers.forEach((provider) => {
      Object.entries(provider.models || {}).forEach(([modelId, modelInfo]) => {
        modelOptions.push({
          value: `${provider.id}/${modelId}`,
          label: modelInfo.name || modelId,
          providerId: provider.id,
          modelId,
          providerName: provider.name || provider.id
        })
      })
    })

    // Sort by provider name, then model name
    return modelOptions.sort((a, b) => {
      if (a.providerName !== b.providerName) {
        return a.providerName.localeCompare(b.providerName)
      }
      return a.label.localeCompare(b.label)
    })
  }, [])

  /**
   * Fetch available models from OpenCode SDK
   */
  const fetchModels = useCallback(async (): Promise<void> => {
    if (!window.api?.toji?.getModelProviders) {
      console.warn('Model providers API not available, using fallback models')
      setModels(FALLBACK_MODELS)
      setIsReady(true)
      return
    }

    setLoading(true)
    setError(null)

    try {
      const response = await window.api.toji.getModelProviders()

      if (response?.providers && Array.isArray(response.providers)) {
        const transformedModels = transformProvidersToModels(response.providers)

        if (transformedModels.length > 0) {
          setModels(transformedModels)
          console.log(
            `Loaded ${transformedModels.length} models from ${response.providers.length} providers`
          )
        } else {
          console.warn('No models found in provider response, using fallback')
          setModels(FALLBACK_MODELS)
        }
      } else {
        console.warn('Invalid provider response format, using fallback models')
        setModels(FALLBACK_MODELS)
      }

      setIsReady(true)
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Failed to load models'
      console.error('Error fetching model providers:', err)
      setError(errorMessage)
      setModels(FALLBACK_MODELS) // Always provide fallback
      setIsReady(true) // Still mark as ready with fallbacks
    } finally {
      setLoading(false)
    }
  }, [transformProvidersToModels])

  /**
   * Refresh models (exposed for manual refresh)
   */
  const refresh = useCallback(async (): Promise<void> => {
    await fetchModels()
  }, [fetchModels])

  // Load models on mount
  useEffect(() => {
    fetchModels()
  }, [fetchModels])

  return {
    models,
    loading,
    error,
    refresh,
    isReady
  }
}
