import React from 'react'

export interface InputProps {
  value: string
  onChange: (value: string) => void
  placeholder?: string
  disabled?: boolean
  type?: 'text' | 'password' | 'email' | 'number'
  error?: string | null
  label?: string
  required?: boolean
  className?: string
}

export function Input({
  value,
  onChange,
  placeholder,
  disabled = false,
  type = 'text',
  error,
  label,
  required = false,
  className = ''
}: InputProps): React.JSX.Element {
  const inputId = React.useId()

  return (
    <div className={`input-group ${className}`}>
      {label && (
        <label htmlFor={inputId} className="input-label">
          {label}
          {required && <span className="required">*</span>}
        </label>
      )}
      <input
        id={inputId}
        type={type}
        value={value}
        onChange={(e) => onChange(e.target.value)}
        placeholder={placeholder}
        disabled={disabled}
        required={required}
        className={`input ${error ? 'input-error' : ''}`}
      />
      {error && <span className="input-error-message">{error}</span>}
    </div>
  )
}
