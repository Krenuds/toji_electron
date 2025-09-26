// This hook is deprecated - projects are now read-only from the SDK
// Use useProjects() instead for project information
export function useOpenProject(): {
  openProject: () => Promise<void>
  loading: boolean
  error: null
  currentProject: null
} {
  return {
    openProject: async () => {
      console.warn('useOpenProject is deprecated - projects are read-only from SDK')
    },
    loading: false,
    error: null,
    currentProject: null
  }
}
