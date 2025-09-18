import React from 'react'
import { Box, Text } from '@chakra-ui/react'

type ServiceStatus = 'running' | 'stopped' | 'starting' | 'stopping' | 'checking' | 'stub'

interface StatusBadgeProps {
  status: ServiceStatus
  size?: 'sm' | 'md' | 'lg'
}

const statusConfig = {
  running: {
    bg: 'app.accent',
    color: 'app.dark',
    label: 'Running'
  },
  stopped: {
    bg: 'app.border',
    color: 'app.light',
    label: 'Stopped'
  },
  starting: {
    bg: 'app.text',
    color: 'app.dark',
    label: 'Starting'
  },
  stopping: {
    bg: 'app.text',
    color: 'app.dark',
    label: 'Stopping'
  },
  checking: {
    bg: 'app.text',
    color: 'app.dark',
    label: 'Checking...'
  },
  stub: {
    bg: 'app.error',
    color: 'app.light',
    label: 'STUB'
  }
} as const

const sizeConfig = {
  sm: { px: 2, py: 0.5, fontSize: '2xs' },
  md: { px: 2.5, py: 1, fontSize: 'xs' },
  lg: { px: 3, py: 1.5, fontSize: 'sm' }
}

export function StatusBadge({ status, size = 'sm' }: StatusBadgeProps): React.JSX.Element {
  const config = statusConfig[status]
  const sizeProps = sizeConfig[size]

  return (
    <Box
      display="inline-block"
      px={sizeProps.px}
      py={sizeProps.py}
      borderRadius="md"
      bg={config.bg}
    >
      <Text
        fontSize={sizeProps.fontSize}
        fontWeight="medium"
        color={config.color}
        textTransform="uppercase"
        letterSpacing="wider"
      >
        {config.label}
      </Text>
    </Box>
  )
}
