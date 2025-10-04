import { Button, ButtonProps, Text } from '@chakra-ui/react'
import React from 'react'

interface ActionButtonProps extends Omit<ButtonProps, 'children' | 'variant'> {
  variant?: 'primary' | 'secondary' | 'danger' | 'ghost'
  children: React.ReactNode
  leftIcon?: React.ReactElement
  rightIcon?: React.ReactElement
}

export function ActionButton({
  variant = 'primary',
  children,
  leftIcon,
  rightIcon,
  ...props
}: ActionButtonProps): React.JSX.Element {
  const variantProps = {
    primary: {
      colorPalette: 'green',
      variant: 'solid' as const,
      textColor: 'white'
    },
    secondary: {
      variant: 'solid' as const,
      bg: 'gray.700',
      _hover: { bg: 'gray.600' },
      textColor: 'white'
    },
    danger: {
      colorPalette: 'red',
      variant: 'solid' as const,
      textColor: 'white'
    },
    ghost: {
      variant: 'ghost' as const,
      textColor: 'currentColor'
    }
  }[variant]

  return (
    <Button {...variantProps} {...props}>
      {leftIcon}
      <Text color={variantProps.textColor} ml={leftIcon ? 1 : 0} mr={rightIcon ? 1 : 0}>
        {children}
      </Text>
      {rightIcon}
    </Button>
  )
}
