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
