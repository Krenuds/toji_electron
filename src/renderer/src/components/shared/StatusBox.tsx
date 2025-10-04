import { Box } from '@chakra-ui/react'
import React from 'react'

interface StatusBoxProps {
  variant: 'info' | 'success' | 'error' | 'warning'
  children: React.ReactNode
  compact?: boolean
}

const variantStyles = {
  info: {
    bg: 'rgba(88, 101, 242, 0.1)',
    borderColor: '#5865F2'
  },
  success: {
    bg: 'rgba(34, 197, 94, 0.1)',
    borderColor: 'green.500'
  },
  error: {
    bg: 'rgba(239, 68, 68, 0.1)',
    borderColor: 'red.500'
  },
  warning: {
    bg: 'rgba(245, 158, 11, 0.1)',
    borderColor: 'orange.500'
  }
}

export function StatusBox({
  variant,
  children,
  compact = false
}: StatusBoxProps): React.JSX.Element {
  const styles = variantStyles[variant]

  return (
    <Box
      p={compact ? 2 : 3}
      bg={styles.bg}
      borderRadius="md"
      border="1px solid"
      borderColor={styles.borderColor}
    >
      {children}
    </Box>
  )
}
