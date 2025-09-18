import { createSystem, defaultConfig, defineConfig } from '@chakra-ui/react'

const config = defineConfig({
  theme: {
    tokens: {
      colors: {
        app: {
          darkest: { value: '#09090b' }, // Icon bar background
          dark: { value: '#1a1a1a' }, // Sidebar background
          medium: { value: '#242424' }, // Main content background
          border: { value: '#404040' }, // Borders and dividers
          text: { value: '#808080' }, // Secondary text
          light: { value: '#ffffff' }, // Primary text and icons
          accent: { value: '#33b42f' }, // Accent color for highlights (Toji green)
          error: { value: '#ef4444' } // Error/stub indicators only
        },
        green: {
          50: { value: '#e6f7e6' },
          100: { value: '#b3e6b3' },
          200: { value: '#80d580' },
          300: { value: '#4dc34d' },
          400: { value: '#33b42f' },
          500: { value: '#2ca02c' },
          600: { value: '#248f24' },
          700: { value: '#1c7d1c' },
          800: { value: '#155c15' },
          900: { value: '#0d3a0d' }
        }
      }
    },
    semanticTokens: {
      colors: {
        'blue.focusRing': { value: 'transparent' },
        'gray.focusRing': { value: 'transparent' },
        'red.focusRing': { value: 'transparent' },
        'green.focusRing': { value: 'transparent' },
        'purple.focusRing': { value: 'transparent' },
        'orange.focusRing': { value: 'transparent' },
        'yellow.focusRing': { value: 'transparent' },
        'teal.focusRing': { value: 'transparent' },
        'cyan.focusRing': { value: 'transparent' },
        'pink.focusRing': { value: 'transparent' }
      }
    }
  },
  globalCss: {
    // Override default switch colors globally
    '[data-scope="switch"][data-part="control"]': {
      background: 'var(--chakra-colors-app-border) !important',
      border: '1px solid var(--chakra-colors-app-border)'
    },
    '[data-scope="switch"][data-part="control"][data-state="checked"]': {
      background: 'var(--chakra-colors-green-200) !important',
      borderColor: 'var(--chakra-colors-app-accent)'
    }
  }
})

const system = createSystem(defaultConfig, config)

export default system
