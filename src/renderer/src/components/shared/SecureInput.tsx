import React, { useState } from 'react'
import { Field, Input, Button, HStack } from '@chakra-ui/react'
import { LuEye, LuEyeOff } from 'react-icons/lu'

interface SecureInputProps {
  label: string
  value: string
  onChange: (value: string) => void
  placeholder?: string
  error?: string
  required?: boolean
  allowToggle?: boolean
}

export function SecureInput({
  label,
  value,
  onChange,
  placeholder = 'Enter value...',
  error,
  required = false,
  allowToggle = true
}: SecureInputProps): React.JSX.Element {
  const [showValue, setShowValue] = useState(false)
  const isInvalid = Boolean(error)

  return (
    <Field.Root invalid={isInvalid} required={required}>
      <Field.Label color="app.light" fontSize="sm" fontWeight="medium" mb={2}>
        {label}
      </Field.Label>
      <HStack gap={2}>
        <Input
          type={showValue ? 'text' : 'password'}
          value={value}
          onChange={(e) => onChange(e.target.value)}
          placeholder={placeholder}
          bg="rgba(255,255,255,0.02)"
          border="1px solid"
          borderColor={isInvalid ? 'app.error' : 'app.border'}
          color="app.light"
          _placeholder={{ color: 'app.text' }}
          _focus={{ 
            borderColor: isInvalid ? 'app.error' : 'app.accent', 
            boxShadow: 'none' 
          }}
          flex="1"
          spellCheck={false}
          autoComplete="new-password"
        />
        {allowToggle && value && (
          <Button
            variant="ghost"
            size="sm"
            color="app.text"
            _hover={{ color: 'app.light', bg: 'rgba(255,255,255,0.05)' }}
            onClick={() => setShowValue(!showValue)}
            aria-label={showValue ? 'Hide value' : 'Show value'}
          >
            {showValue ? <LuEyeOff size={16} /> : <LuEye size={16} />}
          </Button>
        )}
      </HStack>
      {error && (
        <Field.ErrorText color="app.error" fontSize="xs" mt={1}>
          {error}
        </Field.ErrorText>
      )}
    </Field.Root>
  )
}