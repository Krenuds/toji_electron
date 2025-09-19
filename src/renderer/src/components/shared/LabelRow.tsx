import React from 'react'
import { HStack, Text, type TextProps, type StackProps } from '@chakra-ui/react'

interface LabelRowProps {
  label: string
  value?: React.ReactNode
  icon?: React.ReactNode
  mb?: StackProps['mb']
  gap?: StackProps['gap']
  labelColor?: string
  valueColor?: string
  labelSize?: TextProps['fontSize']
  valueSize?: TextProps['fontSize']
  labelWeight?: TextProps['fontWeight']
  valueWeight?: TextProps['fontWeight']
  justify?: StackProps['justify']
}

export function LabelRow({
  label,
  value,
  icon,
  mb = 2,
  gap = 2,
  labelColor = 'app.text',
  valueColor = 'app.light',
  labelSize = 'sm',
  valueSize = 'sm',
  labelWeight = 'normal',
  valueWeight = 'medium',
  justify = 'space-between'
}: LabelRowProps): React.JSX.Element {
  return (
    <HStack justify={justify} mb={mb} gap={gap}>
      <Text color={labelColor} fontSize={labelSize} fontWeight={labelWeight}>
        {label}
      </Text>
      {(value || icon) && (
        <HStack gap={1}>
          {typeof value === 'string' || typeof value === 'number' ? (
            <Text color={valueColor} fontSize={valueSize} fontWeight={valueWeight}>
              {value}
            </Text>
          ) : (
            value
          )}
          {icon}
        </HStack>
      )}
    </HStack>
  )
}
