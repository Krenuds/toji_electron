import React from 'react'
import { Box } from '@chakra-ui/react'

interface PlaceholderProps {
  viewName: string
}

export const PlaceholderSidebar = ({ viewName }: PlaceholderProps): React.JSX.Element => (
  <Box color="app.light" fontSize="sm" fontWeight="bold" mb={4}>
    {viewName.charAt(0).toUpperCase() + viewName.slice(1)} Sidebar
    <Box color="app.text" fontSize="xs" mt={2}>
      Coming soon...
    </Box>
  </Box>
)

export const PlaceholderMain = ({ viewName }: PlaceholderProps): React.JSX.Element => (
  <Box color="app.light" fontSize="lg" fontWeight="bold" mb={4}>
    {viewName.charAt(0).toUpperCase() + viewName.slice(1)} Main Content
    <Box color="app.text" fontSize="sm" mt={2}>
      This view is under development.
    </Box>
  </Box>
)
