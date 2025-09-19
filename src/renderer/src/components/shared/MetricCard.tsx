import React from 'react'
import { Card, HStack, Text, VStack } from '@chakra-ui/react'

interface MetricCardProps {
  title: string
  value: string | number
  description?: string
  icon?: React.ReactNode
  badge?: React.ReactNode
  variant?: 'default' | 'accent' | 'success' | 'warning'
  onClick?: () => void
  valueSize?: 'sm' | 'md' | 'lg' | 'xl'
  trend?: {
    value: string
    isPositive: boolean
  }
}

export function MetricCard({
  title,
  value,
  description,
  icon,
  badge,
  variant = 'default',
  onClick,
  valueSize = 'lg',
  trend
}: MetricCardProps): React.JSX.Element {
  const getCardStyles = (): Record<string, string> => {
    const baseStyles = {
      bg: 'app.dark',
      border: '1px solid',
      borderColor: 'app.border'
    }

    if (variant === 'accent') {
      return { ...baseStyles, borderColor: 'app.accent' }
    }
    if (variant === 'success') {
      return { ...baseStyles, borderColor: 'green.500' }
    }
    if (variant === 'warning') {
      return { ...baseStyles, borderColor: 'orange.500' }
    }

    return baseStyles
  }

  const getValueColor = (): string => {
    if (variant === 'accent') return 'app.accent'
    if (variant === 'success') return 'green.400'
    if (variant === 'warning') return 'orange.400'
    return 'app.light'
  }

  const valueFontSize = {
    sm: 'md',
    md: 'lg',
    lg: 'xl',
    xl: '2xl'
  }[valueSize]

  return (
    <Card.Root
      {...getCardStyles()}
      cursor={onClick ? 'pointer' : 'default'}
      onClick={onClick}
      _hover={onClick ? { borderColor: 'app.accent', transition: 'border-color 0.2s' } : undefined}
    >
      <Card.Body p={4}>
        <VStack align="stretch" gap={2}>
          {/* Header with title and icon/badge */}
          <HStack justify="space-between">
            <Text color="app.text" fontSize="sm" textTransform="uppercase" letterSpacing="wide">
              {title}
            </Text>
            {icon || badge}
          </HStack>

          {/* Main value with optional trend */}
          <HStack justify="space-between" align="baseline">
            <Text color={getValueColor()} fontSize={valueFontSize} fontWeight="bold">
              {value}
            </Text>
            {trend && (
              <Text
                fontSize="xs"
                color={trend.isPositive ? 'green.400' : 'red.400'}
                fontWeight="medium"
              >
                {trend.isPositive ? '↑' : '↓'} {trend.value}
              </Text>
            )}
          </HStack>

          {/* Optional description */}
          {description && (
            <Text color="app.text" fontSize="xs" lineHeight="short">
              {description}
            </Text>
          )}
        </VStack>
      </Card.Body>
    </Card.Root>
  )
}
