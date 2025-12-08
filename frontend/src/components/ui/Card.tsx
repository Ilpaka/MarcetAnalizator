import { HTMLAttributes, forwardRef } from 'react'
import { clsx } from 'clsx'

interface CardProps extends HTMLAttributes<HTMLDivElement> {
  variant?: 'default' | 'elevated'
}

export const Card = forwardRef<HTMLDivElement, CardProps>(
  ({ className, variant = 'default', ...props }, ref) => {
    return (
      <div
        ref={ref}
        className={clsx(
          'rounded-lg border',
          {
            'bg-bg-secondary border-border-primary': variant === 'default',
            'bg-bg-elevated border-border-secondary': variant === 'elevated',
          },
          className
        )}
        {...props}
      />
    )
  }
)

Card.displayName = 'Card'

