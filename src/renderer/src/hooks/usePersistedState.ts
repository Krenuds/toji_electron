import { useState, useEffect, useCallback, useRef } from 'react'

/**
 * Options for configuring usePersistedState behavior
 */
export interface UsePersistedStateOptions<T> {
  /**
   * Function to transform the parsed value after deserialization
   * Useful for hydrating complex types like Date objects
   */
  hydrate?: (value: T) => T

  /**
   * Custom serialization function (defaults to JSON.stringify)
   */
  serialize?: (value: T) => string

  /**
   * Custom deserialization function (defaults to JSON.parse)
   */
  deserialize?: (value: string) => T
}

/**
 * A hook that persists state to localStorage with automatic serialization/deserialization
 *
 * Features:
 * - Automatic localStorage read on mount
 * - Automatic localStorage write on state change
 * - Error handling for localStorage failures (quota exceeded, etc.)
 * - Support for functional updates like useState
 * - Optional hydration function for complex types (Date objects, etc.)
 * - TypeScript generics for type safety
 *
 * @param key - The localStorage key to use
 * @param initialValue - The initial value if no cached value exists
 * @param options - Optional configuration for serialization and hydration
 * @returns A tuple of [state, setState] similar to useState
 *
 * @example
 * // Simple usage
 * const [user, setUser] = usePersistedState('user', null)
 *
 * @example
 * // With Date hydration
 * const [messages, setMessages] = usePersistedState(
 *   'messages',
 *   [],
 *   {
 *     hydrate: (messages) => messages.map(msg => ({
 *       ...msg,
 *       timestamp: new Date(msg.timestamp)
 *     }))
 *   }
 * )
 */
export function usePersistedState<T>(
  key: string,
  initialValue: T,
  options?: UsePersistedStateOptions<T>
): [T, (value: T | ((prev: T) => T)) => void] {
  // Extract options with defaults
  const { hydrate, serialize = JSON.stringify, deserialize = JSON.parse } = options || {}

  // Track if this is the initial mount
  const isInitialMount = useRef(true)

  // Initialize state with cached value or initial value
  const [state, setState] = useState<T>(() => {
    try {
      const cachedValue = localStorage.getItem(key)
      if (cachedValue !== null) {
        const parsed = deserialize(cachedValue) as T
        return hydrate ? hydrate(parsed) : parsed
      }
    } catch (error) {
      console.error(`[usePersistedState] Failed to load cached value for key "${key}":`, error)
    }
    return initialValue
  })

  // Save to localStorage whenever state changes (but not on initial mount)
  useEffect(() => {
    // Skip saving on initial mount to avoid unnecessary writes
    if (isInitialMount.current) {
      isInitialMount.current = false
      return
    }

    try {
      const serialized = serialize(state)
      localStorage.setItem(key, serialized)
    } catch (error) {
      // Handle quota exceeded and other localStorage errors gracefully
      if (error instanceof Error) {
        if (error.name === 'QuotaExceededError') {
          console.error(`[usePersistedState] localStorage quota exceeded for key "${key}"`)
        } else {
          console.error(
            `[usePersistedState] Failed to save to localStorage for key "${key}":`,
            error
          )
        }
      }
    }
  }, [key, state, serialize])

  // Wrapper for setState that supports functional updates
  const setPersistedState = useCallback((value: T | ((prev: T) => T)) => {
    setState(value)
  }, [])

  return [state, setPersistedState]
}
