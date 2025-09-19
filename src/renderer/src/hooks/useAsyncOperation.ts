import { useState, useCallback, useEffect, useRef } from 'react'

interface UseAsyncOperationOptions<T> {
  initialData?: T
  onError?: (error: string) => void
  onSuccess?: (data: T) => void
  autoExecute?: boolean
}

interface UseAsyncOperationResult<T> {
  data: T | undefined
  isLoading: boolean
  error: string | null
  execute: () => Promise<void>
  reset: () => void
}

export function useAsyncOperation<T>(
  operation: () => Promise<T>,
  options: UseAsyncOperationOptions<T> = {}
): UseAsyncOperationResult<T> {
  const { initialData, onError, onSuccess, autoExecute = false } = options

  const [data, setData] = useState<T | undefined>(initialData)
  const [isLoading, setIsLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  // Use ref to track if component is mounted to prevent state updates on unmounted components
  const isMountedRef = useRef(true)

  useEffect(() => {
    return () => {
      isMountedRef.current = false
    }
  }, [])

  const execute = useCallback(async () => {
    if (!isMountedRef.current) return

    setIsLoading(true)
    setError(null)

    try {
      const result = await operation()

      if (isMountedRef.current) {
        setData(result)
        setIsLoading(false)
        onSuccess?.(result)
      }
    } catch (err) {
      if (isMountedRef.current) {
        const errorMessage = err instanceof Error ? err.message : 'An unknown error occurred'
        setError(errorMessage)
        setIsLoading(false)
        onError?.(errorMessage)
      }
    }
  }, [operation, onSuccess, onError])

  const reset = useCallback(() => {
    setData(initialData)
    setIsLoading(false)
    setError(null)
  }, [initialData])

  // Auto-execute on mount if requested
  useEffect(() => {
    if (autoExecute) {
      execute()
    }
  }, []) // eslint-disable-line react-hooks/exhaustive-deps

  return {
    data,
    isLoading,
    error,
    execute,
    reset
  }
}
