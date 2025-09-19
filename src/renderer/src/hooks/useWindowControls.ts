/**
 * Hook for window control operations
 * Abstracts window.api.window calls to maintain architectural consistency
 */

interface WindowControls {
  minimize: () => void
  maximize: () => void
  close: () => void
}

export const useWindowControls = (): WindowControls => {
  const minimize = (): void => {
    if (window.api?.window?.minimize) {
      window.api.window.minimize()
    }
  }

  const maximize = (): void => {
    if (window.api?.window?.maximize) {
      window.api.window.maximize()
    }
  }

  const close = (): void => {
    if (window.api?.window?.close) {
      window.api.window.close()
    }
  }

  return {
    minimize,
    maximize,
    close
  }
}
