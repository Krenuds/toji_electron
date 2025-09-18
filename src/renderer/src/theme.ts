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
          accent: { value: '#33b42f' } // Accent color for highlights
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
  }
})

const system = createSystem(defaultConfig, config)

export default system
