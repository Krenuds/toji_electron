import React from 'react'

export interface ButtonProps {
  children: React.ReactNode
  onClick?: () => void
  disabled?: boolean
  variant?: 'primary' | 'secondary' | 'danger' | 'success'
  size?: 'small' | 'medium' | 'large'
  loading?: boolean
  type?: 'button' | 'submit' | 'reset'
  className?: string
}

export function Button({
  children,
  onClick,
  disabled = false,
  variant = 'primary',
  size = 'medium',
  loading = false,
  type = 'button',
  className = ''
}: ButtonProps): React.JSX.Element {
  const baseClasses = 'btn'
  const variantClasses = {
    primary: 'btn-primary',
    secondary: 'btn-secondary',
    danger: 'btn-danger',
    success: 'btn-success'
  }
  const sizeClasses = {
    small: 'btn-sm',
    medium: 'btn-md',
    large: 'btn-lg'
  }

  const classes = [
    baseClasses,
    variantClasses[variant],
    sizeClasses[size],
    loading && 'btn-loading',
    disabled && 'btn-disabled',
    className
  ]
    .filter(Boolean)
    .join(' ')

  return (
    <button type={type} className={classes} onClick={onClick} disabled={disabled || loading}>
      {loading ? (
        <span className="btn-spinner">
          <span className="spinner"></span>
          Loading...
        </span>
      ) : (
        children
      )}
    </button>
  )
}
