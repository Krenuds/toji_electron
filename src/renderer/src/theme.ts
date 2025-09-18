import { createSystem, defaultConfig } from '@chakra-ui/react'

const customConfig = {
  ...defaultConfig,
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
    }
  }
}

const system = createSystem(customConfig)

export default system
