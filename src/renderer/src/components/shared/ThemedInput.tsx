import { Input, InputProps } from '@chakra-ui/react'
import React from 'react'

type ThemedInputProps = Omit<
  InputProps,
  'bg' | 'border' | 'borderColor' | 'color' | '_placeholder' | '_focus'
>

export function ThemedInput(props: ThemedInputProps): React.JSX.Element {
  return (
    <Input
      bg="rgba(255,255,255,0.02)"
      border="1px solid"
      borderColor="app.border"
      color="app.light"
      _placeholder={{ color: 'app.text' }}
      _focus={{ borderColor: 'green.500', boxShadow: 'none' }}
      {...props}
    />
  )
}
