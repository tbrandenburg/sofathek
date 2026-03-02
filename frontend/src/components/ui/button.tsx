import React from 'react'

interface ButtonProps extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  children: React.ReactNode
  variant?: 'default' | 'secondary' | 'outline' | 'ghost'
  size?: 'default' | 'sm' | 'lg'
}

export function Button({ 
  children, 
  className = '', 
  variant = 'default',
  size = 'default',
  ...props 
}: ButtonProps) {
  return (
    <button
      className={`button ${className}`}
      {...props}
    >
      {children}
    </button>
  )
}