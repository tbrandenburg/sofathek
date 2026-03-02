import React from 'react'

interface CardProps extends React.HTMLAttributes<HTMLDivElement> {
  children: React.ReactNode
  className?: string
  onClick?: () => void
}

interface CardTitleProps extends React.HTMLAttributes<HTMLHeadingElement> {
  children: React.ReactNode
  className?: string
}

interface CardDescriptionProps extends React.HTMLAttributes<HTMLDivElement> {
  children: React.ReactNode
  className?: string
}

export function Card({ children, className = '', onClick, ...props }: CardProps) {
  return (
    <div 
      className={`card ${className}`}
      onClick={onClick}
      style={onClick ? { cursor: 'pointer' } : undefined}
      {...props}
    >
      {children}
    </div>
  )
}

export function CardHeader({ children, className = '', ...props }: CardProps) {
  return (
    <div className={`card-header ${className}`} style={{ padding: '1.5rem 1.5rem 0' }} {...props}>
      {children}
    </div>
  )
}

export function CardTitle({ children, className = '', ...props }: CardTitleProps) {
  return (
    <h3 className={`card-title ${className}`} style={{ fontSize: '1.125rem', fontWeight: '600', marginBottom: '0.5rem' }} {...props}>
      {children}
    </h3>
  )
}

export function CardDescription({ children, className = '', ...props }: CardDescriptionProps) {
  return (
    <div className={`card-description ${className}`} style={{ fontSize: '0.875rem', color: '#666', marginBottom: '1rem' }} {...props}>
      {children}
    </div>
  )
}

export function CardContent({ children, className = '', ...props }: CardProps) {
  return (
    <div className={`card-content ${className}`} style={{ padding: '0 1.5rem 1.5rem' }} {...props}>
      {children}
    </div>
  )
}